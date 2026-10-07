const express = require('express');
const app = express();
app.use(express.json({limit:'10mb'}));
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;
const seen = new Set();
console.log('Vaerum iniciando... Token OK:', !!TOKEN, 'Chat OK:', !!CHAT);

async function getCoin(mint){
  try{
    const r = await fetch('https://frontend-api-v2.pump.fun/coins/'+mint);
    const j = await r.json();
    return j.mint ? j : null;
  }catch(e){ return null; }
}

app.get('/', (req,res)=> res.send('Vaerum Live '+new Date().toISOString()));

app.post('/webhook', async (req,res)=>{
  res.sendStatus(200);
  const body = Array.isArray(req.body) ? req.body : [req.body];
  for(const tx of body){
    for(const t of (tx.tokenTransfers||[])){
      const mint = t.mint;
      if(!mint || !mint.endsWith('pump') || seen.has(mint)) continue;
      seen.add(mint);
      console.log('NUEVA:', mint);
      const coin = await getCoin(mint);
      if(!coin) continue;
      if((coin.usd_market_cap||0) < 3000) continue;
      try{
        const caption = `🖼️ 🚀 ${coin.name} $${coin.symbol}\n💰 MC: $${(coin.usd_market_cap/1000).toFixed(1)}k\n\`${mint}\`\n\nhttps://axiom.trade/t/${mint}`;
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({chat_id:CHAT, photo:coin.image_uri, caption})
        });
        console.log('Enviado', coin.symbol);
      }catch(e){ console.log('tg err', e.message) }
    }
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Live en', PORT));