import fs from 'node:fs';
const normalize=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const tokenSet=s=>new Set(normalize(s).split(' ').filter(t=>t.length>3));
const sim=(a,b)=>{const A=tokenSet(a),B=tokenSet(b);return [...A].filter(t=>B.has(t)).length/Math.max(1,Math.min(A.size,B.size));};
const files=fs.readdirSync('drafts').filter(x=>x.endsWith('.json'));
const docs=files.map(f=>JSON.parse(fs.readFileSync('drafts/'+f,'utf8')));
const results=[];
for(const d of docs) {
 const text=[d.summary,...(d.steps||[]).map(x=>x.text),...(d.faq||[]).map(x=>x.answer)].join(' ');
 const issues=[];
 const citations=Array.isArray(d.sources)?d.sources:[];
 if(!citations.length)issues.push('No primary source links');
 for(const s of citations) {
   try{const u=new URL(s.url);if(u.protocol!=='https:'||!s.title||!u.hostname)issues.push('Invalid cited source');}
   catch{issues.push('Invalid cited source');}
 }
 if(/не (?:может|умеет|поддерживает|обрабатывает|генерирует)/i.test(text)) issues.push('Product limitation claim requires primary source verification');
 if(/всегда|гарантированно|абсолютно|никогда|100%/i.test(text))issues.push('Absolute claim should be scrutinized');
 const duplicates=docs.filter(x=>x.slug!==d.slug&&sim(x.intent,d.intent)>.82).map(x=>x.slug);
 if(duplicates.length)issues.push('Potential duplicated intent: '+duplicates.join(', '));
 if(!Array.isArray(d.prompts)||d.prompts.length<3)issues.push('Insufficient ready-to-use examples');
 results.push({slug:d.slug,status:d.reviewStatus,issues,sourceCount:citations.length,manualSourceVerified:d.sourceAudit?.verified===true&&d.sourceAudit?.reviewer==='human'});
}
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/content-audit.json',JSON.stringify({auditMethod:'static risk screening; NOT independent factual verification',results},null,2)+'\n');
console.log('Audited',results.length,'draft records;',results.filter(x=>x.issues.length).length,'flagged.');
for(const r of results) if(r.issues.length)console.log(r.slug+': '+r.issues.join('; '));
