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
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id:CHAT, text:msg, parse_mode:'HTML', disable_web_page_preview:true, reply_markup: kb})
  }).catch(e=>console.log('tg err',e.message));
}

async function analyzeCoin(mint){
  await new Promise(r=>setTimeout(r,8000));
  try{
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const c = await r.json();
    const top = c.top_10_holders ?? 0;
    const mc = c.usd_market_cap || 0;
    if(mc > 50000 || top==0 || top > cerebro.top10_max) return;
    if(!pendingBest || (c.top_10_holders < pendingBest._top)){
      pendingBest = c;
      pendingBest._top = top;
      pendingBest._score = 80;
      pendingBest._mcInicial = mc;
      console.log(`CANDIDATA: ${c.symbol} Top:${top.toFixed(1)}%`);
    }
  }catch(e){}
}

async function scan(){
  try{
    const r = await fetch('https://frontend-api-v3.pump.fun/coins?offset=0&limit=15&sort=created_timestamp&order=DESC&includeNsfw=false', { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const data = await r.json();
    // FIX: a veces viene como array, a veces como {coins:[]}
    const coins = Array.isArray(data) ? data : (data.coins || data.data || []);
    if(!coins.length){ console.log('Scan: 0 monedas, respuesta:', JSON.stringify(data).slice(0,200)); return; }
    console.log(`Scan: ${coins.length} monedas`);
    for(let c of coins){
      if(!c.mint || seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(Date.now() - c.created_timestamp > 120000) continue;
      console.log(`Analizando ${c.symbol} ${c.mint.slice(0,6)}`);
      analyzeCoin(c.mint);
    }
  }catch(e){ console.log('scan err '+e.message)}
}

setInterval(async ()=>{
  console.log('Check 2min, pending:', !!pendingBest);
  if(!pendingBest){
    await send(`⏳ <b>2MIN - Sin buenas</b>\nFiltro: Top<${cerebro.top10_max}%\nSigo escaneando...`, 'So11111111111111111111111111111111111111112');
    return;
  }
  const c = pendingBest;
  pendingBest = null;
  const msg = `🧠 <b>TOP 2MIN - Score ${c._score}/100</b>\n\n🚀 <b>${c.name}</b> $${c.symbol}\n💰 MC: $${((c.usd_market_cap||0)/1000).toFixed(1)}k\n👑 Top10: ${(c._top||0).toFixed(1)}%\n\n📈 Avance IA: ${cerebro.buenas}/${cerebro.total} | Filtro Top<${cerebro.top10_max}%\n\n<code>${c.mint}</code>`;
  await send(msg, c.mint);
}, 120000);

app.get('/', (req,res)=> res.send('Vaerum IA 2MIN FIX OK'));
app.get('/test', async (req,res)=>{
  await send(`✅ <b>PRUEBA OK - ${new Date().toLocaleTimeString()}</b>\nTu bot ya responde!`, 'So11111111111111111111111111111111111111112');
  res.send('Test enviado');
});

app.listen(process.env.PORT||10000, ()=>{
  console.log('VAERUM FIX INICIADO');
  setInterval(scan, 5000);
  scan();
});