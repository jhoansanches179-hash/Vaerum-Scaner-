const http = require('http');
http.createServer((_, r) => {
  r.end('Vaerum OK');
}).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits } = require('discord.js');
const { REST, Routes } = require('discord.js');
const axios = require('axios');

const TOKEN = process.env.DISCORD_TOKEN;
const OR_KEY = process.env.OPENROUTER_KEY;

console.log('LEN', TOKEN?.length);

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on('ready', async () => {
  console.log('ONLINE ' + client.user.tag);
  const rest = new REST({ version: '10' });
  rest.setToken(TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
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
    console.log('SLASH /ask LISTO');
  } catch (e) {
    console.log('ERROR SLASH', e.message);
  }
});

client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName!== 'ask') return;
  await i.deferReply();
  const q = i.options.getString('pregunta');
  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          {
            role: 'system',
            content: 'Eres Vaerum, experto memecoins.'
          },
          { role: 'user', content: q }
        ]
      },
      {
        headers: {
          Authorization: 'Bearer ' + OR_KEY
        }
      }
    );
    const ans = res.data.choices[0].message.content;
    await i.editReply(ans.slice(0, 1900));
  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    await i.editReply('Error IA: ' + msg);
  }
});

client.login(TOKEN)
 .then(() => console.log('Login OK, esperando ready...'))
 .catch((e) => console.log('FAIL LOGIN', e.code, e.message));