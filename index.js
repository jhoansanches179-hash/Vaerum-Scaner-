const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

let seen = new Set();
let pendingBest = null;
let cerebro = { top10_max: 28, holders_min: 3, total: 0, buenas: 0 };

async function send(msg, mint){
  const kb = { inline_keyboard: [[
    {text:"🚀 Axiom", url:`https://axiom.trade/t/${mint}`},
    {text:"💊 Pump", url:`https://pump.fun/coin/${mint}`}
  ]]};
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id:CHAT, text:msg, parse_mode:'HTML', disable_web_page_preview:true, reply_markup: kb})
  });
  const data = await res.json();
  console.log('Telegram respuesta:', JSON.stringify(data));
  return data;
}

async function analyzeCoin(mint){
  await new Promise(r=>setTimeout(r,8000));
  try{
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const c = await r.json();
    const top = c.top_10_holders ?? 0;
    const holders = c.num_holders || 0;
    const mc = c.usd_market_cap || 0;
    // MODO DEBUG: MUY RELAJADO
    if(mc > 50000 || top==0) return;
    if(!pendingBest){
      pendingBest = c;
      pendingBest._top = top;
      pendingBest._score = 75;
      pendingBest._mcInicial = mc;
      console.log(`Candidata DEBUG: ${c.symbol} Top:${top}`);
    }
  }catch(e){ console.log('analyze err', e.message)}
}

async function scan(){
  try{
    const r = await fetch('https://frontend-api-v3.pump.fun/coins?offset=0&limit=15&sort=created_timestamp&order=DESC', { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const coins = await r.json();
    console.log(`Scan: ${coins.length} monedas nuevas`);
    for(let c of coins){
      if(seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(Date.now() - c.created_timestamp > 120000) continue;
      console.log(`Analizando ${c.symbol} ${c.mint.slice(0,6)}`);
      analyzeCoin(c.mint);
    }
  }catch(e){ console.log('scan err '+e.message)}
}

setInterval(async ()=>{
  console.log('Interval 2min check, pendingBest:', !!pendingBest);
  if(!pendingBest){
    await send(`⏳ 2MIN - Escaneando... Sin buenas por ahora\nFiltro: Top<${cerebro.top10_max}%`, 'So11111111111111111111111111111111111111112');
    return;
  }
  const c = pendingBest;
  pendingBest = null;
  const msg = `🧠 <b>TOP 2MIN</b>\n🚀 ${c.name} $${c.symbol}\n💰 MC: $${((c.usd_market_cap||0)/1000).toFixed(1)}k\n👑 Top10: ${(c._top||0).toFixed(1)}%\n\n<code>${c.mint}</code>`;
  await send(msg, c.mint);
}, 120000);

app.get('/', (req,res)=> res.send('OK - Vaerum Debug'));
app.get('/test', async (req,res)=>{
  await send(`✅ <b>PRUEBA TELEGRAM OK</b>\nSi ves esto, el bot sí funciona.\nHora: ${new Date().toLocaleString()}`, 'So11111111111111111111111111111111111111112');
  res.send('Test enviado, revisa Telegram');
});

app.listen(process.env.PORT||10000, ()=>{
  console.log('VAERUM DEBUG INICIADO');
  setInterval(scan, 4000);
  scan();
});