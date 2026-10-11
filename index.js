require('http').createServer((_,r)=>r.end('OK')).listen(process.env.PORT||3000);
const {Client,GatewayIntentBits}=require('discord.js');const client=new Client({intents:[GatewayIntentBits.Guilds]});
console.log("LEN",process.env.DISCORD_TOKEN?.length);client.login(process.env.DISCORD_TOKEN).then(()=>console.log("✅ Login OK")).catch(e=>console.log("❌ FAIL",e.code,e.message));
client.on('ready',()=>console.log("✅✅ ONLINE "+client.user.tag+" - LISTO"));