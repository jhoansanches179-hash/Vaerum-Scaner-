const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

let seen = new Set();
let pendingBest = null;
let cerebro = { top10_max: 25, holders_min: 5, total: 0, buenas: 0 };

async function send(msg, mint){
  const kb = { inline_keyboard: [[
    {text:"🚀 Axiom", url:`https://axiom.trade/t/${mint}`},
    {text:"💊 Pump", url:`https://pump.fun/coin/${mint}`}
  ]]};
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id:CHAT, text:msg, parse_mode:'HTML', disable_web_page_preview:true, reply_markup: kb})
  }).catch(()=>{});
}

function calcularScore(c){
  let score = 100;
  score -= (c.top_10_holders || 0) * 2.2;
  score += (c.num_holders || c.holders || 0) * 0.6;
  if((c.name||'').length > 25) score -= 10;
  return Math.round(Math.max(0, Math.min(100, score)));
}

async function calificar(mint, mc_inicial, datos){
  setTimeout(async ()=>{
    try{
      const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`);
      const c = await r.json();
      const mc_final = c.usd_market_cap || 0;
      const x = mc_final / (mc_inicial || 1);
      const esBuena = x >= 1.8;
      cerebro.total++;
      if(esBuena) cerebro.buenas++;
      if(!esBuena && datos.top > 15){
        cerebro.top10_max = Math.max(13, cerebro.top10_max - 0.4);
      }
      if(esBuena){
        cerebro.top10_max = Math.min(25, cerebro.top10_max + 0.15);
      }
      console.log(`CALIFICADO ${datos.symbol} ${x.toFixed(2)}x | top_max ${cerebro.top10_max.toFixed(1)}`);
    }catch(e){}
  }, 3600000);
}

async function analyzeCoin(mint){
  await new Promise(r=>setTimeout(r,12000));
  try{
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`);
    const c = await r.json();
    const top = c.top_10_holders ?? 0;
    const holders = c.num_holders || c.holders || 0;
    const mc = c.usd_market_cap || 0;
    const symbol = c.symbol || '???';
    if(mc > 40000 || holders < cerebro.holders_min || top > cerebro.top10_max || top==0) return;
    const score = calcularScore(c);
    if(score < 30) return;
    if(!pendingBest || score > pendingBest._score){
      pendingBest = c;
      pendingBest._score = score;
      pendingBest._top = top;
      pendingBest._mcInicial = mc;
      console.log(`Candidata: ${symbol} Score:${score} Top:${top.toFixed(1)}%`);
    }
  }catch(e){}
}

async function scan(){
  try{
    const r = await fetch('https://frontend-api-v3.pump.fun/coins?offset=0&limit=12&sort=created_timestamp&order=DESC');
    const coins = await r.json();
    for(let c of coins){
      if(seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(Date.now() - c.created_timestamp > 90000) continue;
      analyzeCoin(c.mint);
    }
  }catch(e){ console.log('scan err '+e.message)}
}

setInterval(async ()=>{
  const precision = cerebro.total ? ((cerebro.buenas/cerebro.total)*100).toFixed(1) : 0;
  if(!pendingBest){
    const msg = `⏳ <b>2MIN - Sin buenas</b>

🧠 Filtro: Top10 < ${cerebro.top10_max.toFixed(1)}% | Hold > ${cerebro.holders_min}
📊 Avance: ${cerebro.buenas}/${cerebro.total} | Prec: ${precision}%
Sigo escaneando...`;
    await send(msg, 'So11111111111111111111111111111111111111112');
    return;
  }
  const c = pendingBest;
  pendingBest = null;
  const top = c._top;
  const mc = c.usd_market_cap || 0;
  const symbol = c.symbol || '???';
  const name = c.name || symbol;
  const holders = c.num_holders || c.holders || 0;
  const score = c._score;
  const msg = `🧠 <b>TOP 2MIN - Score ${score}/100</b>

🚀 <b>${name}</b> $${symbol}
💰 MC: <b>$${(mc/1000).toFixed(1)}k</b>
👥 Holders: ${holders}
👑 Top10: ${top.toFixed(1)}%

📈 <b>Avance IA:</b>
Analizadas: ${cerebro.total} | Aciertos: ${cerebro.buenas}
Precisión: ${precision}%
Filtro: Top < ${cerebro.top10_max.toFixed(1)}%

<code>${c.mint}</code>`;
  await send(msg, c.mint);
  calificar(c.mint, c._mcInicial, {top, symbol});
}, 120000);

app.get('/', (req,res)=> res.send('Vaerum IA 2MIN OK'));
app.listen(process.env.PORT||10000, ()=>{
  console.log('VAERUM IA 2MIN OK');
  setInterval(scan, 4000);
  scan();
  send(`🧠 <b>Vaerum IA 2MIN Activado</b>\nFiltro: Top<${cerebro.top10_max}%`, 'So11111111111111111111111111111111111111112');
});