require('http').createServer((_,r)=>r.end('OK')).listen(process.env.PORT||3000);
const axios=require('axios');
console.log(">> TEST TOKEN");
console.log("LEN",process.env.DISCORD_TOKEN?.length);
(async()=>{
  try{
    const r=await axios.get("https://discord.com/api/v10/users/@me",{headers:{Authorization:`Bot ${process.env.DISCORD_TOKEN}`}});
    console.log("✅ TOKEN VALIDO:",r.data.username+"#"+r.data.discriminator);
  }catch(e){
    console.log("❌ TOKEN INVALIDO:",e.response?.status,e.response?.data?.message||e.message);
  }
  try{
    const r2=await axios.get("https://openrouter.ai/api/v1/auth/key",{headers:{Authorization:`Bearer ${process.env.OPENROUTER_KEY}`}});
    console.log("✅ OPENROUTER VALIDO:",r2.data.data?.label||"ok");
  }catch(e){
    console.log("❌ OPENROUTER INVALIDO:",e.response?.data||e.message);
  }
})();