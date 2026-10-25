import fs from 'node:fs';
const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const link = (title,url) => { try { const u=new URL(url); if(!['https:','http:'].includes(u.protocol)) return ''; return '<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(title)+'</a>'; } catch { return ''; } };
const dir='drafts';
const drafts=fs.readdirSync(dir).filter(x=>x.endsWith('.json'));
let published=0;
const manifest=[];
for(const name of drafts){
 const d=JSON.parse(fs.readFileSync(dir+'/'+name,'utf8'));
 if(d.reviewStatus!=='approved')continue;
 // Legacy articles remain visible while they are audited; never admit new unverified pieces.
 const legacy=new Set(['chatgpt-excel','chatgpt-kartinki','chatgpt-perevod','chatgpt-pismo','chatgpt-plan','chatgpt-ucheba']);
 if(!legacy.has(d.slug) && !(d.sourceAudit?.verified===true && d.sourceAudit?.reviewer==='human' && Array.isArray(d.sources) && d.sources.length)) { console.log('HOLD: missing independent source review',d.slug); continue; }
 if(!/^[a-z0-9-]+$/.test(d.slug))throw Error('Bad slug');
 if(!d.title||!d.summary||!Array.isArray(d.steps)||d.steps.length<5||!Array.isArray(d.prompts)||d.prompts.length<3||!Array.isArray(d.faq)||d.faq.length<3)throw Error('Incomplete: '+d.slug);
 const loc='articles/'+d.slug+'.html';
 const audience=d.audience?'<p><strong>Для кого:</strong> '+esc(d.audience)+'</p>':'';
 const lead=d.result?'<h2>Что получится в итоге</h2><p>'+esc(d.result)+'</p>':'';
 const prep=Array.isArray(d.inputs)&&d.inputs.length?'<h2>Что потребуется</h2><ul>'+d.inputs.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
 const sections=d.steps.map(x=>'<section><h2>'+esc(x.heading)+'</h2><p>'+esc(x.text)+'</p></section>').join('');
 const worked=d.example?.input&&d.example?.output?'<h2>Пример от начала до результата</h2><h3>Исходные данные</h3><pre>'+esc(d.example.input)+'</pre><h3>Пример результата</h3><pre>'+esc(d.example.output)+'</pre>':'';
 const check=Array.isArray(d.checklist)&&d.checklist.length?'<h2>Как проверить результат</h2><ul>'+d.checklist.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
 const limitations=Array.isArray(d.limitations)&&d.limitations.length?'<h2>На что обратить внимание</h2><ul>'+d.limitations.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
 const prompts=d.prompts.map(x=>'<li><pre>'+esc(x)+'</pre></li>').join('');
 const mistakes=(d.mistakes||[]).map(x=>'<li>'+esc(x)+'</li>').join('');
 const faq=d.faq.map(x=>'<h3>'+esc(x.question)+'</h3><p>'+esc(x.answer)+'</p>').join('');
 const sources=Array.isArray(d.sources)&&d.sources.length?'<h2>Источники</h2><ul>'+d.sources.map(x=>'<li>'+link(x.title,x.url)+'</li>').join('')+'</ul>':'';
 const html='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(d.title)+' — НейроПрактика</title><meta name="description" content="'+esc(d.summary.slice(0,155))+'"><link rel="stylesheet" href="../style.css"></head><body><header><a class="logo" href="../">✳ НейроПрактика</a></header><article class="article"><a class="back" href="../">← Все инструкции</a><h1>'+esc(d.title)+'</h1><p>'+esc(d.summary)+'</p>'+audience+lead+prep+sections+worked+check+limitations+'<h2>Готовые промпты</h2><ol>'+prompts+'</ol><h2>Частые ошибки</h2><ul>'+mistakes+'</ul><h2>Вопросы и ответы</h2>'+faq+sources+'</article><footer>НейроПрактика</footer></body></html>';
 fs.mkdirSync('articles',{recursive:true});fs.writeFileSync(loc,html);
 manifest.push({href:'./'+loc,title:d.title,description:d.summary,category:'ИИ · ИНСТРУКЦИИ'});
 published++;
}
const manifestFile='articles.json';
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log('Approved articles rendered:',published);
