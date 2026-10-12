import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';
import fetch from 'node-fetch';

const TOKEN = process.env.DISCORD_TOKEN;
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const APP_ID = process.env.DISCORD_APPLICATION_ID;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const GUILD_ID = process.env.GUILD_ID || '1558832004986966059';

console.log('LEN', TOKEN?.length, 'APP', APP_ID, 'GUILD', GUILD_ID);

const commands = [
  {
    name: 'ask',
    description: 'Preguntale algo a Vaerum IA',
    options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }]
  }
];

async function register() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: commands });
    console.log('SLASH /ask REGISTRADO EN GUILD', GUILD_ID);
    await rest.put(Routes.applicationCommands(APP_ID), { body: commands });
    console.log('SLASH /ask REGISTRADO GLOBAL');
  } catch (e) {
    console.error('Error registro', e.message, e.rawError);
  }
}
register();

const app = express();
app.get('/', (req,res)=> res.send('Vaerum ONLINE'));

app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;
  if (interaction.type === 1) {
    return res.send({ type: 1 });
  }
  if (interaction.type === 2 && interaction.data.name === 'ask') {
    const pregunta = interaction.data.options?.[0]?.value || 'Hola';
    res.send({ type: 5 });
    try {
      const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [{ role: 'user', content: pregunta }]
        })
      });
      const data = await aiRes.json();
      const respuesta = data.choices?.[0]?.message?.content || 'No pude responder, Jhoan.';
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: respuesta.slice(0, 1900) })
      });
    } catch (e) {
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Error con la IA: ' + e.message })
      });
    }
    return;
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('HTTP LISTEN', PORT));