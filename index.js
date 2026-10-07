const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const seen = new Set();

async function sendToTelegramWithImage(pair, mint, mcap, liq) {
  if (!TELEGRAM_TOKEN ||!CHAT_ID) return;

  const isNew = pair.dexId === 'pump';
  const typeLabel = isNew? '🟢 NUEVA - PUMP.FUN' : '🔵 MIGRADA - RAYDIUM';
  const imageUrl = pair.info?.imageUrl || pair.info?.header || `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}/header.png`;

  const caption = `${typeLabel}\n\n🚀 <b>${pair.baseToken.name} (${pair.baseToken.symbol})</b>\n💰 MCap: $${mcap.toLocaleString()} | 💧 Liq: $${liq.toLocaleString()}\n💵 Price: $${pair.priceUsd}\n\n<code>${mint}</code>\n\n<a href="https://axiom.trade/meme/${mint}">🟣 COMPRAR EN AXIOM</a>\n<a href="https://dexscreener.com/solana/${mint}">📊 Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${mint}">⚡️ Photon</a>`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, photo: imageUrl, caption: caption, parse_mode: 'HTML' })
    });
  } catch (e) {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: caption, parse_mode: 'HTML', disable_web_page_preview: false })
    });
  }
}

app.get('/', (req,res) => res.send('Vaerum PRO + Axiom ON'));

app.post('/webhook', async (req,res) => {
  res.sendStatus(200);
  try {
    for (const tx of req.body) {
      const mint = tx.tokenTransfers?.[0]?.mint;
      if (!mint || seen.has(mint)) continue;
      if (!mint.endsWith('pump')) continue;

      await new Promise(r => setTimeout(r, 8000));
      try {
        const resp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const j = await resp.json();
        const pair = j.pairs?.[0];
        if (!pair) continue;

        // FILTRO EDAD: solo menos de 15 min
        if (pair.pairCreatedAt) {
          const ageMin = (Date.now() - pair.pairCreatedAt) / 1000 / 60;
          if (ageMin > 15) continue;
        }

        const mcap = pair.fdv || 0;
        const liq = pair.liquidity?.usd || 0;

        if (mcap < 8000) continue;
        if (liq < 2000) continue;

        seen.add(mint);
        await sendToTelegramWithImage(pair, mint, mcap, liq);
      } catch(e){}
    }
  } catch(e){}
});

app.listen(PORT, () => console.log('PRO + AXIOM ON'));
setInterval(() => { fetch(`https://vaerum-scaner-2.onrender.com`).catch(()=>{}); }, 240000);