// 1회성 변환: 한 덩어리 script-data.js → works/<작품ID>/data/index.js + data/scenes/<씬ID>.js
// 사용: node tools/split.js [--work <작품ID>] <원본 파일 경로>
// 원본 파일은 수정하지 않으며, 변환 후 원본과 행 단위로 동일한지 검증한다.
const path = require('path');
const lib = require('./lib');

const args = process.argv.slice(2);
const workFlag = args.indexOf('--work');
let workId;
if (workFlag !== -1) workId = args.splice(workFlag, 2)[1];
const work = lib.useWork(workId);

const source = args[0];
if (!source) throw new Error('분리할 원본 script-data.js 경로를 지정하세요.');
const original = lib.loadJs(source, 'PROJECT_H_DATA');
if (!original) throw new Error('원본에서 PROJECT_H_DATA를 읽지 못했습니다.');

const rowsByScene = {};
original.rows.forEach((row) => { (rowsByScene[row.sceneId] ||= []).push(lib.slimRow(row)); });

const index = {
  meta: { ...original.meta, format: 2, sourceFile: original.meta.source },
  speakers: original.speakers,
  scenes: original.scenes.map((scene) => ({
    id: scene.id, type: scene.type, detail: scene.detail, count: scene.count,
    stats: { korean: 0, voice: 0, script: 0 },
    phases: scene.phases.map((phase) => ({ id: phase.id, name: phase.name, detail: phase.detail, count: phase.count })),
  })),
};

index.scenes.forEach((scene) => lib.writeSceneRows(scene.id, rowsByScene[scene.id]));
lib.writeIndex(index, rowsByScene);

// ---- 검증: 새 구조에서 복원한 전체 행이 원본과 완전히 같은지 ----
const reloaded = lib.loadIndex();
const rebuilt = [];
reloaded.scenes.forEach((scene) => lib.loadSceneRows(scene.id).forEach((row) => rebuilt.push(lib.fullRow(scene, row))));
const sortKey = (row) => row.rowNumber;
rebuilt.sort((a, b) => sortKey(a) - sortKey(b));
const keys = Object.keys(original.rows[0]);
let mismatches = 0;
original.rows.forEach((row, i) => {
  const other = rebuilt[i];
  if (!other || keys.some((key) => row[key] !== other[key])) mismatches += 1;
});
const result = {
  rowsOriginal: original.rows.length,
  rowsRebuilt: rebuilt.length,
  mismatchedRows: mismatches,
  scenesWritten: reloaded.scenes.length,
  metaVoiceChecked: [original.meta.voiceCheckedCount, reloaded.meta.voiceCheckedCount],
  metaRecordingScript: [original.meta.recordingScriptCount, reloaded.meta.recordingScriptCount],
  phaseCountsMatch: reloaded.scenes.every((scene, i) => JSON.stringify(scene.phases) === JSON.stringify(original.scenes[i].phases)),
  speakersMatch: JSON.stringify(reloaded.speakers) === JSON.stringify(original.speakers),
};
console.log(JSON.stringify(result, null, 1));
if (mismatches || result.rowsOriginal !== result.rowsRebuilt) process.exit(1);
