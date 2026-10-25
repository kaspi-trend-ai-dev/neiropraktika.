import {createHash} from 'node:crypto';

export const OFFICIAL_HOSTS=new Set([
 'help.openai.com','openai.com','www.openai.com',
 'www.capcut.com','capcut.com',
 'help.canva.com','www.canva.com',
 'helpx.adobe.com','support.google.com','developers.google.com',
 'docs.github.com','support.microsoft.com','help.instagram.com'
]);
export function isOfficialUrl(raw){
 try{
  const u=new URL(raw);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&OFFICIAL_HOSTS.has(u.hostname.toLowerCase());
 }catch{return false;}
}
export const normalizedText=x=>String(x||'').replace(/\s+/g,' ').normalize('NFC').trim().toLowerCase();
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',hellip:'…',mdash:'—',ndash:'–',laquo:'«',raquo:'»'};
export function htmlToText(html){
 if(typeof html!=='string')return '';
 const decoded=html
  .replace(/<(script|style|noscript|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ')
  .replace(/<!--[\s\S]*?-->/g,' ')
  .replace(/<\/?(?:p|h[1-6]|li|section|article|main|div|tr|ul|ol|br)\b[^>]*>/gi,'\n')
  .replace(/<[^>]*>/g,' ')
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(_,e)=>{
    if(e[0]==='#'){
      const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);
      return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):' ';
    }
    return entities[e.toLowerCase()]||' ';
  })
  .replace(/[ \t]+/g,' ')
  .replace(/\n\s*\n+/g,'\n')
  .trim();
 return decoded.slice(0,75000);
}
export function quoteAppearsInSource(quote, source){
 const q=normalizedText(quote),s=normalizedText(source);
 return q.length>=26&&q.length<=380&&s.includes(q);
}
export const sha256=value=>createHash('sha256').update(String(value)).digest('hex');
export async function retrieveOfficialSource(raw){
 if(!isOfficialUrl(raw))throw Error('URL is not an approved official HTTPS documentation host');
 let current=raw;
 for(let redirect=0;redirect<4;redirect++){
  if(!isOfficialUrl(current))throw Error('Redirect left approved documentation hosts');
  const response=await fetch(current,{
    redirect:'manual',signal:AbortSignal.timeout(16000),
    headers:{'User-Agent':'NeiroPraktikaEditorialVerifier/1.0','Accept':'text/html, text/plain'}
  });
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');
   if(!location)throw Error('Redirect without Location');
   current=new URL(location,current).href;continue;
  }
  if(!response.ok)throw Error('Source HTTP '+response.status);
  const contentType=response.headers.get('content-type')||'';
  if(!/text\/html|text\/plain/.test(contentType))throw Error('Source is not HTML/text');
  if(Number(response.headers.get('content-length')||0)>1200000)throw Error('Source too large');
  const body=await response.text();
  if(body.length>1200000)throw Error('Source body too large');
  const txt=contentType.includes('text/html')?htmlToText(body):body;
  if(txt.length<450)throw Error('Source contains too little readable documentation');
  return {url:current,text:txt.slice(0,25000),sha256:sha256(txt)};
 }
 throw Error('Too many redirects');
}
export function validateFactJudgments(units,claims,sources){
 if(!Array.isArray(claims))return {status:'blocked',issues:['Missing judgments'],checks:[]};
 const expected=new Set(units.map(x=>x.id)),seen=new Set(),checks=[],issues=[];
 for(const c of claims){
  if(!c||typeof c.id!=='string'||!expected.has(c.id)||seen.has(c.id)){
   issues.push('Unexpected, repeated or missing content block');continue;
  }
  seen.add(c.id);
  const verdict=c.verdict;
  const index=c.sourceIndex;
  const evidence=typeof c.quote==='string'?c.quote:'';
  const source=Number.isInteger(index)?sources[index]:undefined;
  const supported=verdict==='supported'&&source&&quoteAppearsInSource(evidence,source.text);
  if(!['supported','instructional','unsupported','contradicted'].includes(verdict)){
   issues.push('Unrecognized verdict for '+c.id);
  }else if(verdict==='supported'&&!supported){
   issues.push('Evidence quote not found in official source for '+c.id);
  }else if(verdict==='unsupported'||verdict==='contradicted'){
   issues.push('Source verification failed for '+c.id+': '+verdict);
  }
  checks.push({
   id:c.id,verdict:supported?'supported':verdict==='supported'?'unsupported':verdict,
   claim:String(c.claim||'').slice(0,400),
   note:String(c.note||'').slice(0,500),
   sourceUrl:supported?source.url:null,
   quote:supported?evidence:null
  });
 }
 for(const id of expected)if(!seen.has(id))issues.push('No verification for '+id);
 if(!checks.some(x=>x.verdict==='supported'))issues.push('No product capability claim backed by checked source quotation');
 return {status:issues.length?'blocked':'candidate_for_human_review',issues:[...new Set(issues)],checks};
}
