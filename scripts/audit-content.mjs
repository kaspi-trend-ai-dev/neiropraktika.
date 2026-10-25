import fs from 'node:fs';
import {practicalIssues,sourceIssues,detectTopicCollisions} from './quality-rules.mjs';

const drafts=fs.readdirSync('drafts').filter(x=>x.endsWith('.json')).sort()
 .map(f=>JSON.parse(fs.readFileSync('drafts/'+f,'utf8')));
const staticPages=[
 {slug:'prompty-chatgpt',title:'Как правильно писать промпты в ChatGPT',intent:'Как правильно писать промпты в ChatGPT'},
 {slug:'rezume-chatgpt',title:'Как составить резюме с ChatGPT',intent:'Как составить резюме с ChatGPT'},
 {slug:'tovar-chatgpt',title:'Как написать описание товара через ChatGPT',intent:'Как написать описание товара через ChatGPT'}
];
const known=[...staticPages,...drafts];
const results=[];
for(const d of drafts){
 const issues=[];
 if(!d.category){
  issues.push('Legacy generic article: consider adding a reproducible example and result');
 } else {
  issues.push(...practicalIssues(d));
 }
 issues.push(...sourceIssues(d));
 const duplicates=detectTopicCollisions(d,known);
 if(duplicates.length)issues.push('Possible same search intent: '+duplicates.map(x=>x.slug).join(', '));
 const text=[d.summary,...(d.steps||[]).map(x=>x.text),...(d.faq||[]).map(x=>x.answer)].join(' ');
 if(/chatgpt не (?:умеет|может|генерирует) изображения(?: напрямую)?/i.test(text))issues.push('Known incorrect limitation: images in ChatGPT');
 if(/chatgpt не (?:умеет|может|обрабатывает) (?:загруженные )?файлы(?: напрямую)?/i.test(text))issues.push('Known incorrect limitation: file analysis in ChatGPT');
 if(/(?:гарантированно|абсолютно|никогда|100% доход)/i.test(text))issues.push('Absolute or guaranteed claim needs evidence');
 results.push({
  slug:d.slug,title:d.title,
  publicationStatus:d.reviewStatus,
  verificationStatus:d.sourceAudit?.verified===true&&d.sourceAudit?.reviewer==='human'?'manual-check-recorded':'independent-check-not-recorded',
  issueCount:[...new Set(issues)].length,
  issues:[...new Set(issues)]
 });
}
for(const d of staticPages){
 const file=d.slug+'.html';
 results.push({slug:d.slug,title:d.title,publicationStatus:fs.existsSync(file)?'published-static':'missing',
  verificationStatus:'independent-check-not-recorded',issueCount:1,
  issues:['Original static tutorial: requires primary-source and hands-on review']});
}
const flagged=results.filter(x=>x.issueCount>0);
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/content-audit.json',JSON.stringify({
 description:'Content risk audit. It does not independently establish factual correctness.',
 articlesChecked:results.length,
 flaggedCount:flagged.length,
 results
},null,2)+'\n');
console.log('Checked:',results.length,'Flagged:',flagged.length);
for(const result of flagged)console.log(result.slug+': '+result.issues.join('; '));
