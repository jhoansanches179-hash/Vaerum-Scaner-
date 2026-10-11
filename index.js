require('http').createServer((req,res)=>res.end('Veruam Online')).listen(process.env.PORT||3000);
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const axios = require('axios');

console.log(">> INICIANDO VAERUM");
console.log("TOKEN existe?", !!process.env.DISCORD_TOKEN, "largo:", process.env.DISCORD_TOKEN?.length);
console.log("OPENROUTER existe?", !!process.env.OPENROUTER_KEY);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function preguntarAVaerum(p) {
  const r = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
    model: "meta-llama/llama-3.1-8b-instruct:free",
    messages: [{ role: "system", content: "Eres Vaerum, experto en memecoins de Peru. Responde corto en español." }, { role: "user", content: p }]
  }, { headers: { "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`, "Content-Type": "application/json" } });
  return r.data.choices[0].message.content;
}

client.on('ready', async () => {
  console.log(`✅ ONLINE ${client.user.tag}`);
  const cmds = [{ name: 'ask', description: 'Pregunta a Vaerum', options: [{ name: 'pregunta', description: 'Tu pregunta', type: 3, required: true }] }];
  const rest = new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), {body: cmds});
  console.log("Comandos /ask registrados");
});

client.on('interactionCreate', async i => {
  if(!i.isChatInputCommand()) return;
  if(i.commandName==='ask'){
    await i.deferReply();
    const ans = await preguntarAVaerum(i.options.getString('pregunta'));
    await i.editReply(ans.slice(0,1900));
  }
});

client.login(process.env.DISCORD_TOKEN).catch(e=>{
  console.log("❌ ERROR LOGIN:", e.message);
  console.log("Revisa que copiaste bien el DISCORD_TOKEN en Render Environment");
});