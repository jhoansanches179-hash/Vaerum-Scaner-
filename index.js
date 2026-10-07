const express = require('express');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

let seen = new Set();
let pendingBest = null;
let stats = { total:0, buenas:0, top_max:30 };

async function send(msg, mint){
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
  console.log('TG', d.ok ? 'OK' : JSON.stringify(d));
}

async function analyze(mint){
  // Esperar 12s para que Pump indexe holders reales
  await new Promise(r=>setTimeout(r,12000));
  try{
    const res = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`, {headers:{'User-Agent':'Mozilla/5.0'}});
    const c = await res.json();
    const top = c.top_10_holders ?? 100;
    const holders = c.num_holders ?? 0;
    const mc = c.usd_market_cap ?? 0;
    
    if(holders < 3 || mc < 1000 || mc > 50000) return;
    if(top > stats.top_max) return;
    
    console.log(`CHECK ${c.symbol} Hold:${holders} Top:${top.toFixed(1)}% MC:${(mc/1000).toFixed(1)}k`);
    
    const score = Math.round(100 - top*1.5 + holders*0.5);
    if(!pendingBest || score > pendingBest._score){
      pendingBest = c;
      pendingBest._score = score;
      pendingBest._top = top;
      console.log(`>>> NUEVA MEJOR ${c.symbol} Score:${score}`);
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

// TIMER 2 MINUTOS CON AVANCE
setInterval(async ()=>{
  const prec = stats.total ? ((stats.buenas/stats.total)*100).toFixed(1) : 0;
  
  if(!pendingBest){
    await send(`⏳ <b>2MIN - Sin candidata perfecta</b>\n\n🔍 Filtro: Top < ${stats.top_max}% | Holders > 3\n📊 <b>Avance IA:</b> ${stats.buenas}/${stats.total} | Prec: ${prec}%\nHora: ${new Date().toLocaleTimeString()}\n\nSigo escaneando...`, 'So11111111111111111111111111111111111111112');
    return;
  }
  
  const c = pendingBest;
  pendingBest = null;
  const msg = `🧠 <b>TOP 2MIN - Score ${c._score}/100</b>

🚀 <b>${c.name}</b> $${c.symbol}
💰 MC: <b>$${(c.usd_market_cap/1000).toFixed(1)}k</b>
👥 Holders: <b>${c.num_holders}</b>
👑 Top10: <b>${c._top.toFixed(1)}%</b>

📈 <b>Avance Entrenamiento:</b>
Analizadas: ${stats.total}
Aciertos: ${stats.buenas}
Precisión: ${prec}%
Filtro actual: Top < ${stats.top_max}%

<code>${c.mint}</code>`;
  
  await send(msg, c.mint);
}, 120000);

app.get('/', (req,res)=> res.send('Vaerum LIVE 2MIN'));
app.get('/test', async (req,res)=>{ await send(`✅ TEST OK ${new Date().toLocaleTimeString()}`, 'So11111111111111111111111111111111111111112'); res.send('ok'); });

app.listen(process.env.PORT||10000, ()=>{
  console.log('VAERUM 2MIN LIVE');
  setInterval(scan, 5000);
  scan();
  setTimeout(()=> send(`🚀 <b>Vaerum 2MIN Activo</b>\nTe mando la mejor cada 2 min con avance.\nFiltro: Top < ${stats.top_max}%`, 'So11111111111111111111111111111111111111112'), 4000);
  setInterval(()=> fetch('https://'+process.env.RENDER_EXTERNAL_HOSTNAME).catch(()=>{}), 55000);
});