const express = require('express');
const axios = require('axios');
const { REST, Routes } = require('discord.js');
const { verifyKeyMiddleware } = require('discord-interactions');

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.DISCORD_TOKEN;
const PUB_KEY = process.env.DISCORD_PUBLIC_KEY;
const APP_ID = process.env.DISCORD_APPLICATION_ID;
const OR_KEY = process.env.OPENROUTER_KEY;

console.log('LEN', TOKEN?.length);
console.log('APP', APP_ID);

app.get('/', (req, res) => {
  res.send('Vaerum ONLINE');
});

// Registro de /ask al iniciar
async function register() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(
    Routes.applicationCommands(APP_ID),
    {
      body: [
        {
          name: 'ask',
          description: 'Pregunta a Vaerum IA',
          options: [
            {
              name: 'pregunta',
              description: 'Tu pregunta',
              type: 3,
              required: true
            }
          ]
        }
      ]
    }
  );
  console.log('SLASH /ask REGISTRADO');
}
register().catch(e => console.log('Error registro', e.message));

app.post(
  '/interactions',
  verifyKeyMiddleware(PUB_KEY),
  async (req, res) => {
    const interaction = req.body;
    if (interaction.type === 1) {
      return res.send({ type: 1 });
    }
    if (interaction.type === 2) {
      const q = interaction.data.options[0].value;
      // Respuesta diferida
      res.send({
        type: 5
      });
      // Llama a OpenRouter
      try {
        const r = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [
              { role: 'system', content: 'Eres Vaerum, experto en memecoins, responde corto.' },
              { role: 'user', content: q }
            ]
          },
          {
            headers: { Authorization: 'Bearer ' + OR_KEY }
          }
        );
        const ans = r.data.choices[0].message.content;
        await axios.post(
          `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`,
          { content: ans.slice(0, 1900) }
        );
      } catch (e) {
        const msg = e.response?.data?.error?.message || e.message;
        await axios.post(
          `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`,
          { content: 'Error IA: ' + msg }
        );
      }
    }
  }
);

app.listen(PORT, () => {
  console.log('HTTP LISTEN ' + PORT);
});