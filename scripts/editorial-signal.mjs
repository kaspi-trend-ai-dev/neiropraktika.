// Gate future editorial ideas BEFORE calling a text-generation model.
// This is a relevance heuristic, not a claim that the official source has been verified.
const dullPatterns=[
 /как (?:написать|сделать|составить) (?:письмо|план дня|пост|резюме)/i,
 /как (?:включить|добавить) субтитр/i,
 /(?:основы|для начинающих) chatgpt/i,
 /(?:\\d+ способов|полезные советы|лучшие промпты) (?:использования|для) chatgpt/i
];
export function editorialIdeaIssues(topic){
 const errors=[];
 if(!topic?.category?.startsWith('frontier-'))errors.push('A new article must be about frontier AI, not basic tutorials');
 if(!topic?.novelty||topic.novelty.length<65)errors.push('No concrete, distinctive new capability');
 if(!topic?.goal||topic.goal.length<55)errors.push('No substantial experiment or specific challenge');
 if(!topic?.deliverable||topic.deliverable.length<50)errors.push('No meaningful demonstrable output');
 if(!topic?.primary || !/^https:\/\//.test(topic.primary))errors.push('No trusted primary-source URL to check');
 if(!topic?.format||!topic?.impact)errors.push('Missing editorial article format or impact');
 if(dullPatterns.some(re=>re.test(topic.title||'')||re.test(topic.intent||'')))errors.push('Basic, low-novelty tutorial forbidden in new queue');
 return errors;
}
export function frontierDraftIssues(draft){
 if(!draft?.category?.startsWith('frontier-'))return[];
 const errors=[];
 if(!draft.newsHook || draft.newsHook.length<100)errors.push('Missing actual news hook and what changed');
 if(!draft.breakthrough || draft.breakthrough.length<110)errors.push('Missing contrast against the previous/ordinary workflow');
 if(!draft.proofBoundary || draft.proofBoundary.length<100)errors.push('Missing stated-vs-tested evidence boundary');
 if(!draft.sources?.length)errors.push('No primary documentation');
 return errors;
}
