require('http').createServer((req,res)=>res.end('Veruam Online')).listen(process.env.PORT||3000)
require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORDO_TOKEN || process.env.DISCORD_;

// Función cerebro Vaerum
async function preguntarAVaerum(pregunta) {
  try {
    const res = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: "Eres Vaerum, asistente experto en memecoins de la comunidad Vaerum en Perú. Respondes simple, sin tecnicismos, en español. Sabes de Market Cap, Liquidez, Volumen, Supply y % del Dev." },
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
    console.log(e.response?.data || e.message);
    return "Uy bro, el cerebro de Vaerum está fallando un toque: " + (e.response?.data?.error?.message || e.message);
  }
}

// Comandos
const commands = [
  new SlashCommandBuilder().setName('ask').setDescription('Pregúntale a Vaerum').addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta').setRequired(true)),
  new SlashCommandBuilder().setName('filtrar').setDescription('Filtra memecoin por MarketCap, Liquidez, Dev etc').addStringOption(o => o.setName('moneda').setDescription('Contrato o nombre').setRequired(true)),
].map(c => c.toJSON());

client.once('ready', async () => {
  console.log(`✅ Vaerum conectado como ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Comandos registrados');
  } catch (e) { console.log(e); }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply();

  if (interaction.commandName === 'ask') {
    const pregunta = interaction.options.getString('pregunta');
    const resp = await preguntarAVaerum(pregunta);
    await interaction.editReply(`**> ${pregunta}**\n\n${resp}`);
  }

  if (interaction.commandName === 'filtrar') {
    const moneda = interaction.options.getString('moneda');
    await interaction.editReply(`🔍 Analizando **${moneda}** con filtros Vaerum...\nMarket Cap / Supply / Volumen / Liquidez / % Dev\n(Conecta aquí tu lógica de scanner)`);
  }
});

client.login(DISCORD_TOKEN);