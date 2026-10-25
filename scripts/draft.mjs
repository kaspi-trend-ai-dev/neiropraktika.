import fs from 'node:fs';
import path from 'node:path';
import {editorialIdeaIssues,frontierDraftIssues} from './editorial-signal.mjs';

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
for(const t of topics){
 const failures=editorialIdeaIssues(t);
 if(failures.length)throw Error('Weak editorial idea '+t.id+': '+failures.join('; '));
}
const existing=fs.existsSync('drafts')?fs.readdirSync('drafts'):[];
const done=new Set(existing.filter(x=>x.endsWith('.json')).map(x=>x.slice(0,-5)));
const next=topics.find(x=>!done.has(x.id));
if(!next){console.log('No new topics');process.exit(0);}
const key=process.env.OPENAI_API_KEY;
if(!key)throw Error('OPENAI_API_KEY is required');
const brief=[
 'Ты автор НейроПрактики — современного русскоязычного медиа о САМЫХ ИНТЕРЕСНЫХ НОВЫХ ВОЗМОЖНОСТЯХ ИИ. Принципы: ДОСТОВЕРНОСТЬ, ПОЛЬЗА, УНИКАЛЬНОСТЬ, ПРОСТОТА.',
 'Не пиши школьный how-to на тему кнопок и базовых промптов. Нужен ЖУРНАЛИСТСКИЙ МАТЕРИАЛ О ТЕХНОЛОГИЧЕСКОМ ПРЫЖКЕ с конкретным продвинутым проектом, который читатель сможет попробовать самостоятельно.',
 'Новая возможность: '+next.novelty,
 'Почему это интересно: '+next.impact,
 'Формат и угол подачи: '+next.format,
 'Официальный первоисточник для последующей ПРОВЕРКИ: '+next.primary,
 'Дата релиза (если подтверждена в задании): '+(next.releaseDate||'Уточнить у первоисточника'),
 'ВНИМАНИЕ: у тебя нет доступа к фактическому содержанию ссылки при написании; не выдавай её за прочитанную, не выдумывай цитаты или точные параметры модели. Отметь, что технические возможности подлежат проверке редактором.',
 'Поисковая задача: '+next.intent,
 'Заголовок: '+next.title,
 'Практическая цель: '+(next.goal||next.intent),
 'Точный конечный продукт: '+(next.deliverable||'Воспроизводимый результат'),
 'Верни один JSON объект. Обязательные поля:',
 '{"title":string,"summary":string,"newsHook":string,"breakthrough":string,"proofBoundary":string,"audience":string,"result":string,"inputs":[string, string, ...],"steps":[{"heading":string,"text":string},...],"example":{"input":string,"output":string},"prompts":[string,...],"mistakes":[string,...],"checklist":[string,...],"faq":[{"question":string,"answer":string},...],"limitations":[string,...]}.',
 'newsHook: яркое, но точное открытие материала (100+ знаков) — что новое в модели и почему это необычно. breakthrough: что раньше требовало ручной работы и какая новая возможность появилась (110+ знаков). proofBoundary: что заявляет разработчик, что лишь предлагается попробовать, а что автор действительно ПРОВЕРИЛ (не утверждай о тесте, если он не проведён).',
 'ПЕРВЫЙ АБЗАЦ должен быть способен заинтересовать опытного зрителя нейросетей, а не новичка. Без «сегодня ИИ становится популярным».',
 'Описывай проект с нетривиальным исходом: многоплановая сцена, процедурная анимация, пайплайн нескольких моделей, видео+музыка, а не элементарное нажатие кнопки.',
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
const frontierProblems=frontierDraftIssues({...obj,category:next.category,sources:sourceCatalog[next.id]||[]});
if(frontierProblems.length)throw Error('Editorial novelty check: '+frontierProblems.join('; '));
if(JSON.stringify(obj).length<4500)throw Error('Article too superficial');
fs.mkdirSync('drafts',{recursive:true});
fs.writeFileSync(path.join('drafts',next.id+'.json'),JSON.stringify({
 ...obj,
 intent:next.intent,slug:next.id,category:next.category||'frontier-experiment',
 editorialAngle:next.novelty,editorialFormat:next.format,impactArea:next.impact,sourceReleaseDate:next.releaseDate||null,
 reviewStatus:'pending',sourceAudit:{verified:false},sources:sourceCatalog[next.id]||[]
},null,2)+'\n');
console.log('Generated detailed draft for review: '+next.id);
