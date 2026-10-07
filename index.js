const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendToTelegram(text) {
  if (!TELEGRAM_TOKEN || !CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
    });
  } catch (e) {}
}

app.get('/', (req,res) => res.send('Vaerum Online + TG'));

app.post('/webhook', async (req,res) => {
  try {
    for (const tx of req.body) {
      if (!tx.description) continue;
      const mint = tx.tokenTransfers?.[0]?.mint || 'N/A';
      const msg = `💎 <b>NUEVA EN PUMP.FUN</b>\n\n${tx.description}\n\n<b>CA:</b> <code>${mint}</code>\n\n🔗 <a href="https://pump.fun/coin/${mint}">Pump</a> | <a href="https://dexscreener.com/solana/${mint}">Dex</a>`;
      await sendToTelegram(msg);
    }
    res.send('OK');
  } catch(e){ res.send('OK'); }
});

app.listen(PORT, () => console.log('Vaerum listo'));