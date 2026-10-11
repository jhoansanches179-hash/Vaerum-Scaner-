require('http').createServer((_,r)=>r.end('Vaerum OK')).listen(process.env.PORT||3000);
const {Client,GatewayIntentBits,REST,Routes}=require('discord.js');
const axios=require('axios');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
console.log(">> VAERUM FINAL LEN",process.env.DISCORD_TOKEN?.length);
client.on('ready',async()=>{
 console.log("✅ ONLINE "+client.user.tag);
 const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
 await rest.put(Routes.applicationCommands(client.user.id),{body:[{name:'ask',description:'Pregunta a Vaerum IA',options:[{name:'pregunta',description:'Tu pregunta',type:3,required:true}]}]});
 console.log("✅ /ask listo");
});
client.on('interactionCreate',async i=>{
 if(!i.isChatInputCommand())return;
 await i.deferReply();
 const q=i.options.getString('pregunta');
 try{
  const r=await axios.post("https://openrouter.ai/api/v1/chat/completions",{model:"meta-llama/llama-3.1-8b-instruct:free",messages:[{role:"system",content:"Eres Vaerum, experto memecoins peruano, responde corto y util."},{role:"user",content:q}]},{headers:{Authorization:`Bearer ${process.env.OPENROUTER_KEY}`}});
  await i.editReply(r.data.choices[0].message.content.slice(0,1900));
 }catch(e){await i.editReply("Error IA: "+(e.response?.data?.error?.message||e.message));}
});
client.login(process.env.DISCORD_TOKEN).then(()=>console.log("Login OK esperando ready...")).catch(e=>console.log("LOGIN FAIL",e.code,e.message));