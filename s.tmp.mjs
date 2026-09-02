import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain'};
const root='/Users/nish/Documents/NishantEC.github.io/dist';
const srv=createServer((q,r)=>{let p=join(root,decodeURIComponent(q.url.split('?')[0]));if(existsSync(p)&&!extname(p))p=join(p,'index.html');if(!existsSync(p)){r.writeHead(404);return r.end('nf');}r.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});r.end(readFileSync(p));}).listen(4401);
const b=await puppeteer.launch({args:['--autoplay-policy=no-user-gesture-required']});
const p=await (await b.createBrowserContext()).newPage();
p.on('pageerror',e=>console.log('PAGE ERR:',String(e).slice(0,250)));
await p.setViewport({width:900,height:1100,deviceScaleFactor:2});
await p.goto('http://localhost:4401/skills/video-to-ascii',{waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,1800));
const inputs=await p.$$('input[type=file]');
await inputs[inputs.length-1].uploadFile('/tmp/long.mp4');
await new Promise(r=>setTimeout(r,400));
console.log('state:', await p.evaluate(()=>{
  const card=[...document.querySelectorAll('.shimmer')].pop();
  if(!card) return 'no shimmer element';
  const cs=getComputedStyle(card,'::after');
  return {label:card.innerText.trim(), anim:cs.animationName, dur:cs.animationDuration,
    h:Math.round(card.getBoundingClientRect().height),
    rails:document.querySelectorAll('.dialkit-root').length};
}));
// capture the sweep across three moments
const el=async()=>{const e=await p.$$('.rounded-2xl'); return e[e.length-1];};
for (let i=0;i<3;i++){ await (await el()).screenshot({path:`/tmp/sh-${i}.png`}); await new Promise(r=>setTimeout(r,420)); }
await p.waitForFunction(()=>document.querySelectorAll('video').length>0,{timeout:90000});
await new Promise(r=>setTimeout(r,800));
console.log('shimmer gone after:', await p.evaluate(()=>document.querySelectorAll('.shimmer').length));
await b.close(); srv.close();
