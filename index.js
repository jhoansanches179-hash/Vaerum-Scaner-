
const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

const F = {
  TOP_MAX: 30,
  DEV_MAX: 6,
  INSIDERS_MAX: 6,
  MC_MIN: 15000,
  VOL_MIN: 25000,
  LIQ_MIN: 20000,
  EDAD_MAX: 160
};
const FRASE = "Sin perdida no hay leccion, sin sacrificio no hay recompensa, sin miedo no hay valor.";
let seen = new Set();

async function sendTest(){
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id:CHAT, text:`✅ Vaerum MIGRADAS LIVE\nTop<${F.TOP_MAX}% Dev<${F.DEV_MAX}% Vol>${F.VOL_MIN} Liq>${F.LIQ_MIN}\n\n${FRASE}`})
  });
}

async function sendPhoto(c){
  const cap = `🔥 MIGRADA $${c.symbol} - ${c.name}

💰 MC: $${(c.usd_market_cap/1000).toFixed(1)}k
📊 Vol: $${((c.volume_24h||0)/1000).toFixed(1)}k
💧 Liq: $${((c.liquidity||c.usd_market_cap||0)/1000).toFixed(1)}k
👥 Holders: ${c.num_holders || 0}
🐋 Top10: ${(c.top_10_holders||0).toFixed(1)}% | Dev: ${(c.dev_holding||0).toFixed(1)}%

${c.mint}

${FRASE}`;
  const body = {
    chat_id: CHAT,
    photo: c.image_uri,
    caption: cap,
    reply_markup: { inline_keyboard: [[
      {text:"🚀 Axiom", url:`https://axiom.trade/t/${c.mint}`},
      {text:"💊 Pump", url:`https://pump.fun/coin/${c.mint}`},
      {text:"📈 Raydium", url:`https://raydium.io/swap/?inputMint=sol&outputMint=${c.mint}`}
    ]]}
  };
  let r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  let d = await r.json();
  if(!d.ok){
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id:CHAT, text:cap, reply_markup:body.reply_markup})
    });
  }
}

async function check(mint){
  try{
    let res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`,{headers:{'User-Agent':'Mozilla/5.0'}});
    let c = await res.json();
    if((c.top_10