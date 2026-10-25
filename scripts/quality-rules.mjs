// Common offline content checks. These checks identify risk, not factual truth.
export const normalize = value => String(value ?? '').toLowerCase().replace(/ё/g,'е')
  .replace(/[^a-zа-я0-9]+/g,' ').trim();
const stop = new Set('как для через помощью сделать создать писать написать использовать правильно помощью инструкция пример примеры готовый готовые чат chatgpt gpt ии ai нейросети нейросеть'.split(' '));
export const tokens = value => new Set(normalize(value).split(' ').filter(x=>x.length>2&&!stop.has(x)));
export const overlap = (a,b) => {
 const A=tokens(a),B=tokens(b);
 if(!A.size||!B.size)return 0;
 const common=[...A].filter(x=>B.has(x)).length;
 return common/Math.min(A.size,B.size);
};
export const detectTopicCollisions=(topic, others=[])=>{
 const hits=[];
 for(const other of others){
  if(other.slug===topic.slug || other.id===topic.slug)continue;
  const a=normalize(topic.intent||topic.title),b=normalize(other.intent||other.title);
  if(a===b || (a.length>17&&b.length>17&&(a.includes(b)||b.includes(a)))){
   hits.push({slug:other.slug||other.id,reason:'same search intent'});continue;
  }
  // Deliberately conservative: a shared generic keyword alone is not a duplicate.
  if(overlap(a,b)>=0.9 && tokens(a).size>=3 && tokens(b).size>=3){
   hits.push({slug:other.slug||other.id,reason:'high intent overlap'});
  }
 }
 return hits;
};
const tooVague = /^(?:используйте ии|используйте chatgpt|попросите нейросеть|добавьте детали|проанализируйте результат)[.! ]*$/i;
export function practicalIssues(d){
 const errors=[];
 if(!d||typeof d!=='object')return ['Invalid article object'];
 if(!d.title||!d.intent||!d.slug)errors.push('Missing title, search intent or slug');
 if(!d.result||String(d.result).length<45)errors.push('No concrete expected deliverable');
 if(!d.audience||String(d.audience).length<15)errors.push('No defined audience');
 if(!Array.isArray(d.inputs)||d.inputs.length<2)errors.push('Missing preparation or inputs');
 if(!Array.isArray(d.steps)||d.steps.length<5)errors.push('Fewer than 5 tutorial steps');
 if((d.steps||[]).some(x=>!x.heading||!x.text||x.text.length<90||tooVague.test(x.text.trim())))errors.push('Vague or incomplete steps');
 const headings=(d.steps||[]).map(x=>normalize(x.heading));
 if(new Set(headings).size!==headings.length)errors.push('Repeated step headings');
 if(!d.example?.input || !d.example?.output || String(d.example.output).length<90)errors.push('No reproducible before/after example');
 if(!Array.isArray(d.prompts)||d.prompts.length<3||d.prompts.some(x=>typeof x!=='string'||x.length<85))errors.push('Not enough reusable prompts');
 if(!Array.isArray(d.checklist)||d.checklist.length<3)errors.push('No quality check for reader');
 if(!Array.isArray(d.mistakes)||d.mistakes.length<3)errors.push('No common mistakes to avoid');
 if(!Array.isArray(d.faq)||d.faq.length<3)errors.push('Not enough answers to follow-up questions');
 if(!Array.isArray(d.limitations)||d.limitations.length===0)errors.push('No limitations or cautions');
 if(/гарантированн(?:ый|о)|100% доход|заработаете \d+|в \d+ раза быстрее/i.test([d.title,d.summary,d.result].join(' ')))errors.push('Unsupported guaranteed outcome');
 return [...new Set(errors)];
}
export function sourceIssues(d){
 const errors=[], sources=Array.isArray(d.sources)?d.sources:[];
 if(!sources.length)errors.push('No cited official documentation');
 for(const s of sources){
  try{
   const url=new URL(s.url);
   if(url.protocol!=='https:'||!s.title||s.title.length<8)errors.push('Invalid or unnamed source');
  }catch{errors.push('Invalid source URL');}
 }
 // A link alone does not demonstrate that its content supports the article.
 if(!(d.sourceAudit?.verified===true && d.sourceAudit?.reviewer==='human'))
  errors.push('Source claims not independently verified');
 return [...new Set(errors)];
}
