const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;
let seen = new Set();

async function send(msg){
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id:CHAT, text:msg, parse_mode:'HTML', disable_web_page_preview:true})
  }).catch(()=>{});
}

async function scan(){
  try{
    const r = await fetch('https://frontend-api-v3.pump.fun/coins?offset=0&limit=20&sort=created_timestamp&order=DESC&includeNsfw=false');
    const coins = await r.json();
    for(let c of coins){
      if(seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(seen.size>200) seen = new Set([...seen].slice(-100));
      const mc = c.usd_market_cap || 0;
      if(mc < 3000 || mc > 15000) continue;
      
      const age = Math.floor((Date.now() - c.created_timestamp)/1000);
      if(age > 120) continue;

      const top = c.top_10_holders || 0;
      const holders = c.holders || 0;
      
      let estado = '🟢 BUENA - DISTRIBUIDA';
      if(top > 25) estado = '🔴 MALA - BUNDLE';
      else if(top > 18) estado = '🟡 RIESGO MEDIO';

      const msg = `${estado}
🚀 ${c.name} $${c.symbol}
💰 MC: $${(mc/1000).toFixed(1)}k
👥 Holders: ${holders}
👑 Top10: ${top.toFixed(1)}%
⏱️ Edad: ${age}s

https://axiom.trade/t/${c.mint}
https://pump.fun/coin/${c.mint}
<code>${c.mint}</code>`;

      await send(msg);
      console.log('ENVIADO:', c.symbol);
    }
  }catch(e){ console.log('scan err', e.message) }
}

app.get('/', (req,res)=> res.send('Vaerum SCAN SIN HELIUS Live'));
app.listen(process.env.PORT||10000, ()=>{
  console.log('Vaerum sin Helius iniciado');
  setInterval(scan, 3000);
  scan();
});