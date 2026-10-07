import express from 'express';
const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const seen = new Set();

async function sendToTelegramWithImage(pair, mint, mcap, liq) {
  try {
    const name = pair.baseToken?.name || 'Unknown';
    const symbol = pair.baseToken?.symbol || '';
    const price = pair.priceUsd || 0;
    const imgUrl = pair.info?.imageUrl || pair.baseToken?.info?.imageUrl;

    const text = `🚀 *${name} $${symbol}*\n\n` +
                 `💰 MC: $${(mcap/1000).toFixed(1)}k\n` +
                 `💧 Liq: $${liq.toFixed(0)}\n` +
                 `💵 Price: $${price}\n` +
                 `🔗 \`${mint}\`\n\n` +
                 `[Axiom](https://axiom.trade/t/${mint}) | [Dex](https://dexscreener.com/solana/${mint})`;

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/`;

    if (imgUrl) {
      await fetch(url + 'sendPhoto', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          chat_id: CHAT_ID,
          photo: imgUrl,
          caption: text,
          parse_mode: 'Markdown'
        })
      });
    } else {
      await fetch(url + 'sendMessage', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({chat_id: CHAT_ID, text, parse_mode: 'Markdown', disable_web_page_preview: true})
      });
    }
    console.log('Enviado a TG:', mint);
  } catch(e){ console.log('Error TG:', e.message) }
}

app.get('/', (req,res)=> res.send('Bot Live'));

app.post('/webhook', async (req,res) => {
  res.sendStatus(200);
  console.log('WEBHOOK LLEGO:', new Date().toISOString());

  // Mensaje de prueba para saber que Helius si llega
  fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({chat_id: CHAT_ID, text: `🔔 WEBHOOK RECIBIDO - Revisando...`})
  }).catch(()=>{});

  try {
    const body = Array.isArray(req.body)? req.body : [req.body];
    for (const tx of body) {
      const mint = tx?.tokenTransfers?.[0]?.mint;
      if (!mint || seen.has(mint)) continue;

      console.log('Mint:', mint);
      await new Promise(r => setTimeout(r, 5000));

      try {
        const resp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const j = await resp.json();
        const pair = j.pairs?.[0];
        if (!pair) continue;

        if (pair.pairCreatedAt) {
          const ageMin = (Date.now() - pair.pairCreatedAt) / 1000 / 60;
          if (ageMin > 30) continue;
        }

        seen.add(mint);
        const mcap = pair.fdv || 0;
        const liq = pair.liquidity?.usd || 0;
        if (mcap < 4000) continue;

        await sendToTelegramWithImage(pair, mint, mcap, liq);
      } catch(e){ console.log('dex error', e.message) }
    }
  } catch(e){ console.log('webhook error', e.message)}
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=> console.log('Live en puerto', PORT));