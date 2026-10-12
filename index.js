import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim();
const APP_ID = process.env.DISCORD_APPLICATION_ID?.trim();
const OPENROUTER_KEY = process.env.OPENROUTER_KEY?.trim();
const GUILD_ID = (process.env.GUILD_ID || '1558832004986966059').trim();

console.log('BOOT', { APP: APP_ID, GUILD: GUILD_ID });

const commands = [{
  name: 'ask',
  description: 'Preguntale algo a Vaerum IA',
  options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }]
}];

async function registerAll() {
  const headers = {
    'Authorization': `Bot ${TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'DiscordBot (https://discord.com, 10) VaerumBot'
  };
  const url = `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`;
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(commands) });
  const text = await res.text();
  console.log('GUILD STATUS', res.status, text.slice(0,1000));
  if (res.status === 429) {
    const data = JSON.parse(text || '{}');
    const wait = (data.retry_after || 60);
    throw new Error(`Rate limited por Cloudflare, espera ${wait} seg: ${text.slice(0,300)}`);
  }
  if (!res.ok) throw new Error(`Discord ${res.status}: ${text.slice(0,500)}`);
  return JSON.parse(text);
}

const app = express();
app.get('/', (req,res) => res.send('Vaerum ONLINE - espera 10 min antes de /register'));
app.get('/test', (req,res) => res.json({ ok:true, APP_ID, GUILD_ID }));
app.get('/register', async (req,res) => {
  try {
    const data = await registerAll();
    res.json({ ok:true, registered: data.map(c=>c.name), msg: 'Ahora cierra Discord y abre, escribe /' });
  } catch(e){
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
    } catch(err){}
  }
});
app.listen(process.env.PORT || 10000, () => console.log('HTTP LISTEN'));