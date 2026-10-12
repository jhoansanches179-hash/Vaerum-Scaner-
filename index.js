import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';

const TOKEN = process.env.DISCORD_TOKEN?.trim();
const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY?.trim();
const APP_ID = process.env.DISCORD_APPLICATION_ID?.trim();
const OPENROUTER_KEY = process.env.OPENROUTER_KEY?.trim();
const GUILD_ID = (process.env.GUILD_ID || '1558832004986966059').trim();

const commands = [{
  name: 'ask',
  description: 'Preguntale algo a Vaerum IA',
  options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }]
}];

const app = express();
app.get('/', (req,res) => res.send('Vaerum ONLINE'));

// PAGINA PARA REGISTRAR DESDE TU CELULAR - USA TU IP, NO LA DE RENDER
app.get('/manual', (req,res) => {
  res.send(`
  <html><body style="font-family:sans-serif;padding:20px">
  <h2>Registrar /ask desde tu IP</h2>
  <p>1. Dale al botón, usa TU internet no el de Render y Cloudflare lo dejará pasar.</p>
  <button onclick="go()" style="padding:15px 30px;font-size:18px">REGISTRAR AHORA</button>
  <pre id="out" style="background:#111;color:#0f0;padding:10px;margin-top:20px"></pre>
  <script>
  async function go(){
    document.getElementById('out').textContent='Registrando...';
    const url = 'https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands';
    const r = await fetch(url, {
      method:'PUT',
      headers:{
        'Authorization':'Bot ${TOKEN}',
        'Content-Type':'application/json'
      },
      body: JSON.stringify(${JSON.stringify(commands)})
    });
    const t = await r.text();
    document.getElementById('out').textContent = 'STATUS '+r.status+'\\n'+t;
  }
  </script>
  </body></html>
  `);
});

app.get('/register', async (req,res) => {
  try {
    const r = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`,{
      method:'PUT',
      headers:{'Authorization':`Bot ${TOKEN}`,'Content-Type':'application/json','User-Agent':'DiscordBot (https://discord.com, 10)'},
      body: JSON.stringify(commands)
    });
    const t = await r.text();
    res.send(`STATUS ${r.status} <br><pre>${t.slice(0,2000)}</pre>`);
  } catch(e){ res.send(e.message) }
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
    } catch(e){}
  }
});
app.listen(process.env.PORT || 10000);