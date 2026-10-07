const express = require('express');
const fs = require('fs');
const app = express();
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT = process.env.CHAT_ID;

let seen = new Set();
let pendingBest = null;
let lastScanCount = 0;

let cerebro = { top10_max: 25, holders_min: 5, total:0, buenas:0, historial: [] };
try{ if(fs.existsSync('cerebro.json')) cerebro = JSON.parse(fs.readFileSync('cerebro.json')); }catch(e){}
function guardarCerebro(){ try{fs.writeFileSync('cerebro.json', JSON.stringify(cerebro));}catch(e){} }

async function send(msg, mint){
  const kb = { inline_keyboard: [[
    {text:"🚀 Axiom", url:`https://axiom.trade/t/${mint}`},
    {text:"💊 Pump", url:`https://pump.fun/coin/${mint}`}
  ]]};
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id:CHAT, text:msg, parse_mode:'HTML', disable_web_page_preview:true, reply_markup: kb})
  }).catch(()=>{});
}

function calcularScore(c){
  let score = 100;
  score -= (c.top_10_holders || 0) * 2.2;
  score += (c.num_holders || c.holders || 0) * 0.6;
  if((c.name||'').length > 25) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function calificar(mint, mc_inicial, datos_inicial){
  setTimeout(async ()=>{
    try{
      const r = await fetch(`https://frontend-api-v3.pump.fun/coins/${mint}`);
      const c = await r.json();
      const mc_final = c.usd_market_cap || 0;
      const x = mc_final / (mc_inicial || 1);
      const esBuena = x >= 1.8;
      cerebro.total++;
      if(esBuena) cerebro.buenas++;
      if(!esBuena && datos_inicial.top > 15){
        cerebro.top10_max = Math.max(13, cerebro.top10_max - 0.4);
      }
      if(esBuena){
        cerebro.top10_max = Math.min(25, cerebro.top10_max + 0.15);
      }
      cerebro.h