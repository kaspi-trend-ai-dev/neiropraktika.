import fs from 'node:fs';
const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const dir='drafts';
const drafts=fs.readdirSync(dir).filter(x=>x.endsWith('.json'));
let published=0;
const manifest=[];
for(const name of drafts){
 const d=JSON.parse(fs.readFileSync(dir+'/'+name,'utf8'));
 if(d.reviewStatus!=='approved')continue;
 if(!/^[a-z0-9-]+$/.test(d.slug))throw Error('Bad slug');
 if(!d.title||!d.summary||!Array.isArray(d.steps)||d.steps.length<5||!Array.isArray(d.prompts)||d.prompts.length<3||!Array.isArray(d.faq)||d.faq.length<3)throw Error('Incomplete: '+d.slug);
 const loc='articles/'+d.slug+'.html';
 const sections=d.steps.map(x=>'<section><h2>'+esc(x.heading)+'</h2><p>'+esc(x.text)+'</p></section>').join('');
 const prompts=d.prompts.map(x=>'<li><pre>'+esc(x)+'</pre></li>').join('');
 const mistakes=(d.mistakes||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 const faq=d.faq.map(x=>'<h3>'+esc(x.question)+'</h3><p>'+esc(x.answer)+'</p>').join('');
 const html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(d.title)+' — НейроПрактика</title><meta name="description" content="'+esc(d.summary.slice(0,155))+'"><link rel="stylesheet" href="../style.css"></head><body><header><a class="logo" href="../">✳ НейроПрактика</a></header><article class="article"><a class="back" href="../">← Все инструкции</a><h1>'+esc(d.title)+'</h1><p>'+esc(d.summary)+'</p>'+sections+'<h2>Готовые промпты</h2><ol>'+prompts+'</ol><h2>Частые ошибки</h2><ul>'+mistakes+'</ul><h2>Вопросы и ответы</h2>'+faq+'</article><footer>НейроПрактика</footer></body></html>';
 fs.mkdirSync('articles',{recursive:true});fs.writeFileSync(loc,html);
 manifest.push({href:'./'+loc,title:d.title,description:d.summary,category:'ИИ · ИНСТРУКЦИИ'});
 published++;
}
const manifestFile='articles.json';
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log('Approved articles rendered:',published);
