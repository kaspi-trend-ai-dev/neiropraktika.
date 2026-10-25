import assert from 'node:assert/strict';
import {practicalIssues,sourceIssues,detectTopicCollisions,articleContentHash} from './quality-rules.mjs';
import {editorialIdeaIssues,frontierDraftIssues} from './editorial-signal.mjs';
import fs from 'node:fs';

const sample={
 slug:'reels-from-review',intent:'Как создать Reels из отзыва покупателя',
 title:'Как создать Reels из отзыва покупателя: кадры и монтаж',
 category:'video',
 summary:'Превратите честный отзыв клиента в короткое видео и проверьте, что ни один факт не выдуман.',
 audience:'Продавцы и контент-менеджеры, работающие с отзывами покупателей',
 result:'Сценарий вертикального ролика из четырёх сцен с озвучкой, таймкодами и проверкой содержания.',
 inputs:['Отзыв покупателя, который разрешено использовать','Подтверждённые свойства товара и снятое видео'],
 steps:Array.from({length:5},(_,i)=>({heading:'Практический шаг '+(i+1),text:'Откройте исходные данные, выполните действие из сценария, проверьте фразу по отзыву и сохраните промежуточный результат: '.repeat(2)})),
 example:{input:'Учебный пример: покупатель отметил, что лампа включается одной кнопкой.',output:'0–3 секунды: крупный план кнопки; 3–9 секунд: действие с кнопкой; 9–19 секунд: использование лампы; 19–25 секунд: вывод без неподтверждённых обещаний.'},
 prompts:Array.from({length:3},(_,i)=>'Составь сценарий: задача [видео], реальный отзыв [текст], подтверждённые свойства [данные]. Формат: таймкод, кадр, текст. Не придумывай ничего. Пример '+i),
 checklist:['Смысл отзыва сохранён','Субтитры читаются','Никакие характеристики не выдуманы'],
 mistakes:['Кликбейт','Ложные свойства','Слишком много текста'],
 faq:Array.from({length:3},(_,i)=>({question:'Как проверить пункт '+i+'?',answer:'Сверьте текст отзыва с видео.'})),
 limitations:['Не выдавать демонстрационные кадры за кадры клиента.'],
 sources:[{title:'Официальная инструкция по инструменту',url:'https://example.com/docs'}],
 sourceAudit:{verified:false}
};
assert.deepEqual(practicalIssues(sample),[],'Complete example must pass structure checks');
assert.ok(sourceIssues(sample).includes('Source claims not independently verified'),'Links alone never prove accuracy');
const missing={...sample,example:{input:'Исходные данные',output:'очень коротко'}};
assert.ok(practicalIssues(missing).some(x=>x.includes('before/after')),'Missing workable example must be flagged');
const vague={...sample,steps:[...sample.steps.slice(0,4),{heading:'Последний шаг',text:'Используйте ИИ.'}]};
assert.ok(practicalIssues(vague).some(x=>x.includes('Vague')),'Vague steps must be flagged');
const overlap=detectTopicCollisions(sample,[{slug:'same-purpose',intent:'Как создать Reels из отзыва покупателя'},{slug:'excel',intent:'Как считать расходы в Excel'}]);
assert.deepEqual(overlap.map(x=>x.slug),['same-purpose'],'Identify exact duplicate but not unrelated task');
const honest={...sample,title:'Гарантированный заработок без затрат'};
assert.ok(practicalIssues(honest).some(x=>x.includes('guaranteed')),'Reject ungrounded income guarantees');
console.log('All quality checks passed');

const reviewed={...sample,sourceAudit:{verified:true,reviewer:'human',verifiedAt:'2026-10-25',reviewNotes:'Primary documentation inspected'}};
reviewed.sourceAudit.contentHash=articleContentHash(reviewed);
assert.deepEqual(sourceIssues(reviewed),[],'Matching reviewed draft fingerprint should pass structural source gate');
const changed={...reviewed,steps:[...reviewed.steps,{heading:'New unexpected claim',text:'An unexpected new claim has been inserted without review.'}]};
assert.ok(sourceIssues(changed).some(x=>x.includes('fingerprint mismatch')),'Any edit after review invalidates approval');
const changedSources={...reviewed,sources:[{title:'New unrelated documentation',url:'https://example.com/other'}]};
assert.ok(sourceIssues(changedSources).some(x=>x.includes('fingerprint mismatch')),'Source changes invalidate approval');
console.log('Review fingerprint tests passed');

const currentTopics=JSON.parse(fs.readFileSync('data/topics.json','utf8'));
assert.ok(currentTopics.length>=5,'Needs a meaningful frontier topic pipeline');
for(const t of currentTopics)assert.deepEqual(editorialIdeaIssues(t),[],t.id+' must have a strong, sourced frontier angle');
assert.ok(editorialIdeaIssues({title:'Как написать письмо через ChatGPT',category:'basic'}).length>0,'Reject beginner letters');
assert.ok(editorialIdeaIssues({title:'Как сделать субтитры в CapCut',category:'basic'}).length>0,'Reject low-novelty subtitle clicks');
const story=JSON.parse(fs.readFileSync('drafts/seedance25-video-story.json','utf8'));
assert.deepEqual(frontierDraftIssues(story),[],'Advanced story must describe novelty and proof boundaries');
const weak={...story,newsHook:'Просто откройте программу и нажмите кнопку'};
assert.ok(frontierDraftIssues(weak).some(x=>x.includes('news hook')),'Reject articles with banal news lead');
assert.deepEqual(practicalIssues(story),[],'New story should satisfy project and frontier content quality checks');
console.log('Frontier editorial signal tests passed');
