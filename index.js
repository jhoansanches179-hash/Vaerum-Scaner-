const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;
let seen = new Set();
let pendingBest = null;

async function send(msg, mint){
  const keyboard = {
    inline_keyboard: [
      [
        { text: "🚀 Axiom", url: `https://axiom.trade/t/${mint}` },
        { text: "💊 Pump", url: `https://pump.fun/coin/${mint}` }
      ],
      [
        { text: "📋 Copiar CA", callback_data: `copy_${mint}` }
      ]
    ]
  };

  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      chat_id:CHAT,
      text:msg,
      parse_mode:'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard
    })
  }).catch(()=>{});
}

async function analyzeCoin(mint){
  await new Promise(r=>setTimeout(r,15000));
  try{
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`);
    const c = await r.json();
    const top = c.top_10_holders?? 0;
    const mc = c.usd_market_cap || 0;
    const symbol = c.symbol || '???';
    const name = c.name || symbol;
    if(mc > 30000 || top > 20 || top == 0) return;

    if(!pendingBest || top < (pendingBest.top_10_holders || 100)){
      pendingBest = c;
      console.log('Mejor:', symbol, top.toFixed(1)+'%');
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

setInterval(async ()=>{
  if(!pendingBest) return;
  const c = pendingBest;
  pendingBest = null;
  const top = c.top_10_holders?? 0;
  const mc = c.usd_market_cap || 0;
  const symbol = c.symbol || '???';
  const name = c.name || symbol;
  const holders = c.num_holders || c.holders || 0;

  const msg = `🟢 <b>MEJOR 5MIN - DISTRIBUIDA</b>

🚀 <b>${name}</b> $${symbol}
💰 MC: <b>$${(mc/1000).toFixed(1)}k</b>
👥 Holders: ${holders}
👑 Top10: ${top.toFixed(1)}%

<code>${c.mint}</code>`;

  await send(msg, c.mint);
}, 300000);

app.get('/', (req,res)=> res.send('Vaerum clean Live'));
app.listen(process.env.PORT||10000, ()=>{
  console.log('Vaerum clean iniciado');
  setInterval(scan, 5000);
  scan();
  // mensaje de prueba limpio
  fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      chat_id:CHAT,
      text:`✅ <b>Vaerum limpio activo</b>\nTe mandaré 1 cada 5 min con botones, sin links feos.`,
      parse_mode:'HTML',
      disable_web_page_preview:true
    })
  });
});