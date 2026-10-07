const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const seen = new Set();

async function sendToTelegram(text) {
  if (!TELEGRAM_TOKEN ||!CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML', disable_web_page_preview: true })
  }).catch(()=>{});
}

app.get('/', (req,res) => res.send('Vaerum Online + TG - PRO v3'));

app.post('/webhook', async (req,res) => {
  res.sendStatus(200);
  try {
    for (const tx of req.body) {
      const mint = tx.tokenTransfers?.[0]?.mint;
      if (!mint || seen.has(mint)) continue;
      if (!mint.endsWith('pump')) continue; // solo pump.fun

      seen.add(mint);
      if (seen.size > 1000) seen.clear();

      // Esperamos 8 seg para que Dexscreener la lea
      await new Promise(r => setTimeout(r, 8000));

      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const j = await r.json();
        const pair = j.pairs?.[0];
        if (!pair) continue;

        const mcap = pair.fdv || 0;
        const liq = pair.liquidity?.usd || 0;

        // FILTRO: si no vale al menos $10k, no te molesta
        if (mcap < 10000) continue;
        if (liq < 3000) continue;

        const msg = `🚀 <b>${pair.baseToken.name} (${pair.baseToken.symbol})</b>\n\n💰 <b>MCap:</b> $${mcap.toLocaleString()}\n💧 <b>Liq:</b> $${liq.toLocaleString()}\n💵 <b>Precio:</b> $${pair.priceUsd}\n\n<b>MINT:</b> <code>${mint}</code>\n\n<a href="https://dexscreener.com/solana/${mint}">📊 Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${mint}">⚡️ Photon</a> | <a href="https://pump.fun/${mint}">Pump</a>`;

        await sendToTelegram(msg);
      } catch(e){}
    }
  } catch(e){}
});

app.listen(PORT, () => console.log('PRO v3 ON'));

// Anti-sleep Render gratis
setInterval(() => {
  fetch(`https://vaerum-scaner-2.onrender.com`).catch(()=>{});
}, 240000);