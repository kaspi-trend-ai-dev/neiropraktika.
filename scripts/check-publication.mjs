import fs from 'node:fs';
import path from 'node:path';
import {practicalIssues,sourceIssues,detectTopicCollisions} from './quality-rules.mjs';

const allowedLegacy = new Set([
 'chatgpt-excel','chatgpt-kartinki','chatgpt-perevod',
 'chatgpt-pismo','chatgpt-plan','chatgpt-ucheba'
]);
const errors=[];
const fail=s=>errors.push(s);
const drafts=fs.readdirSync('drafts').filter(x=>x.endsWith('.json')).map(x=>{
 const doc=JSON.parse(fs.readFileSync('drafts/'+x,'utf8'));
 if(x!==doc.slug+'.json')fail('Draft slug mismatch: '+x);
 return doc;
});
const bySlug=new Map(drafts.map(d=>[d.slug,d]));
if(bySlug.size!==drafts.length)fail('Duplicate draft slug');
const approved=drafts.filter(d=>d.reviewStatus==='approved');
const approvedSafe=new Set();
for(const d of approved){
 if(!allowedLegacy.has(d.slug)){
  const blockers=[...practicalIssues(d),...sourceIssues(d)];
  const overlaps=detectTopicCollisions(d,drafts);
  if(overlaps.length)blockers.push('Overlapping intent with '+overlaps.map(x=>x.slug).join(', '));
  if(blockers.length)fail('Unsafe approved article '+d.slug+': '+blockers.join('; '));
  else approvedSafe.add(d.slug);
 }else{
  approvedSafe.add(d.slug);
 }
}
const manifest=JSON.parse(fs.readFileSync('articles.json','utf8'));
if(!Array.isArray(manifest))fail('articles.json must be an array');
const slugs=new Set();
for(const item of Array.isArray(manifest)?manifest:[]){
 const match=/^\.\/articles\/([a-z0-9-]+)\.html$/.exec(item.href||'');
 if(!match){fail('Invalid article URL in manifest');continue;}
 const slug=match[1];
 if(slugs.has(slug))fail('Duplicate article in manifest: '+slug);
 slugs.add(slug);
 if(!approvedSafe.has(slug))fail('Unreviewed article in manifest: '+slug);
 if(item.title!==bySlug.get(slug)?.title)fail('Manifest title mismatch: '+slug);
 if(!fs.existsSync('articles/'+slug+'.html'))fail('Missing HTML: '+slug);
}
if(fs.existsSync('articles')){
 for(const file of fs.readdirSync('articles').filter(x=>x.endsWith('.html'))){
  const slug=path.basename(file,'.html');
  if(!approvedSafe.has(slug))fail('Unapproved article exists in public directory: '+slug);
  if(!slugs.has(slug))fail('Unlisted public HTML page: '+slug);
  const html=fs.readFileSync('articles/'+file,'utf8');
  if(!html.includes('<h1>')||!html.includes('<title>'))fail('Page missing basic content: '+slug);
  if(/ChatGPT не генерирует изображения напрямую|ChatGPT не обрабатывает файлы напрямую/i.test(html))
    fail('Known false capability claim in page: '+slug);
 }
}
for(const slug of approvedSafe)if(!slugs.has(slug))fail('Approved article missing from manifest: '+slug);
for(const staticFile of ['index.html','prompty-chatgpt.html','rezume-chatgpt.html','tovar-chatgpt.html','style.css'])
 if(!fs.existsSync(staticFile))fail('Missing required site file: '+staticFile);
if(errors.length){
 for(const e of errors)console.error('PUBLICATION BLOCKED:',e);
 process.exit(1);
}
console.log('Publication gate passed: '+approvedSafe.size+' reviewed articles in manifest. Legacy articles still need independent review.');
