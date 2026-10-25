import fs from 'node:fs';
const normalize=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]+/g,' ').trim();
const terms=s=>new Set(normalize(s).split(' ').filter(w=>w.length>3));
const similar=(a,b)=>{let A=terms(a),B=terms(b);return [...A].filter(w=>B.has(w)).length/Math.max(1,Math.min(A.size,B.size));};
const root='drafts';
const names=fs.readdirSync(root).filter(f=>f.endsWith('.json')).sort();
const approved=[];
let changed=0;
for(const name of names){
 const loc=root+'/'+name;
 const d=JSON.parse(fs.readFileSync(loc,'utf8'));
 if(d.reviewStatus!=='pending') {if(d.reviewStatus==='approved')approved.push(d);continue;}
 const reasons=[];
 if(!d.title||!d.summary||!Array.isArray(d.steps)||d.steps.length<5||!Array.isArray(d.prompts)||d.prompts.length<3||!Array.isArray(d.faq)||d.faq.length<3)reasons.push('Incomplete structure');
 const headings=(d.steps||[]).map(x=>x.heading).join(' ');
 const allText=JSON.stringify(d);
 if(allText.length<3000)reasons.push('Insufficient detail');
 if(similar(d.title,d.intent)<.38)reasons.push('Title does not match intent');
 if(new Set((d.steps||[]).map(x=>normalize(x.heading))).size!==(d.steps||[]).length)reasons.push('Repeated headings');
 if((d.prompts||[]).some(p=>String(p).length<35))reasons.push('Prompts too brief');
 const other=approved.find(a=>normalize(a.intent)===normalize(d.intent)||similar(a.intent,d.intent)>.8);
 if(other)reasons.push('Duplicate of approved topic '+other.slug);
 if(reasons.length){d.reviewStatus='needs_review';d.reviewNotes=reasons;}
 else {d.reviewStatus='approved';d.reviewNotes=['Passed structural and overlap checks; factual accuracy not independently verified'];approved.push(d);}
 fs.writeFileSync(loc,JSON.stringify(d,null,2)+'\n');changed++;
 console.log(d.slug+': '+d.reviewStatus+(reasons.length?' '+reasons.join('; '):''));
}
console.log('Reviewed:',changed);
