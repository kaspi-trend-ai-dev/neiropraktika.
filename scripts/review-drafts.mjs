import fs from 'node:fs';
import {practicalIssues,detectTopicCollisions,sourceIssues} from './quality-rules.mjs';
import {frontierDraftIssues} from './editorial-signal.mjs';

const root='drafts';
const files=fs.readdirSync(root).filter(f=>f.endsWith('.json')).sort();
const drafts=files.map(f=>({file:f,data:JSON.parse(fs.readFileSync(root+'/'+f,'utf8'))}));
const topics=JSON.parse(fs.readFileSync('data/topics.json','utf8'));
const normalize=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const words=s=>new Set(normalize(s).split(' ').filter(x=>x.length>3));
const similarity=(a,b)=>{const A=words(a),B=words(b);return [...A].filter(w=>B.has(w)).length/Math.max(1,Math.min(A.size,B.size));};
const existing=[
 {slug:'prompty-chatgpt',intent:'Как правильно писать промпты в ChatGPT',title:'Как правильно писать промпты в ChatGPT: инструкция и 10 примеров'},
 {slug:'rezume-chatgpt',intent:'Как составить резюме через ChatGPT',title:'Как составить резюме через ChatGPT: готовый промпт и пошаговый разбор'},
 {slug:'tovar-chatgpt',intent:'Как написать описание товара через ChatGPT',title:'Как написать описание товара через ChatGPT: примеры для маркетплейсов'},
 ...topics.map(t=>({slug:t.id,intent:t.intent,title:t.title})),
 ...drafts.map(x=>({slug:x.data.slug,intent:x.data.intent,title:x.data.title}))
];
async function editorialReview(d){
 const key=process.env.OPENAI_API_KEY;
 if(!key)return {pass:false,reasons:['AI review unavailable: missing OPENAI_API_KEY']};
 const others=existing.filter(t=>t.slug!==d.slug);
 const instructions=[
 'Ты редактор русскоязычных практических инструкций по ИИ. Проведи строгую НЕЗАВИСИМУЮ ОТ ГЕНЕРАЦИИ модельную проверку.',
 'Ответ только JSON: {"pass": boolean, "reasons": string[], "duplicateOf": string|null, "needsExternalFactCheck": boolean}.',
 'pass=true ТОЛЬКО если статья решает запрос, показывает воспроизводимый конечный продукт, пример входных и выходных данных, применимые шаблоны и проверяемые шаги; поисковый интент не повторяется.',
 'Отклоняй бессодержательные советы, повторяющиеся пункты, выдуманные примеры использования и выдуманные свойства инструментов. Оцени: можно ли следовать инструкции без дополнительных догадок?',
 'Это медиа о прорывных возможностях ИИ. ОТКЛОНИ даже формально полезный материал, если он выглядит как обычная инструкция для новичков или пересказывает меню программы.',
 'Для материала типа frontier требуй конкретный технологический сдвиг, сравнение с обычным способом, яркий новостной крючок, насыщенный проект и честное разграничение официальных фактов и не проведённых автором тестов.',
 'Для заработка требуй честный сценарий реальной услуги и понятный план действий, но не обещание конкретного дохода.',
 'Если новая статья отвечает на ту же задачу другими словами, duplicateOf=slug и pass=false.',
 'Если есть сведения о текущих ценах, доступности, действующих интерфейсах, законодательстве, характеристиках продуктов, цифры/статистика или неподтвержденные источники, needsExternalFactCheck=true и pass=false.',
 'Модельная оценка НЕ является проверкой по первоисточникам. При сомнении pass=false. Не считай стилистическую оценку доказательством достоверности.',
 'Сравни с этими существующими поисковыми интентами: '+JSON.stringify(others),
 'Статья: '+JSON.stringify(d)
 ].join('\n');
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_REVIEW_MODEL||'gpt-4.1-mini',temperature:0,response_format:{type:'json_object'},messages:[{role:'user',content:instructions}]})});
 if(!response.ok)throw Error('Editor API HTTP '+response.status);
 const result=JSON.parse((await response.json()).choices?.[0]?.message?.content||'{}');
 if(typeof result.pass!=='boolean'||!Array.isArray(result.reasons)||typeof result.needsExternalFactCheck!=='boolean')throw Error('Invalid reviewer response');
 return result;
}
for(const {file,data:d} of drafts){
 if(d.reviewStatus!=='pending' && !(d.reviewStatus==='needs_review' && (d.reviewNotes||[]).some(x=>x.includes('missing OPENAI_API_KEY')||x.includes('AI editorial check unavailable'))))continue;
 const reasons=[];
 if(!d.slug||!d.intent||!d.title||!d.summary||!Array.isArray(d.steps)||d.steps.length<5||!Array.isArray(d.prompts)||d.prompts.length<3||!Array.isArray(d.faq)||d.faq.length<3)reasons.push('Incomplete article structure');
 if(JSON.stringify(d).length<3000)reasons.push('Not sufficiently detailed');
 if(similarity(d.title,d.intent)<.38)reasons.push('Title mismatch');
 if(new Set((d.steps||[]).map(s=>normalize(s.heading))).size!==(d.steps||[]).length)reasons.push('Repeated headings');
 if((d.prompts||[]).some(s=>String(s).length<35))reasons.push('Prompts lack concrete detail');
 if(d.category){
  reasons.push(...frontierDraftIssues(d));
  reasons.push(...practicalIssues(d));
  // Missing source verification blocks publication after editorial review.
 }
 const duplicateRisk=detectTopicCollisions(d,existing);
 if(duplicateRisk.length)reasons.push('Potential duplicate topic: '+duplicateRisk.map(x=>x.slug).join(', '));
 if(d.category){
  if(!d.result||!d.audience||!Array.isArray(d.inputs)||d.inputs.length<2)reasons.push('Missing audience, preparation or concrete result');
  if(!d.example?.input||!d.example?.output||String(d.example.output).length<80)reasons.push('Missing reproducible input and output example');
  if(!Array.isArray(d.checklist)||d.checklist.length<3)reasons.push('Missing practical verification checklist');
  if((d.steps||[]).some(s=>String(s.text||'').length<90))reasons.push('Instructions too generic');
  if((d.prompts||[]).some(s=>String(s).length<85))reasons.push('Prompt templates too shallow');
  if(!Array.isArray(d.limitations)||d.limitations.length===0)reasons.push('No limitations or relevant cautions');
 }
 const prior=drafts.find(x=>x.data.slug!==d.slug && x.data.reviewStatus==='approved' && (normalize(x.data.intent)===normalize(d.intent)||similarity(x.data.intent,d.intent)>.82));
 if(prior)reasons.push('Topic overlaps approved article '+prior.data.slug);
 let report={pass:false,reasons:[],needsExternalFactCheck:true};
 if(reasons.length===0){
  try{report=await editorialReview(d);}catch(e){reasons.push('AI editorial check unavailable: '+e.message);}
  if(report.pass!==true)reasons.push(...(report.reasons.length ? report.reasons : ['AI editor did not approve']));
  if(report.duplicateOf)reasons.push('Semantic duplicate: '+report.duplicateOf);
  if(report.needsExternalFactCheck)reasons.push('Unverified factual claims need source checking');
 }
 if(d.category)reasons.push(...sourceIssues(d));
 // Conservative rule: no independent source verification exists yet.
 // Model-only approval must never be represented as independently fact-checked.
 if (reasons.length===0) reasons.push('Requires source verification before publishing');
 d.reviewStatus='needs_review';
 d.reviewNotes=reasons.length?reasons:['Passed structure and model-based editorial review; external fact verification not performed'];
 d.reviewMethod='structure-and-ai-editor-v2';
 fs.writeFileSync(root+'/'+file,JSON.stringify(d,null,2)+'\n');
 console.log(d.slug+': '+d.reviewStatus+' — '+d.reviewNotes.join('; '));
}
