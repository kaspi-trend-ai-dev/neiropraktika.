import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const run=(overrides={})=>spawnSync(process.execPath,['scripts/approve-reviewed.mjs'],{
 encoding:'utf8',
 env:{...process.env,GITHUB_EVENT_NAME:'workflow_dispatch',REVIEWED_SLUG:'capcut-subtitles-reels',
  GITHUB_ACTOR:'sample-human-reviewer',REVIEW_ATTESTATION:'',...overrides}
});
const absent=run();
assert.notEqual(absent.status,0);
assert.match(absent.stderr,/personally confirm/);
const bot=run({REVIEW_ATTESTATION:'ПРОВЕРЕНО',GITHUB_ACTOR:'github-actions[bot]'});
assert.notEqual(bot.status,0);
assert.match(bot.stderr,/human GitHub account/);
const automated=run({REVIEW_ATTESTATION:'ПРОВЕРЕНО',GITHUB_EVENT_NAME:'push'});
assert.notEqual(automated.status,0);
assert.match(automated.stderr,/explicitly initiated/);
const invalidSlug=run({REVIEW_ATTESTATION:'ПРОВЕРЕНО',REVIEWED_SLUG:'arbitrary-article'});
assert.notEqual(invalidSlug.status,0);
assert.match(invalidSlug.stderr,/limited to the verified CapCut/);
console.log('Editorial-approval fail-closed safeguards passed');
