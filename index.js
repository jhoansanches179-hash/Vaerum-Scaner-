import express from 'express';
const app = express();
app.use(express.json());
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const seen = new Set();
const BLACKLIST = new Set(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v','Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB','So11111111111111111111111111111111111111112']);

async function getPair(mint){
  try{
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`,{headers:{'User-Agent':'Mozilla/5.0'}});
    const j = await r.json();
    if(j.pairs?.[0]) return j.pairs[0];
  }catch(e){}
  try{
    const r2 = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
    const c = await r2.json();
    if(!c.name) return null;
    return { baseToken:{name:c.name,symbol:c.symbol}, info:{imageUrl:c.image_uri}, fdv:c.usd_market_cap||0, liquidity:{usd:0}, pairCreatedAt:c.created_timestamp };
  }catch(e){ return null; }
}

async function sendToTG(pair,mint,mcap){
  const name=pair.baseToken?.name||'Unknown';
  const symbol=pair.baseToken?.symbol||'';
  const img=pair.info?.imageUrl;
  const text=`🚀 *${name} $${symbol}*\n\n💰 MC: $${(mcap/1000).toFixed(1)}k | \`${mint.slice(0,4)}...${mint.slice(-4)}\`\n\n[Axiom](https://axiom.trade/t/${mint}) | [Dex](https://dexscreener.com/solana/${mint})`;
  const url=`https://api.telegram.org/bot${TELEGRAM_TOKEN}/`;
  if(img){
    await fetch(url+'sendPhoto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:CHAT_ID,photo:img,caption:text,parse_mode:'Markdown'})});
  }else{
    await fetch(url+'sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:CHAT_ID,text,parse_mode:'Markdown'})});
  }
}

app.get('/',(req,res)=>res.send('OK'));
app.post('/webhook',async(req,res)=>{
  res.sendStatus(200);
  const body=Array.isArray(req.body)?req.body:[req.body];
  for(const tx of body){
    const transfers=tx?.tokenTransfers||[];
    for(const t of transfers){
      const mint=t.mint;
      if(!mint || BLACKLIST.has(mint) || seen.has(mint)) continue;
      if(!mint.endsWith('pump')) continue; // solo pump
      seen.add(mint);
      console.log('NEW PUMP:',mint);
      await new Promise(r=>setTimeout(r,2500));
      const pair=await getPair(mint);
      if(!pair) continue;
      await sendToTG(pair,mint,pair.fdv||0);
    }
  }
});
app.listen(process.env.PORT||10000,()=>console.log('Live'));