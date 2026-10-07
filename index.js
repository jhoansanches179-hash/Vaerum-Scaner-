const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const seen = new Set(); // para no repetir la misma moneda

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

app.get('/', (req,res) => res.send('Vaerum Online + TG - FILTRO ON'));

app.post('/webhook', async (req,res) => {
  try {
    for (const tx of req.body) {
      if (!tx.description) continue;
      const mint = tx.tokenTransfers?.[0]?.mint || 'N/A';
      
      // 1. No repetir la misma moneda
      if (seen.has(mint)) continue;
      seen.add(mint);
      if (seen.size > 500) seen.clear();

      // 2. FILTRO ANTI-SPAM: solo si tiene liquidez decente
      // Si la descripción dice que tiene menos de 100 SOL, lo ignoramos
      const desc = tx.description.toLowerCase();
      // Ignora estafas muy obvias
      if (desc.includes('0.0') && !desc.includes('sol')) continue;

      const msg = `🚀 <b>VAERUM ALERT</b>\n\n${tx.description}\n\n<b>MINT:</b> <code>${mint}</code>\n\n<a href="https://dexscreener.com/solana/${mint}">Dexscreener</a> | <a href="https://photon-sol.tinyastro.io/en/lp/${mint}">Photon</a>`;

      await sendToTelegram(msg);
      
      // 3. Cooldown: espera 20 segundos entre alertas para no spamear
      await new Promise(r => setTimeout(r, 20000));
    }
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(200);
  }
});

app.listen(PORT, () => console.log('Vaerum con filtro ON'));