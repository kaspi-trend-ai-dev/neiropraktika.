import fs from 'node:fs';
import {practicalIssues,sourceIssues,detectTopicCollisions} from './quality-rules.mjs';

const slugs=['chatgpt-kartinki','shorts-interview-ai','freelance-ai-portfolio'];
const items=slugs.map(slug=>JSON.parse(fs.readFileSync('drafts/'+slug+'.json','utf8')));
const all=fs.readdirSync('drafts').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync('drafts/'+f,'utf8')));
const manifest=JSON.parse(fs.readFileSync('articles.json','utf8'));
const results=items.map(d=>{
 const practical=practicalIssues(d);
 const sources=sourceIssues(d);
 const matches=detectTopicCollisions(d,all).map(x=>x.slug);
 const published=manifest.some(x=>x.href==='./articles/'+d.slug+'.html');
 const exists=fs.existsSync('articles/'+d.slug+'.html');
 const outcome={
  title:d.title,
  status:d.reviewStatus,
  hasWorkedExample:!!d.example?.input&&!!d.example?.output,
  checklistItems:d.checklist?.length||0,
  readyToPublish:practical.length===0&&sources.length===0&&matches.length===0&&d.reviewStatus==='approved',
  actuallyPublished:published&&exists
 };
 const issues=[...practical,...sources,...matches.map(x=>'Possible topic overlap with '+x)];
 if(published&&!exists)issues.push('Manifest points to a missing article page');
 if(!published&&exists)issues.push('Unapproved or unlisted public page exists');
 if(d.reviewStatus==='needs_review'&&(published||exists))issues.push('DANGER: pending editorial article is publicly exposed');
 return {slug:d.slug,...outcome,issues};
});
const report={
 description:'Offline pilot-readiness audit of three hands-on tutorials; DOES NOT verify online source claims or grant publication approval',
 generatedAt:new Date().toISOString(),
 threeDrafts:results.length,
 ready:results.filter(x=>x.readyToPublish).length,
 held:results.filter(x=>!x.readyToPublish).length,
 results
};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/pilot-three.json',JSON.stringify(report,null,2)+'\n');
for(const r of results)console.log(r.slug+': '+(r.actuallyPublished?'on site':'unpublished')+', '+(r.readyToPublish?'ready':'held')+'; '+r.issues.join('; '));
if(results.some(x=>x.issues.some(i=>i.includes('DANGER'))))process.exitCode=1;
console.log('Pilot report: '+report.ready+' fully ready; '+report.held+' held.');
