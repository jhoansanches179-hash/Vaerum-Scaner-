const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;
let seen = new Set();
let lastSend = 0;
let pendingBest = null;

async function send(msg){
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id:CHAT, text:msg, parse_mode:'HTML', disable_web_page_preview:true})
  }).catch(()=>{});
}

async function analyzeCoin(mint){
  await new Promise(r=>setTimeout(r,15000));
  try{
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`);
    const c = await r.json();
    const top = c.top_10_holders || 0;
    const mc = c.usd_market_cap || 0;
    if(mc > 30000 || top > 20) return; // descarta bundles y ya pumpeadas
    
    // guarda la mejor de los últimos 5 min
    if(!pendingBest || top < pendingBest.top_10_holders){
      pendingBest = c;
      console.log('Nueva mejor candidata:', c.symbol, top.toFixed(1)+'%');
    }
  }catch(e){}
}

async function scan(){
  try{
    const r = await fetch('https://frontend-api-v3.pump.fun/coins?offset=0&limit=10&sort=created_timestamp&order=DESC');
    const coins = await r.json();
    for(let c of coins){
      if(seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(Date.now() - c.created_timestamp > 60000) continue;
      analyzeCoin(c.mint);
    }
  }catch(e){}
}

// Cada 5 minutos manda LA MEJOR
setInterval(async ()=>{
  if(!pendingBest) {
    console.log('5min: no hubo buenas');
    return;
  }
  const c = pendingBest;
  pendingBest = null;
  lastSend = Date.now();
  const top = c.top_10_holders || 0;
  const mc = c.usd_market_cap || 0;
  const msg = `🟢 <b>MEJOR DE LOS 5 MIN</b>
🚀 ${c.name} $${c.symbol}
💰 MC: $${(mc/1000).toFixed(1)}k
👥 Holders: ${c.holders}
👑 Top10: ${top.toFixed(1)}% (distribuida)

https://axiom.trade/t/${c.mint}
https://pump.fun/coin/${c.mint}
<code>${c.mint}</code>`;
  await send(msg);
  console.log('ENVIADO 5MIN:', c.symbol);
}, 300000); // 5 minutos

app.get('/', (req,res)=> res.send('Vaerum 5min Live'));
app.listen(process.env.PORT||10000, ()=>{
  console.log('Vaerum cada 5min iniciado');
  setInterval(scan, 5000);
  scan();
  send('✅ Vaerum activo - Te mandaré 1 moneda cada 5 min (la mejor distribuida)');
});