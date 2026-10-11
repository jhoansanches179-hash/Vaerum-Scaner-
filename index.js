require('http').createServer((req,res)=>res.end('Veruam Online ✅')).listen(process.env.PORT||3000)
require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Función cerebro Vaerum con OpenRouter
async function preguntarAVaerum(pregunta) {
  try {
    const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          { role: "system", content: "Eres Vaerum, asistente experto en memecoins de la comunidad Vaerum en Perú. Respondes simple, sin tecnicismos, en español. Sabes de Market Cap, Liquidez, Volumen y del Dev. Eres amigable y directo." },
          { role: "user", content: pregunta }
        ]
      }, {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json"
        }
      });
    return res.data.choices[0].message.content;
  } catch (e) {
    console.error(e.response?.data || e.message);
    return "Uy, mi cerebro OpenRouter está offline un momento. Intenta de nuevo.";
  }
}

client.on('ready', async () => {
  console.log(`Veruam IA online como ${client.user.tag}`);
  const commands = [
    { name: 'moneda', description: 'Información de una memecoin' },
    { name: 'ask', description: 'Preguntale algo a Vaerum IA', options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }] },
    { name: 'filter', description: 'Filtros de seguridad Vaerum' }
  ];
  const