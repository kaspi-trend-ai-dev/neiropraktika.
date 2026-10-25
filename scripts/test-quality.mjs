import assert from 'node:assert/strict';
import {practicalIssues,sourceIssues,detectTopicCollisions} from './quality-rules.mjs';

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
