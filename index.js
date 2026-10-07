import express from 'express';
const app = express();
app.use(express.json({limit: '10mb'}));

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;
const seen = new Set();

console.log('Vaerum Live - TOKEN:', !!TOKEN, 'CHAT:', !!CHAT);

async function getCoin(mint){
  try{
    const r = await fetch(`https://frontend-api-v2.pump.fun/coins/${mint}`);
    const j = await r.json();
    if(j.mint) return j;
  }catch(e){}
  return null;
}

async function send(mint, coin){
  try{
    const name = coin.name || 'New Coin';
    const sym = coin.symbol || '';
    const mcap = coin.usd_market_cap || 0;
    const img = coin.image_uri;
    
    const caption = `🚀 *${name} $${sym}*\n\n💰 MC: $${(mcap/1000).toFixed(1)}k\n\`${mint}\`\n\n[Buy on Axiom](https://axiom.trade/t/${mint}) | [Dexscreener](https://dexscreener.com/solana/${mint})`;

    const url = `https://api.telegram.org/bot${TOKEN}/sendPhoto`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        chat_id: CHAT,
        photo: img,
        caption: caption,
        parse_mode: 'Markdown'
      })
    });
    const txt = await res.text();
    console.log('Enviado', sym, txt.slice(0,100));
  }catch(e){
    console.log('error send', e.message);
  }
}

app.get('/', (req,res)=> res.send('Vaerum Scanner Live - ' + new Date().toISOString()));

app.post('/webhook', async (req,res)=>{
  res.sendStatus(200);
  try{
    const body = Array.isArray(req.body) ? req.body : [req.body];
    for(const tx of body){
      for(const t of (tx.tokenTransfers||[])){
        const mint = t.mint;
        if(!mint) continue;
        if(!mint.endsWith('pump')) continue;
        if(seen.has(mint)) continue;
        seen.add(mint);
        
        console.log('NUEVA PUMP:', mint);
        await new Promise(r=>setTimeout(r, 1500));
        const coin = await getCoin(mint);
        if(!coin) continue;
        
        // Filtro: solo de 3k a 25k para no spamear
        if(coin.usd_market_cap < 3000 || coin.usd_market_cap > 25000) continue;

        await send(mint, coin);
     