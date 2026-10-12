import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim();
const APP_ID = process.env.DISCORD_APPLICATION_ID?.trim();
const OPENROUTER_KEY = process.env.OPENROUTER_KEY?.trim();
const GUILD_ID = (process.env.GUILD_ID || '1558832004986966059').trim();

console.log('BOOT', { APP: APP_ID, GUILD: GUILD_ID, TOKEN_LEN: TOKEN?.length });

const commands = [{
  name: 'ask',
  description: 'Preguntale algo a Vaerum IA',
  options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }]
}];

async function registerAll() {
  console.log('Registrando comandos via fetch...');
  // Guild
  const gRes = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`, {
    method: 'PUT',
    headers: { 'Authorization': `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  const gData = await gRes.json();
  console.log('GUILD RESP', gRes.status, JSON.stringify(gData).slice(0,500));
  if (!gRes.ok) throw new Error('Guild fail: '+JSON.stringify(gData));

  // Global opcional
  const glRes = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'PUT',
    headers: { 'Authorization': `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  const glData = await glRes.json();
  console.log('GLOBAL RESP', glRes.status, JSON.stringify(glData).slice(0,500));
  return gData;
}

const app = express();

app.get('/', (req,res) => res.send('Vaerum ONLINE - /test /register /debug'));

app.get('/test', (req,res) => res.json({ ok:true, APP_ID, GUILD_ID, token_len: TOKEN?.length }));

app.get('/debug', async (req,res) => {
  try {
    const r = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`, {
      headers: { 'Authorization': `Bot ${TOKEN}` }
    });
    const data = await r.json();
    res.json({ ok:true, status:r.status, guild_commands:data, APP_ID, GUILD_ID });
  } catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/register', async (req,res) => {
  try {
    const data = await registerAll();
    res.json({ ok:true, registered: data.map(c=>c.name) });
  } catch(e){
    console.error('REGISTER FAIL', e.message);
    res.status(500).json({ ok:false, error:e.message });
  }
});

app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const i = req.body;
  if (i.type === 1) return res.send({ type: 1 });
  if (i.type === 2 && i.data.name === 'ask') {
    const pregunta = i.data.options?.[0]?.value || 'Hola';
    res.send({ type: 5 });
    try {
      const ai = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role:'user', content: pregunta }] })
      });
      const data = await ai.json();
      const respuesta = data.choices?.[0]?.message?.content || 'No pude responder.';
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${i.token}/messages/@original`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: respuesta.slice(0,1900) })
      });
    } catch(err){
      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${i.token}/messages/@original`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Error: '+err.message })
      });
    }
  }
});

app.listen(process.env.PORT || 10000, async () => {
  console.log('HTTP LISTEN', process.env.PORT || 10000);
  try { await registerAll(); console.log('AUTO REGISTER OK'); } catch(e){ console.error('Auto register fail:', e.message); }
});