import express from 'express';
const app = express();
app.use(express.json());
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const seen = new Set();

async function getPair(mint){
  try{
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { headers: {'User-Agent':'Mozilla/5.0'} });
    const j = await r.json();
    if(j.pairs && j.pairs[0]) return j.pairs[0];
  }catch(e){}
  try{
    const r2 = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
    const c = await r2.json();
    return {
      baseToken:{name:c.name,symbol:c.symbol},
      info:{imageUrl:c.image_uri},
      fdv:c.usd_market_cap||0,
      liquidity:{usd:0},
      priceUsd:'0',
      pairCreatedAt:c.created_timestamp
    };
  }catch(e){ return null; }
}

async function sendToTelegramWithImage(pair,mint,mcap,liq){
  try{
    const name=pair.baseToken?.name||'Unknown';
    const symbol=pair.baseToken?.symbol||'';
    const imgUrl=pair.info?.imageUrl;
    const text=`🚀 *${name} $${symbol}*\n\n💰 MC: $${(mcap/1000).toFixed(1)}k\n💧 Liq: $${liq.toFixed(0)}\n🔗 \`${mint}\`\n\n[Axiom](https://axiom.trade/t/${mint}) | [Dex](https://dexscreener.com/solana/${mint})`;
    const url=`https://api.telegram.org/bot${TELEGRAM_TOKEN}/`;
    if(imgUrl){
      await fetch(url+'sendPhoto',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:CHAT_ID,photo:imgUrl,caption:text,parse_mode:'Markdown'})});
    }else{
      await fetch(url+'sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:CHAT_ID,text,parse_mode:'Markdown'})});
    }
    console.log('Enviado:',mint);
  }catch(e){console.log('tg err',e.message)}
}

app.get('/',(req,res)=>res.send('Bot Live'));
app.post('/webhook',async(req,res)=>{
  res.sendStatus(200);
  console.log('WEBHOOK LLEGO:',new Date().toISOString());
  try{
    const body=Array.isArray(req.body)?req.body:[req.body];
    for(const tx of body){
      const mint=tx?.tokenTransfers?.[0]?.mint;
      if(!mint||seen.has(mint)) continue;
      console.log('Mint:',mint);
      await new Promise(r=>setTimeout(r,3000));
      const pair=await getPair(mint);
      if(!pair) continue;
      const ageMin=pair.pairCreatedAt?(Date.now()-pair.pairCreatedAt)/1000/60:0;
      if(ageMin>60) continue;
      seen.add(mint);
      const mcap=pair.fdv||0;
      const liq=pair.liquidity?.usd||0;
      await sendToTelegramWithImage(pair,mint,mcap,liq);
    }
  }catch(e){console.log('webhook error',e.message)}
});
const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log('Live',PORT));