require('http').createServer((_,r)=>r.end('OK')).listen(process.env.PORT||3000);
const {REST,Routes}=require('discord.js');const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN);
rest.get(Routes.currentApplication()).then(a=>console.log("✅ TOKEN 100% VALIDO - APP:",a.name)).catch(e=>console.log("❌ TOKEN MALO",e.code,e.message));console.log("LEN",process.env.DISCORD_TOKEN?.length);