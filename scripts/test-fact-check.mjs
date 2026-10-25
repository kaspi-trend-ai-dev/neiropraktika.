import assert from 'node:assert/strict';
import {isOfficialUrl,htmlToText,quoteAppearsInSource,validateFactJudgments,sourceSegments} from './fact-check-utils.mjs';

assert.equal(isOfficialUrl('https://help.openai.com/ru-ru/articles/9260256-chatgpt-capabilities-overview'),true);
assert.equal(isOfficialUrl('http://help.openai.com/anything'),false);
assert.equal(isOfficialUrl('https://evil.example.com/help.openai.com'),false);
assert.equal(isOfficialUrl('https://help.openai.com.evil.example/anything'),false);
assert.equal(isOfficialUrl('https://localhost/'),false);
const page='<html><body><nav>MENU</nav><main><h1>Data analysis</h1><p>ChatGPT can analyze uploaded spreadsheets and create charts.</p></main><script>ignore this</script></body></html>';
const text=htmlToText(page);
assert.ok(text.includes('ChatGPT can analyze uploaded spreadsheets'));
assert.ok(!text.includes('ignore this'));
assert.ok(!text.includes('MENU'));
const quote='ChatGPT can analyze uploaded spreadsheets and create charts.';
assert.equal(quoteAppearsInSource(quote,text),true);
assert.equal(quoteAppearsInSource('ChatGPT can never analyze uploaded spreadsheets.',text),false);
assert.equal(quoteAppearsInSource('tiny',text),false);
const units=[{id:'summary',text:'ChatGPT supports data analysis'}];
const sources=[{url:'https://help.openai.com/en/articles/example',text}];
const correct=validateFactJudgments(units,[{id:'summary',verdict:'supported',claim:'Can analyze files',sourceIndex:0,quote}],sources);
assert.equal(correct.status,'candidate_for_human_review');
assert.equal(correct.checks[0].sourceUrl,sources[0].url);
const fabricated=validateFactJudgments(units,[{id:'summary',verdict:'supported',sourceIndex:0,quote:'ChatGPT can never analyze uploaded spreadsheets.'}],sources);
assert.equal(fabricated.status,'blocked');
assert.equal(fabricated.checks[0].verdict,'unsupported');
const missing=validateFactJudgments(units,[],sources);
assert.equal(missing.status,'blocked');
const contradicted=validateFactJudgments(units,[{id:'summary',verdict:'contradicted',claim:'False claim',sourceIndex:0}],sources);
assert.equal(contradicted.status,'blocked');
const unsupported=validateFactJudgments(units,[{id:'summary',verdict:'unsupported',claim:'Unproven feature'}],sources);
assert.equal(unsupported.status,'blocked');
console.log('Fact audit safety tests passed — including invented evidence and absent claims');

const passages=sourceSegments(text);
const phraseIndex=passages.findIndex(s=>s.includes('ChatGPT can analyze uploaded spreadsheets'));
assert.ok(phraseIndex>=0,'Actual source paragraph should be indexable');
const grounded=validateFactJudgments(units,[{
 id:'summary',verdict:'supported',claim:'Can analyze files',
 sourceIndex:0,passageIndex:phraseIndex,note:'Supported directly'
}],sources);
assert.equal(grounded.status,'candidate_for_human_review','Exact source paragraphs should be accepted without AI copying quote');
assert.ok(grounded.checks[0].quote.includes('ChatGPT can analyze uploaded spreadsheets'),'Grounded quote must come directly from source');
const inventedPassage=validateFactJudgments(units,[{
 id:'summary',verdict:'supported',claim:'False claim',sourceIndex:0,passageIndex:900000
}],sources);
assert.equal(inventedPassage.status,'blocked','Invented passage index must not be accepted');
console.log('Source paragraph citation tests passed');
