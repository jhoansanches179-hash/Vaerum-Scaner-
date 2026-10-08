const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

const F = {
  TOP_MAX: 30,
  MC_MIN: 15000,
  VOL_MIN: 25000,
  EDAD_MAX_MIN: 160
};
const FRASE = "Sin pérdida no hay lección, sin sacrificio no hay recompensa, sin miedo no hay valor.";
let seen = new Set();

async function sendWithImage(c){
  const mc = c.usd_market_cap ?? 0;
  const vol = c.volume_24h ?? 0;
  const holders = c.num_holders ?? 0;
  const top = c.top_10_holders ?? 0;
  const dev = c.dev_holding ?? 0;
  const img = c.image_uri || c.metadata_uri || "";

  const caption = `🔥 ${c.name} $${c.symbol}

💰 MC: $${(mc/1000).toFixed(1)}k
📊 Vol: $${(vol/1000).toFixed(1)}k | Liq: $${((c.liquidity||0)/1000).toFixed(1)}k
👥 Holders: ${holders}
🐋 Top10: ${top.toFixed(1)}% | Dev: ${dev.toFixed(1)}%

📅 Edad: ${((Date.now()-c.created_timestamp)/60000).toFixed(0)} min
🔗 ${c.mint}

_${FRASE}_`;

  const body = {
    chat_id: CHAT,
    photo: img,
    caption: caption,
    reply_markup: {
      inline_keyboard: [[
        {text:"🚀 Axiom", url:`https://axiom.trade/t/${c.mint}`},
        {text:"💊 Pump", url:`https://pump.fun/coin/${c.mint}`}
      ]]
    }
  };

  try{
    let r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    let d = await r.json();
    if(!d.ok){ // si falla la imagen, manda solo texto
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({chat_id:CHAT, text:caption, reply_markup:body.reply_markup})
      });
    }
  }catch(e){ console.log(e.message)}
}

async function check(mint){
  await new Promise(r=>setTimeout(r,10000));
  try{
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, {headers:{'User-Agent':'Mozilla/5.0'}});
    const c = await res.json();
    if((c.top_10_holders ?? 100) > F.TOP_MAX) return;
    if((c.usd_market_cap ?? 0) < F.MC_MIN) return;
    if((c.volume_24h ?? 0) < F.VOL_MIN) return;
    await sendWithImage(c);
  }catch(e){}
}

async function scan(){
  try{
    const