import fs from 'node:fs';
import {articleContentHash, practicalIssues, sourceIssues, detectTopicCollisions} from './quality-rules.mjs';
import {isOfficialUrl} from './fact-check-utils.mjs';

const slug=process.env.REVIEWED_SLUG;
const actor=process.env.GITHUB_ACTOR || '';
const attestation=String(process.env.REVIEW_ATTESTATION || '').trim();
if(process.env.GITHUB_EVENT_NAME!=='workflow_dispatch') throw Error('Approval must be explicitly initiated by a human from GitHub Actions');
if(slug!=='capcut-subtitles-reels') throw Error('This approval pilot is limited to the verified CapCut article');
if(attestation!=='ПРОВЕРЕНО') throw Error('The reviewer must personally confirm by entering ПРОВЕРЕНО');
if(!actor || /\[bot\]$|github-actions/i.test(actor)) throw Error('A human GitHub account must initiate the approval');
const filename='drafts/'+slug+'.json';
const draft=JSON.parse(fs.readFileSync(filename,'utf8'));
const report=JSON.parse(fs.readFileSync('reports/fact-check.json','utf8'));
const row=report.results?.find(x=>x.slug===slug);
if(draft.reviewStatus!=='needs_review') throw Error('Expected an unapproved draft');
if(!row || row.verdict!=='candidate_for_human_review' || row.issues?.length) throw Error('The current fact report does not approve this as a review candidate');
if(row.contentHash!==articleContentHash(draft)) throw Error('The article changed after the evidence audit: rerun verification first');
if(!report.checkedAt || !Number.isFinite(Date.parse(report.checkedAt))) throw Error('Missing fact-check timestamp');
const age=Date.now()-Date.parse(report.checkedAt);
if(age<0 || age>48*60*60*1000) throw Error('The evidence audit is over 48 hours old; rerun it');
if(!row.sources?.length || row.sources.some(x=>!x.loaded || x.mode!=='live_official_page'||!isOfficialUrl(x.url))) throw Error('All official sources must be accessible and loaded live');
if(!row.checks?.some(x=>x.verdict==='supported'&&x.sourceUrl&&x.quote)) throw Error('No auditable direct evidence in report');
const structural=practicalIssues(draft);
if(structural.length) throw Error('Article structure errors: '+structural.join('; '));
const all=fs.readdirSync('drafts').filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync('drafts/'+x,'utf8')));
const duplicates=detectTopicCollisions(draft,all);
if(duplicates.length) throw Error('Possible duplicate topic: '+duplicates.map(x=>x.slug).join(', '));
draft.reviewStatus='approved';
draft.reviewMethod='human-github-attestation-with-official-evidence-v1';
draft.reviewNotes=[...(draft.reviewNotes||[]),'GitHub reviewer @'+actor+' personally attested to reviewing the final copy and official sources. This is not proof of running the tutorial in the app.'];
draft.sourceAudit={
 verified:true,
 reviewer:'human',
 verifiedBy:actor,
 verifiedAt:new Date().toISOString(),
 reviewNotes:'Human attestation in GitHub Actions; factual evidence in reports/fact-check.json and verified official CapCut page. The worked example is fictional.',
 evidenceCheckedAt:report.checkedAt,
 contentHash:articleContentHash(draft)
};
const finalIssues=sourceIssues(draft);
if(finalIssues.length) throw Error('Approval is invalid: '+finalIssues.join('; '));
fs.writeFileSync(filename,JSON.stringify(draft,null,2)+'\n');
console.log('Approved: '+slug+' by GitHub reviewer @'+actor);
console.log('Content hash: '+draft.sourceAudit.contentHash);
