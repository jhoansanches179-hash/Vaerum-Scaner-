require('http').createServer((_,r)=>r.end('OK')).listen(process.env.PORT||3000);
const {Client,GatewayIntentBits,REST,Routes}=require('discord.js');
const axios=require('axios');
console.log(">> VAERUM START");
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.on('ready',async()=>{console.log("✅ ONLINE "+client.user.tag);const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);await rest.put(Routes.applicationCommands(client.user.id),{body:[{name:'ask',description:'Pregunta a Vaerum',options:[{name:'pregunta',type:3,required:true}]}]});console.log("COMANDOS OK");});
client.on('interactionCreate',async i=>{if(!i.isChatInputCommand())return;await i.deferReply();try{const q=i.options.getString('pregunta');const r=await axios.post("https://openrouter.ai/api/v1/chat/completions",{model:"meta-llama/llama-3.1-8b-instruct:free",messages:[{role:"user",content:q}]},{headers:{Authorization:`Bearer ${process.env.OPENROUTER_KEY}`}});await i.editReply(r.data.choices[0].message.content.slice(0,1900));}catch(e){await i.editReply("Error: "+e.message);}});
console.log("TOKEN len",process.env.DISCORD_TOKEN?.length,"OPENROUTER",!!process.env.OPENROUTER_KEY);
client.login(process.env.DISCORD_TOKEN).then(()=>console.log("Login enviado")).catch(e=>console.log("❌ LOGIN FAIL",e.message));