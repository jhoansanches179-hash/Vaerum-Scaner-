const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Vaerum Scanner Online');
});

app.post('/webhook', (req, res) => {
  console.log('Webhook Helius:', JSON.stringify(req.body, null, 2));
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Corriendo en puerto ${PORT}`);
});