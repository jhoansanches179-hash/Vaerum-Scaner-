async function send(msg, mint){
  try{
    const isReal = mint && mint !== 'So11111111111111111111111111111111111111112' && mint.length > 30;
    const payload = {
      chat_id:CHAT, 
      text:msg, 
      parse_mode:'HTML', 
      disable_web_page_preview:true
    };
    if(isReal){
      payload.reply_markup = {
        inline_keyboard:[[
          {text:"🚀 Axiom", url:`https://axiom.trade/t/${mint}`},
          {text:"💊 Pump", url:`https://pump.fun/coin/${mint}`}
        ]]
      };
    }
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    console.log('TG', d.ok ? 'OK' : JSON.stringify(d));
  }catch(e){ console.log('TG ERR', e.message)}
}