import { REST, Routes } from 'discord.js';
import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim();
const APP_ID = process.env.DISCORD_APPLICATION_ID?.trim();
const OPENROUTER_KEY = process.env.OPENROUTER_KEY?.trim();
const GUILD_ID = (process.env.GUILD_ID || '1558832004986966059').trim();

console.log('BOOT', { APP: APP_ID, GUILD: GUILD_ID, TOKEN_LEN: TOKEN?.length });

const commands = [
  {
    name: 'ask',
    description: 'Preguntale algo a Vaerum IA',
    options: [
      { name: 'pregunta', description: 'Tu pregunta para la IA', type: 3, required: true }
    ]
  }
];

async function registerAll() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  console.log('Registrando comandos...');
  const guild = await rest.put(Routes.applicationGuildCommands(APP_ID, GUILD_ID), { body: commands });
  console.log('OK GUILD:', guild.map(c => c.name));
  const global = await rest.put(Routes.applicationCommands(APP_ID), { body: commands });
  console.log('OK GLOBAL:', global.map(c => c.name));
  return { guild, global };
}

const app = express();

app.get('/', (req,res) => res.send('Vaerum ONLINE - /debug para ver comandos, /register para forzar'));

app.get('/debug', async (req,res) => {
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const guildCmds = await rest.get(Routes.applicationGuildCommands(APP_ID, GUILD_ID));
    const globalCmds = await rest.get(Routes.applicationCommands(APP_ID));
    res.json({ ok:true, APP_ID, GUILD_ID, guild_commands: guildCmds, global_commands: globalCmds });
  } catch(e){
    res.status(500).json({ ok:false, error: e.message, raw: e.rawError });
  }
});

app.get('/register', async (req,res) => {
  try {
    const r = await registerAll();
    res.json({ ok:true, registered: r.guild.map(c=>c.name), guild: GUILD_ID });
  } catch(e){
    console.error('REGISTER FAIL', e);
    res.status(500).json({ ok:false, error: e.message, raw: e.rawError, APP_ID, GUILD_ID });
  }
});

// INTERACTIONS - ESTO NO LO TOQUES, YA FUNCIONA
app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const i = req.body;
  if (i.type === 1) return res.send({ type: 1 });

  if (i.type === 2 && i.data.name === 'ask') {
    const pregunta = i.data.options?.[0]?.value || 'Hola';
    // Responde defer para no timeout
    res.send({ type: 5 });

    try {
      const ai = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [{ role: 'user', content: pregunta }]
        })
      });
      const data = await ai.json();
      const respuesta = data.choices?.[0]?.message?.content || 'No pude responder ahora.';

      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${i.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: respuesta.slice(0, 1900) })
      });
    } catch(err){
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${i.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Error: ' + err.message })
      });
    }
    return;
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log('HTTP LISTEN', PORT);
  try { await registerAll(); } catch(e){ console.error('Auto register fail:', e.message, e.rawError); }
});