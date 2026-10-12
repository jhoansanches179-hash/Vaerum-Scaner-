import { REST, Routes } from 'discord.js';
import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';

const TOKEN = process.env.DISCORD_TOKEN;
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const APP_ID = process.env.DISCORD_APPLICATION_ID;
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const GUILD_ID = (process.env.GUILD_ID || '1558832004986966059').trim();

const commands = [
  {
    name: 'ask',
    description: 'Preguntale algo a Vaerum IA',
    options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }]
  }
];

async function registerAll() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const res1 = await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: commands });
  console.log('OK GUILD REGISTERED', GUILD_ID, res1.length);
  const res2 = await rest.put(Routes.applicationCommands(APP_ID), { body: commands });
  console.log('OK GLOBAL REGISTERED', res2.length);
  return { guild: res1, global: res2 };
}

const app = express();

app.get('/register', async (req,res)=>{
  try {
    const r = await registerAll();
    res.json({ ok:true, guild_id: GUILD_ID, commands: r.guild.map(c=>c.name) });
  } catch(e){
    console.error('REGISTER FAIL', e);
    res.status(500).json({ ok:false, error: e.message, raw: e.rawError || e });
  }
});

app.get('/', (req,res)=> res.send('Vaerum ONLINE - ve a /register para activar /ask'));

app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;
  if (interaction.type === 1) return res.send({ type: 1 });
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
      const respuesta = data.choices?.[0]?.message?.content || 'No pude responder.';
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: respuesta.slice(0,1900) })
      });
    } catch (e) {
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Error: '+e.message })
      });
    }
    return;
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, async ()=>{
  console.log('HTTP LISTEN', PORT, 'GUILD', GUILD_ID);
  try { await registerAll(); } catch(e){ console.error('auto register fail', e.message); }
});