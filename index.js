const express = require('express');
const app = express();
app.use(express.json({limit:'10mb'}));
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;
const seen = new Set();

console.log('Vaerum PRO iniciado');

async function getPump(mint){
  try{
    const r = await fetch(`https://frontend-api-v2.pump.fun/coins/${mint}`);
    return await r.json();
  }catch(e){ return null; }
}

async function getRug(mint){
  try{
    const r = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`);
    return await r.json();
  }catch(e){ return null; }
}

function timeAgo(ts){
  const sec = Math.floor((Date.now() - ts)/1000);
  if(sec < 60) return `${sec}s`;
  if(sec < 3600) return `${Math.floor(sec/60)}m`;
  return `${Math.floor(sec/3600)}h`;
}

app.get('/', (req,res)=> res.send('Vaerum PRO Live'));

app.post('/webhook', async (req,res)=>{
  res.sendStatus(200);
  const body = Array.isArray(req.body) ? req.body : [req.body];
  for(const tx of body){
    for(const t of (tx.tokenTransfers||[])){
      const mint = t.mint;
      if(!mint || !mint.endsWith('pump') || seen.has(mint)) continue;
      seen.add(mint);
      
      // espera 2s para que pump indexe
      await new Promise(r=>setTimeout(r, 2000));
      const coin = await getPump(mint);
      if(!coin || !coin.mint) continue;
      const rug = await getRug(mint);

      const mcap = coin.usd_market_cap || 0;
      if(mcap < 3000 || mcap > 30000) continue; // tu filtro

      const vol = coin.volume_24h || coin.volume || 0;
      const holders = rug?.totalHolders || coin.holders || 'N/A';
      const created = coin.created_timestamp ? timeAgo(coin.created_timestamp) : '0s';
      
      // ANALISIS BUENA / MALA
      let score = 0;
      let motivos = [];
      const top = rug?.topHolders?.[0]?.pct || 0;

      if(top > 25){ score -= 2; motivos.push(`Top holder ${top.toFixed(1)}%`); }
      else if(top < 15){ score += 1; }

      if(rug?.risks?.length > 0){
        const bad =