import fs from 'node:fs';
import path from 'node:path';

const topics = JSON.parse(fs.readFileSync('data/topics.json','utf8'));
const used = new Set(['prompty-chatgpt','rezume-chatgpt','tovar-chatgpt']);
const norm = s => s.toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const words = s => new Set(norm(s).split(' ').filter(x=>x.length>3));
const similarity = (a,b) => {const A=words(a),B=words(b); const both=[...A].filter(x=>B.has(x)).length;return both/Math.max(1,Math.min(A.size,B.size));};
for(let i=0;i<topics.length;i++) {
 const t=topics[i];
 if(!/^[a-z0-9-]+$/.test(t.id) || used.has(t.id)) throw Error('Duplicate or invalid slug: '+t.id);
 for(let j=0;j<i;j++) if(norm(t.intent)===norm(topics[j].intent)||similarity(t.intent,topics[j].intent)>.84) throw Error('Possible duplicate intent: '+t.id);
 used.add(t.id);
}
const files=fs.existsSync('drafts')?fs.readdirSync('drafts'): [];
const done=new Set(files.filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5)));
const next=topics.find(t=>!done.has(t.id));
if(!next){console.log('Queue finished');process.exit(0);}
const key=process.env.OPENAI_API_KEY;
if(!key){console.log('OPENAI_API_KEY missing: no draft created');process.exit(0);}
const prompt = [
'Напиши полезную, точную русскоязычную обучающую статью для сайта НейроПрактика.',
'Поисковый запрос: '+next.intent,
'Заголовок: '+next.title,
'Ответ строго в JSON объекте с полями title, summary, steps (array of 5-9 objects with heading and text), prompts (array 3-5 strings), mistakes (array 3-5 strings), faq (array 3-5 objects with question and answer).',
'Не выдумывай интерфейс, доступность функций, цены и ограничения. Не заявляй о тестировании, если его не было. Не используй кликбейт.',
'С первых 2-3 предложений дай прямой ответ. Конкретика обязательна: покажи полезные, проверяемые примеры запросов.',
'Пиши самостоятельно, не копируй фразы из чужих материалов.'
].join('\n');
const response=await fetch('https://api.openai.com/v1/chat/completions',{
 method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
 body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.4,response_format:{type:'json_object'},messages:[{role:'user',content:prompt}]})
});
if(!response.ok) throw Error('API error '+response.status+' '+(await response.text()).slice(0,300));
const answer=await response.json();
const result=JSON.parse(answer.choices?.[0]?.message?.content||'{}');
if(norm(result.title)!==norm(next.title))throw Error('Unexpected title');
if(!Array.isArray(result.steps)||result.steps.length<5||!Array.isArray(result.prompts)||result.prompts.length<3||!Array.isArray(result.faq)||result.faq.length<3)throw Error('Incomplete tutorial');
const body=JSON.stringify(result);
if(body.length<3000||body.length>30000)throw Error('Draft length outside bounds');
fs.mkdirSync('drafts',{recursive:true});
fs.writeFileSync(path.join('drafts',next.id+'.json'),JSON.stringify({intent:next.intent,slug:next.id,reviewStatus:'pending',...result},null,2)+'\n');
console.log('Generated pending draft:',next.id);
