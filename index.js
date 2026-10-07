const express = require('express');
const app = express();
app.use(express.json({limit:'10mb'}));
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;
const seen = new Set();

async function getCoin(mint){
  try{
    const r = await fetch('https://frontend-api-v2.pump.fun/coins/'+mint);
    return await r.json();
  }catch(e){ return null; }
}

async function getRug(mint){
  try{
    const r = await fetch('https://api.rugcheck.xyz/v1/tokens/'+mint+'/report');
    return await r.json();
  }catch(e){ return null; }
}

app.get('/', (req,res)=> res.send('Vaerum PRO Live'));

app.post('/webhook', async (req,res)=>{
  res.sendStatus(200);
  const list = Array.isArray(req.body)? req.body : [req.body];
  for(const tx of list){
    for(const t of (tx.tokenTransfers||[])){
      const mint = t.mint;
      if(!mint ||!mint.endsWith('pump') || seen.has(mint)) continue;
      seen.add(mint);
      await new Promise(x=>setTimeout(x,2000));
      const c = await getCoin(mint);
      if(!c ||!c.mint) continue;
      if((c.usd_market_cap||0) < 3000) continue;
      const rug = await getRug(mint);
      const mcap = (c.usd_market_cap/1000).toFixed(1);
      const vol = ((c.volume_24h||0)/1000).toFixed(1);
      const holders = rug?.totalHolders || 'N/A';
      const top = rug?.topHolders?.[0]?.pct?.toFixed(1) || 'N/A';
      const age = Math.floor((Date.now()-c.created_timestamp)/1000) + 's';
      let estado = '🟡 NEUTRAL';
      if(rug && rug.topHolders && rug.topHolders[0]){
        if(rug.topHolders[0].pct > 25) estado = '🔴 MALA - TOP ALTO';
        else if(rug.topHolders[0].pct < 15) estado = '🟢 BUENA - DISTRIBUIDA';
      }
      const caption = `${estado}\n🚀 ${c.name} $${c.symbol}\n\n💰 MC: $${mcap}k\n📊 Vol: $${vol}k\n👥 Holders: ${holders}\n👑 Top: ${top}%\n⏱️ Edad: ${age}\n\n\`${mint}\`\nhttps://axiom.trade/t/${mint}`;
      try{
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({chat_id:CHAT, photo:c.image_uri, caption:caption})
        });
        console.log('enviado', c.symbol);
      }catch(e){}
    }
  }
});

app.listen(process.env.PORT||10000, ()=> console.log('Live'));