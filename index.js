const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

const F = { TOP: 30, MC: 15000, VOL: 25000, EDAD: 160 };
let seen = new Set();
const FRASE = "Sin perdida no hay leccion, sin sacrificio no hay recompensa, sin miedo no hay valor.";

async function sendPhoto(c){
  const cap = `🔥 ${c.name} $${c.symbol}
MC: $${(c.usd_market_cap/1000).toFixed(1)}k
Vol: $${((c.volume_24h||0)/1000).toFixed(1)}k
Holders: ${c.num_holders} | Top: ${(c.top_10_holders||0).toFixed(1)}%

${c.mint}

${FRASE}`;
  const body = {
    chat_id: CHAT,
    photo: c.image_uri || "https://pump.fun/logo.png",
    caption: cap,
    reply_markup: { inline_keyboard: [[
      {text:"🚀 Axiom", url:`https://axiom.trade/t/${c.mint}`},
      {text:"Pump", url:`https://pump.fun/coin/${c.mint}`}
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
  await new Promise(r=>setTimeout(r,8000));
  try{
    let res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`,{headers:{'User-Agent':'Mozilla/5.0'}});
    let c = await res.json();
    if((c.top_10_holders||100) > F.TOP) return;
    if((c.usd_market_cap||0) < F.MC) return;
    if((c.volume_24h||0) < F.VOL) return;
    await sendPhoto(c);
  }catch(e){}
}

async function scan(){
  try{
    let res = await fetch(`https://frontend-api-v3.pump.fun/coins?offset=0&limit=15&sort=created_timestamp&order=DESC`,{headers:{'User-Agent':'Mozilla/5.0'}});
    let j = await res.json();
    let coins = j.coins || j || [];
    for(let c of coins){
      if(!c.mint || seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(Date.now()-c.created_timestamp > F.EDAD*60000) continue;
      check(c.mint);
    }
  }catch(e){}
}

app.get('/',(req,res)=>res.send('OK'));
app.listen(process.env.PORT||10000,()=>{
  console.log('LIVE');
  setInterval(scan,5000);
  scan();
});