const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

let seen = new Set();
let pendingBest = null;
let cerebro = { top10_max: 35, total: 0, buenas: 0 };

console.log(`TOKEN existe: ${!!TOKEN} largo:${TOKEN?.length || 0}`);
console.log(`CHAT existe: ${!!CHAT} valor:${CHAT}`);

async function send(msg, mint){
  try{
    const kb = { inline_keyboard: [[
      {text:"🚀 Axiom", url:`https://axiom.trade/t/${mint}`},
      {text:"💊 Pump", url:`https://pump.fun/coin/${mint}`}
    ]]};
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const r = await fetch(url,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id:CHAT, text:msg, parse_mode:'HTML', disable_web_page_preview:true, reply_markup: kb})
    });
    const data = await r.json();
    console.log('TG RESPUESTA:', JSON.stringify(data));
    if(!data.ok) console.log('ERROR TELEGRAM: Revisa TOKEN y CHAT_ID');
    return data;
  }catch(e){ console.log('TG ERROR FETCH:', e.message); }
}

async function analyzeCoin(mint){
  await new Promise(r=>setTimeout(r,6000));
  try{
    const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const c = await r.json();
    const top = c.top_10_holders ?? 100;
    const mc = c.usd_market_cap || 0;
    if(mc > 90000 || mc < 500) return;
    console.log(`Check ${c.symbol} Top:${top.toFixed(1)}% MC:${(mc/1000).toFixed(0)}k`);
    if(!pendingBest || top < pendingBest._top){
      pendingBest = c;
      pendingBest._top = top;
      pendingBest._score = Math.round(100 - top);
      pendingBest._mcInicial = mc;
      console.log(`>>> CANDIDATA ${c.symbol} Top ${top.toFixed(1)}%`);
    }
  }catch(e){}
}

async function scan(){
  try{
    const r = await fetch('https://frontend-api-v3.pump.fun/coins?offset=0&limit=15&sort=created_timestamp&order=DESC', { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const data = await r.json();
    const coins = Array.isArray(data) ? data : (data.coins || []);
    if(!coins.length) return;
    for(let c of coins){
      if(!c.mint || seen.has(c.mint)) continue;
      seen.add(c.mint);
      if(Date.now() - c.created_timestamp > 120000) continue;
      analyzeCoin(c.mint);
    }
  }catch(e){ console.log('scan err', e.message) }
}

setInterval(async ()=>{
  console.log('--- TIMER 2MIN --- pending:', !!pendingBest);
  if(!pendingBest){
    await send(`⏳ <b>2MIN CHECK</b>\nEscaneando... aun sin candidata perfecta\nTop max: ${cerebro.top10_max}%`, 'So11111111111111111111111111111111111111112');
    return;
  }
  const c = pendingBest;
  pendingBest = null;
  const msg = `🧠 <b>TOP 2MIN</b>\n🚀 ${c.name} $${c.symbol}\n💰 MC: $${(c.usd_market_cap/1000).toFixed(1)}k\n👑 Top10: ${c._top.toFixed(1)}%\nScore: ${c._score}\n\n<code>${c.mint}</code>`;
  await send(msg, c.mint);
}, 120000);

app.get('/', (req,res)=> res.send('OK'));
app.get('/test', async (req,res)=>{
  console.log('Entraron a /test');
  const resp = await send(`✅ <b>TEST OK ${new Date().toLocaleTimeString()}</b>\nSi ves esto, Telegram SI funciona.`, 'So11111111111111111111111111111111111111112');
  res.send('Test enviado: ' + JSON.stringify(resp));
});

app.listen(process.env.PORT||10000, async ()=>{
  console.log('INICIADO FIX FINAL');
  setInterval(scan, 4000);
  scan();
  // Mensaje al iniciar para probar
  setTimeout(async ()=>{
    await send(`🚀 <b>Bot iniciado</b>\nTe mando cada 2 min.\nTOKEN OK:${!!TOKEN} CHAT OK:${!!CHAT}`, 'So11111111111111111111111111111111111111112');
  }, 5000);
});