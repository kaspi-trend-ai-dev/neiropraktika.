import fs from 'node:fs';
import path from 'node:path';

const topics = JSON.parse(fs.readFileSync('data/topics.json','utf8'));
const sourceCatalog=JSON.parse(fs.readFileSync('data/official-sources.json','utf8'));

const used = new Set(['prompty-chatgpt','rezume-chatgpt','tovar-chatgpt']);
const norm = s => String(s).toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const words = s => new Set(norm(s).split(' ').filter(x=>x.length>3));
const similarity = (a,b) => { const A=words(a),B=words(b);return [...A].filter(x=>B.has(x)).length/Math.max(1,Math.min(A.size,B.size)); };
for(let i=0;i<topics.length;i++){
 const t=topics[i];
 if(!/^[a-z0-9-]+$/.test(t.id)||used.has(t.id))throw Error('Duplicate or invalid topic: '+t.id);
 for(let j=0;j<i;j++)if(norm(t.intent)===norm(topics[j].intent)||similarity(t.intent,topics[j].intent)>.84)throw Error('Duplicate topic: '+t.id);
 used.add(t.id);
}
const existing=fs.existsSync('drafts')?fs.readdirSync('drafts'):[];
const done=new Set(existing.filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5)));
const next=topics.find(x=>!done.has(x.id));
if(!next){console.log('No new topics');process.exit(0);}
const key=process.env.OPENAI_API_KEY;
if(!key)throw Error('OPENAI_API_KEY is required');
const brief=[
 'Ты автор НейроПрактики. Наши принципы: ДОСТОВЕРНОСТЬ, ПОЛЬЗА, УНИКАЛЬНОСТЬ, ПРОСТОТА.',
 'Пиши не общую статью, а ПРАКТИЧЕСКИЙ МАСТЕР-КЛАСС, после которого человек получает конкретный готовый результат и может самостоятельно его повторить.',
 'Поисковая задача: '+next.intent,
 'Заголовок: '+next.title,
 'Практическая цель: '+(next.goal||next.intent),
 'Точный конечный продукт: '+(next.deliverable||'Воспроизводимый результат'),
 'Верни один JSON объект. Обязательные поля:',
 '{"title":string,"summary":string,"audience":string,"result":string,"inputs":[string, string, ...],"steps":[{"heading":string,"text":string},...],"example":{"input":string,"output":string},"prompts":[string,...],"mistakes":[string,...],"checklist":[string,...],"faq":[{"question":string,"answer":string},...],"limitations":[string,...]}.',
 'Требуется 5–9 подробных разных шагов, минимум 3 реально применимых промпта, минимум 3 пункта самопроверки, минимум 3 ошибки и 3 FAQ.',
 'В каждом шаге ОБЯЗАТЕЛЬНО конкретное действие + промежуточный результат. Не пиши «используйте ИИ», «попросите нейросеть помочь», «подберите настройки» без примера.',
 'В поле example.input укажи собственные ОЧЕВИДНО УСЛОВНЫЕ исходные данные, в example.output — реалистичный фрагмент конечного результата (не фальсифицируй тесты, ссылки, замеры).',
 'Промпты должны содержать задачу, ограничения, формат результата и места для вставки своих данных в квадратных скобках, когда нужно.',
 'Отдавай предпочтение работе с видео, монтажу, зарабатываемым навыкам и автоматизации работы, когда это соответствует теме. Для заработка — реальные услуги и шаги без обещаний дохода.',
 'Начинай summary с прямого ответа на поисковую задачу. Пиши простыми словами на русском, избегай пустых вступлений.',
 'Не придумывай существование тарифов, функций, кнопок, ссылок, источников и актуальную стоимость инструментов. ChatGPT способен создавать изображения прямо в чате и анализировать загруженные файлы Excel, но возможности зависят от доступной конфигурации.',
 'Не заявляй экономию времени или эффективность в процентах без измерения. Не обещай гарантий заработка.',
 'Не копируй чужие тексты. Если факт невозможно подтвердить, обозначь необходимость проверки в limitations, не делай категоричных утверждений.',
 'Ответ только валидный JSON без Markdown.'
].join('\n');
const resp=await fetch('https://api.openai.com/v1/chat/completions',{
 method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
 body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0.3,response_format:{type:'json_object'},messages:[{role:'user',content:brief}]})
});
if(!resp.ok)throw Error('OpenAI API '+resp.status+' '+(await resp.text()).slice(0,180));
const obj=JSON.parse((await resp.json()).choices?.[0]?.message?.content||'{}');
const arr=(key,min)=>Array.isArray(obj[key])&&obj[key].length>=min;
if(norm(obj.title)!==norm(next.title))throw Error('Title mismatch');
if(!obj.audience||!obj.result||!arr('inputs',2)||!arr('steps',5)||!arr('prompts',3)||!arr('checklist',3)||!arr('mistakes',3)||!arr('faq',3)||!obj.example?.input||!obj.example?.output)throw Error('Missing hands-on tutorial requirements');
if(obj.steps.some(x=>String(x.text||'').length<90))throw Error('Steps too brief');
if(obj.prompts.some(x=>String(x).length<85))throw Error('Prompts too generic');
if(JSON.stringify(obj).length<4500)throw Error('Article too superficial');
fs.mkdirSync('drafts',{recursive:true});
fs.writeFileSync(path.join('drafts',next.id+'.json'),JSON.stringify({
 ...obj,
 intent:next.intent,slug:next.id,category:next.category||'practical',
 reviewStatus:'pending',sourceAudit:{verified:false},sources:sourceCatalog[next.id]||[]
},null,2)+'\n');
console.log('Generated detailed draft for review: '+next.id);
