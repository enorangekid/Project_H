#!/usr/bin/env node
// 🚩 검수 표시 관리. 페이지(폰 포함)에서 이상한 줄에 남긴 표시·메모를 모으고, 고친 뒤 표시를 지우는 도구다.
//
//   node tools/review.js [--work 작품ID] list [<씬ID>] [--count]        표시된 줄 목록 (JSON 한 줄씩, 페이지의 `🚩 검수 목록`과 같은 형식). --count 는 씬별 개수만
//   node tools/review.js [--work 작품ID] import <파일 | ->               페이지에서 복사한 목록(JSON)을 데이터 파일에 반영 (- 는 표준입력) [--note "사유"] [--dry]
//   node tools/review.js [--work 작품ID] resolve <씬ID> (--ids ID,ID… | --rows 22-30,35 | --all) [--note "사유"] [--dry]
//                                                                       고친 줄의 표시를 지움 (수정 전 값·표시는 변경 기록에 남음)
//
//   - 표시는 행의 review 필드다. 비어 있으면 정상, 글자가 있으면 검수 표시 + 메모("검수 필요" 는 메모 없이 표시만 한 것).
//   - 줄 내용을 고치는 일은 tools/scene.js set 으로 한다 (review 필드도 같이 지울 수 있다). 모든 변경은 변경 기록에 남아 scene.js revert 로 되돌릴 수 있다.
const fs = require('fs');
const lib = require('./lib');

const REVIEW_EMPTY = '검수 필요';

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) options[key] = true;
      else { options[key] = next; i += 1; }
    } else positional.push(arg);
  }
  return { positional, options };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const note = (value) => (value === REVIEW_EMPTY ? '' : value);

function sceneIds(index, sceneId) {
  if (!sceneId) return index.scenes.map((scene) => scene.id);
  if (!index.scenes.some((scene) => scene.id === sceneId)) fail(`없는 씬 ID: ${sceneId}  (사용 가능: ${index.scenes.map((s) => s.id).join(', ')})`);
  return [sceneId];
}

function list(sceneId, options) {
  const index = lib.loadIndex();
  const out = [];
  const counts = {};
  sceneIds(index, sceneId).forEach((id) => {
    lib.loadSceneRows(id).filter((row) => row.review).forEach((row) => {
      counts[id] = (counts[id] || 0) + 1;
      out.push({
        scene: id, id: row.id, rowNumber: row.rowNumber, speaker: row.speaker,
        english: row.english, korean: row.korean, recordingScript: row.recordingScript, review: note(row.review),
      });
    });
  });
  if (options.count) { console.log(JSON.stringify({ total: out.length, scenes: counts })); return; }
  if (!out.length) { console.error('# 검수 표시된 줄이 없습니다.'); return; }
  console.log(`[\n${out.map((item) => JSON.stringify(item)).join(',\n')}\n]`);
}

function readInput(source) {
  if (!source) fail('가져올 파일을 지정하세요. 예: node tools/review.js import 검수목록.json  (표준입력은 -)');
  return source === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(source, 'utf8');
}

function importList(source, options) {
  const text = readInput(source);
  let items;
  try { items = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)); } catch { fail('목록(JSON)을 읽을 수 없습니다.'); }
  if (!Array.isArray(items) || !items.length) fail('가져올 항목이 없습니다.');
  const byScene = new Map();
  items.forEach((item, i) => {
    if (!item || typeof item.scene !== 'string' || typeof item.id !== 'string' || typeof item.review !== 'string') fail(`#${i + 1}: scene, id, review 가 필요합니다.`);
    if (!byScene.has(item.scene)) byScene.set(item.scene, []);
    byScene.get(item.scene).push({ id: item.id, review: item.review.trim() || REVIEW_EMPTY });
  });
  const why = typeof options.note === 'string' ? options.note : '검수 표시 가져오기';
  byScene.forEach((patch, sceneId) => {
    if (options.dry) { console.log(JSON.stringify({ scene: sceneId, rows: patch.length, dryRun: true })); return; }
    console.log(JSON.stringify(lib.applyPatch(sceneId, patch, why)));
  });
}

function parseRanges(spec) {
  return String(spec).split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) fail(`--rows 형식 오류: "${part}"  (예: 22-30,35)`);
    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    if (to < from) fail(`--rows 범위 오류: "${part}"`);
    return [from, to];
  });
}

function resolve(sceneId, options) {
  if (!sceneId) fail('씬 ID를 지정하세요. 예: node tools/review.js resolve H1 --all');
  const index = lib.loadIndex();
  sceneIds(index, sceneId);
  const modes = ['ids', 'rows', 'all'].filter((key) => options[key] !== undefined);
  if (modes.length !== 1) fail('대상을 하나만 지정하세요: --ids ID,ID… | --rows 22-30,35 | --all');
  const rows = lib.loadSceneRows(sceneId);
  let picked;
  if (options.all) picked = rows;
  else if (options.ids !== undefined) {
    if (options.ids === true) fail('--ids 에 줄 ID를 적으세요.');
    const wanted = new Set(String(options.ids).split(',').map((v) => v.trim()).filter(Boolean));
    picked = rows.filter((row) => wanted.has(row.id));
    wanted.forEach((id) => { if (!picked.some((row) => row.id === id)) fail(`${sceneId}에 없는 ID: ${id}`); });
  } else {
    if (options.rows === true) fail('--rows 에 행 번호 범위를 적으세요. 예: --rows 22-30,35');
    const ranges = parseRanges(options.rows);
    picked = rows.filter((row) => ranges.some(([from, to]) => row.rowNumber >= from && row.rowNumber <= to));
  }
  const targets = picked.filter((row) => row.review);
  const summary = { scene: sceneId, selected: picked.length, resolving: targets.length };
  if (options.dry || !targets.length) { console.log(JSON.stringify({ ...summary, dryRun: Boolean(options.dry) })); return; }
  const why = typeof options.note === 'string' ? options.note : '검수 완료 (표시 지움)';
  console.log(JSON.stringify({ ...summary, ...lib.applyPatch(sceneId, targets.map((row) => ({ id: row.id, review: '' })), why) }));
}

const { positional, options } = parseArgs(process.argv.slice(2));
const [command, arg] = positional;
if (!['list', 'import', 'resolve'].includes(command)) {
  console.error('사용법: node tools/review.js [--work 작품ID] <list | import | resolve> ...  (자세한 내용은 파일 상단 주석 참고)');
  process.exit(command ? 1 : 0);
}
try { lib.useWork(options.work); } catch (error) { fail(error.message); }
try {
  if (command === 'list') list(arg, options);
  else if (command === 'import') importList(arg, options);
  else resolve(arg, options);
} catch (error) { fail(error.message); }
