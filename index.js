import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim();
const APP_ID = process.env.DISCORD_APPLICATION_ID?.trim();
// Acepta las 2 formas del nombre
const OPENROUTER_KEY = (process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY || '').trim();
const GUILD_ID = (process.env.GUILD_ID || '1558832004986966059').trim();

const commands = [{
  name: 'ask',
  description: 'Preguntale algo a Vaerum IA',
  options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }]
}];

const app = express();
app.get('/', (req,res) => res.send('Vaerum ONLINE - Ve a /register para activar comandos'));

app.get('/register', async (req,res) => {
  try {
    console.log('Registrando en Guild:', GUILD_ID);
    const r = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,{
      method:'PUT',
      headers:{
        'Authorization':`Bot ${TOKEN}`,
        'Content-Type':'application/json',
        'User-Agent':'DiscordBot (Vaerum)'
      },
      body: JSON.stringify(commands)
    });
    const t = await r.text();
    console.log('Discord response:', r.status, t);
    res.send(`<h1>STATUS ${r.status}</h1><pre>${t}</pre><p>Si es 200/201, espera 10 seg y escribe /ask en Discord</p>`);
  } catch(e){
    console.error(e);
    res.send(e.message)
  }
});

app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const i = req.body;
  if (i.type === 1) return res.send({ type: 1 });

  if (i.type === 2 && i.data.name === 'ask') {
    const pregunta = i.data.options?.[0]?.value || 'Hola';
    // Respuesta diferida
    res.send({ type: 5 });

    try {
      const ai = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.1-8b-instruct:free', messages: [{ role:'user', content: pregunta }] })
      });
      const data = await ai.json();
      const respuesta = data.choices?.[0]?.message?.content || 'No pude responder, revisa tu key de OpenRouter.';

      await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${i.token}/messages/@original`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: respuesta.slice(0,1900) })
      });
    } catch(e){
      console.error(e);
    }
    return;
  }
});

app.listen(process.env.PORT || 10000, () => console.log('Servidor prendido'));