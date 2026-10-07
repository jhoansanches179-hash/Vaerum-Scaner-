const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

let seen = new Set();
let pendingBest = null;
let stats = { total:0, buenas:0, top_max:30 };

async function send(msg, mint){
  try{
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id:CHAT, 
        text:msg, 
        parse_mode:'HTML', 
        disable_web_page_preview:true,
        reply_markup:{
          inline_keyboard:[[
            {text:"🚀 Axiom", url:`https://axiom.trade/t/${mint}`},
            {text:"💊 Pump", url:`https://pump.fun/coin/${mint}`}
          ]]
        }
      })
    });
    const d = await r.json();
    console.log('TG', d.ok ? 'OK '+d.result.message_id : JSON.stringify(d));
  }catch(e){ console.log('TG ERR', e.message)}
}

async function analyze(mint){
  await new Promise(r=>setTimeout(r,12000));
  try{
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, {headers:{'User-Agent':'Mozilla/5.0'}});
    const c = await res.json();
    const top = c.top_10_holders ?? 100;
    const holders = c.num_holders ?? 0;
    const mc = c.usd_market_cap ?? 0;
    if(holders < 3 || mc < 1000 || mc > 50000) return;
    if(top > stats.top_max) return;
    console.log(`CHECK ${c.symbol} H:${holders} Top:${top.toFixed(1)}%`);
    const score = Math.round(100 - top*1.5 + holders*0.5);
    if(!pendingBest || score > pendingBest._score){
      pendingBest = c;
      pendingBest._score = score;
      pendingBest._top = top;
      console.log(`>>> CANDIDATA ${c.symbol} Score:${score}`);
    }
  }catch(e){}
}

async function scan(){
  try{
    const res = await fetch('https://frontend-api-v3.pump.fun/coins?offset=0&limit=12&sort=created_timestamp&order=DESC', {headers:{'User-Agent':'Mozilla/5.0'}});
    const data = await res.json();
    const coins = Array.isArray(data) ? data : (data.coins || []);
    for(let c of coins){
      if(!c.mint || seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(Date.now() - c.created_timestamp > 90000) continue;
      analyze(c.mint);
    }
  }catch(e){ console.log('scan err', e.message)}
}

setInterval(async ()=>{
  const prec = stats.total ? ((stats.buenas/stats.total)*100).toFixed(1) : 0;
  if(!pendingBest){
    await send(`⏳ 2MIN - Sin candidata perfecta

Filtro: Top menor a ${stats.top_max}% | Holders mayor a 3
Avance IA: ${stats.buenas}/${stats.total} | Prec: ${prec}%
Hora: ${new Date().toLocaleTimeString()}

Sigo escaneando...`, 'So11111111111111111111111111111111111111112');
    return;
  }
  const c = pendingBest;
  pendingBest = null;
  const msg = `🧠 TOP 2MIN - Score ${c._score}/100

🚀 ${c.name} $${c.symbol}
💰 MC: $${(c.usd_market_cap/1000).toFixed(1)}k
👥 Holders: ${c.num_holders}
👑 Top10: ${c._top.toFixed(1)}%

📈 Avance Entrenamiento:
Analizadas: ${stats.total}
Aciertos: ${stats.buenas}
Precision: ${prec}%
Filtro: Top menor a ${stats.top_max}%

${c.mint}`;
  
  await send(msg, c.mint);
}, 120000);

app.get('/', (req,res)=> res.send('Vaerum LIVE'));
app.get('/test', async (req,res)=>{ await send(`✅ TEST OK ${new Date().toLocaleTimeString()}`, 'So11111111111111111111111111111111111111112'); res.send('ok'); });

app.listen(process.env.PORT||10000, ()=>{
  console.log('VAERUM FIX < CORREGIDO');
  setInterval(scan, 5000);
  scan();
  setTimeout(()=> send(`🚀 Vaerum 2MIN Activo FIX
Te mando la mejor cada 2 min con avance.
Filtro: Top menor a ${stats.top_max}%`, 'So11111111111111111111111111111111111111112'), 4000);
  setInterval(()=> fetch('https://'+process.env.RENDER_EXTERNAL_HOSTNAME).catch(()=>{}), 55000);
});