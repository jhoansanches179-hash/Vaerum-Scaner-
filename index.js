app.post('/webhook', async (req,res) => {
  res.sendStatus(200);
  console.log('WEBHOOK LLEGO!', new Date().toISOString(), req.body?.length || 1);

  // mensaje de prueba directo a telegram para saber que llego
  try{
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({chat_id: CHAT_ID, text: `🔔 WEBHOOK RECIBIDO ${new Date().toISOString()} - Revisando moneda...`})
    });
  }catch(e){}

  try {
    for (const tx of req.body) {
      const mint = tx.tokenTransfers?.[0]?.mint || tx.accountData?.[0]?.tokenBalanceChanges?.[0]?.mint;
      if (!mint || seen.has(mint)) continue;

      console.log('Mint detectado:', mint);
      await new Promise(r => setTimeout(r, 6000));

      try {
        const resp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const j = await resp.json();
        const pair = j.pairs?.[0];
        if (!pair) continue;
        if (pair.pairCreatedAt) {
          const ageMin = (Date.now() - pair.pairCreatedAt) / 1000 / 60;
          if (ageMin > 20) continue;
        }
        seen.add(mint);
        const mcap = pair.fdv || 0;
        const liq = pair.liquidity?.usd || 0;
        if (mcap < 5000) continue;
        await sendToTelegramWithImage(pair, mint, mcap, liq);
      } catch(e){ console.log('error dexs', e.message) }
    }
  } catch(e){ console.log('error webhook', e.message)}
});