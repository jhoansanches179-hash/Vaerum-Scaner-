require('http').createServer((_,r)=>r.end('OK')).listen(process.env.PORT||3000);
const {Client,GatewayIntentBits}=require('discord.js');
const c=new Client({intents:[GatewayIntentBits.Guilds]});
c.login(process.env.DISCORD_TOKEN).then(()=>console.log("✅ OK LOGIN")).catch(e=>console.log("❌ FAIL",e.code,e.message));console.log("LEN",process.env.DISCORD_TOKEN?.length);c.on('ready',()=>console.log("✅✅ ONLINE "+c.user.tag));