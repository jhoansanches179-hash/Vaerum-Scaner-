require('http').createServer((req,res)=>res.end('Vaerum Online')).listen(process.env.PORT||3000);

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');

console.log(">> INICIANDO VAERUM");
console.log("TOKEN existe?", !!process.env.DISCORD_TOKEN, "largo:", process.env.DISCORD_TOKEN?.length);
console.log("OPENROUTER existe?", !!process.env.OPENROUTER_KEY);

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds] 
});

async function preguntarAVaerum(pregunta) {
  try {
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: "Eres Vaerum, un experto en memecoins y crypto de Perú. Responde corto, en español, estilo barrio peruano." },
        { role: "user", content: pregunta }
      ]
    }, { 
      headers: { 
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      } 
    });
    return response.data.choices[0].message.content;
  } catch (e) {
    console.log("ERROR OpenRouter:", e.response?.data || e.message);
    return "Hubo un error con OpenRouter, revisa tu OPENROUTER_KEY y créditos.";
  }
}

client.on('ready', async () => {
  console.log(`✅ ONLINE ${client.user.tag}`);
  const commands = [
    { 
      name: 'ask', 
      description: 'Pregunta a Vaerum IA',
      options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }]
    }
  ];
  const rest = new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {body: commands});
    console.log("✅ Comandos /ask registrados");
  } catch (e) {
    console.log("ERROR registrando comandos:", e.message);
  }