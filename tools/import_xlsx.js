#!/usr/bin/env node
// 직접 쓴 대본 엑셀(번호 | 장면 | 화자 | 대사 / 나레이션)을 작품의 새 씬 하나로 가져온다.
// 원작 번역이 아닌 창작 대본용 (영어 원문 없음). 예: newfamily 작품의 "1편_스크립트.xlsx"
//
//   node tools/import_xlsx.js --work newfamily --scene EP1 --name "1편" <엑셀 경로> [--dry]
//
// - 첫 번째 시트만 읽는다. 1행은 머리글, 2행부터 대사.
// - 씬 1개 = 편 1개, `장면` 열 = 단계(나온 순서대로 <씬ID>-P1, P2 …).
// - 행 id = <씬ID>#<번호> (예: EP1#12), rowNumber = 엑셀 행 번호, 화자의 [ ] 는 뗀다.
// - 엑셀(.xlsx) 대신 같은 열 구성의 탭 구분 텍스트(.tsv, UTF-8)도 읽는다.
// - 이미 있는 씬에는 덮어쓰지 않는다(그 뒤의 수정·변경 기록이 사라지므로). 고칠 때는 scene.js set 을 쓴다.
//   단, 변경 기록이 하나도 없는 씬은 --replace 로 통째로 바꿀 수 있다(원고를 새로 쓴 경우).
const fs = require('fs');
const zlib = require('zlib');
const lib = require('./lib');

const args = process.argv.slice(2);
function take(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  return args.splice(i, 2)[1];
}
function takeBool(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}
const workId = take('--work');
const sceneId = take('--scene');
const sceneName = take('--name');
const sceneType = take('--type') || '본편';
const dry = takeBool('--dry');
const replace = takeBool('--replace');
const source = args[0];
if (!sceneId || !source) {
  console.error('사용법: node tools/import_xlsx.js --work <작품ID> --scene <씬ID> --name "<편 이름>" <엑셀 경로> [--dry]');
  process.exit(1);
}
if (!lib.ID_PATTERN.test(sceneId)) throw new Error(`씬 ID는 영문·숫자·_·- 만 가능합니다: ${sceneId}`);
lib.useWork(workId);

// ---- xlsx(zip) 읽기: 외부 패키지 없이 중앙 디렉터리만 해석 ----
function readZip(file) {
  const buf = fs.readFileSync(file);
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('xlsx(zip) 형식이 아닙니다.');
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = {};
  for (let n = 0; n < total; n += 1) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries[name] = () => {
      const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(start, start + size);
      return (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8');
    };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

const decode = (s) => s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos));/gi, (m, dec, hex, named) => {
  if (dec) return String.fromCodePoint(Number(dec));
  if (hex) return String.fromCodePoint(parseInt(hex, 16));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[named.toLowerCase()];
});
const textOf = (xml) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');

const table = [];
if (/\.(tsv|txt)$/i.test(source)) {
  // 탭 구분 텍스트 (UTF-8). 한 줄 = 한 행이며 칸 안의 줄바꿈은 쓰지 않는다. rowNumber = 파일의 줄 번호.
  fs.readFileSync(source, 'utf8').replace(/^﻿/, '').split(/\r?\n/).forEach((line, i) => {
    if (line.trim()) table.push({ rowNumber: i + 1, cells: line.split('\t') });
  });
} else {
const zip = readZip(source);
const shared = zip['xl/sharedStrings.xml'] ? [...zip['xl/sharedStrings.xml']().matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1])) : [];
const sheetName = Object.keys(zip).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
const sheet = zip[sheetName]();
const colIndex = (ref) => ref.replace(/\d+/g, '').split('').reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;

for (const rowMatch of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
  const rowNumber = Number(/\br="(\d+)"/.exec(rowMatch[1])[1]);
  const cells = [];
  for (const cell of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = /\br="([A-Z]+\d+)"/.exec(cell[1])[1];
    const type = (/\bt="(\w+)"/.exec(cell[1]) || [])[1];
    const body = cell[2] || '';
    const v = /<v>([\s\S]*?)<\/v>/.exec(body);
    let value = '';
    if (type === 's' && v) value = shared[Number(v[1])];
    else if (type === 'inlineStr') value = textOf(body);
    else if (v) value = decode(v[1]);
    cells[colIndex(ref)] = value;
  }
  table.push({ rowNumber, cells });
}
}

const header = (table.shift() || { cells: [] }).cells.map((c) => String(c || '').trim());
const expected = ['번호', '장면', '화자'];
if (expected.some((name, i) => header[i] !== name)) throw new Error(`머리글이 다릅니다: ${header.join(' | ')} (기대: 번호 | 장면 | 화자 | 대사)`);

// ---- 행 만들기 ----
const phases = [];
const rows = [];
const seen = new Set();
table.forEach(({ rowNumber, cells }) => {
  const [num, phaseName, speakerRaw, text] = [0, 1, 2, 3].map((i) => String(cells[i] ?? '').replace(/\r\n?/g, '\n').trim());
  if (!num && !text) return;
  const id = `${sceneId}#${num || rowNumber}`;
  if (seen.has(id)) throw new Error(`번호가 겹칩니다: ${id} (엑셀 ${rowNumber}행)`);
  seen.add(id);
  let phase = phases.find((item) => item.name === phaseName);
  if (!phase) { phase = { id: `${sceneId}-P${phases.length + 1}`, name: phaseName, detail: '', count: 0 }; phases.push(phase); }
  rows.push({
    rowNumber, id, kind: 'text', speaker: speakerRaw.replace(/^\[(.*)\]$/, '$1').trim(),
    english: '', korean: text, recordingScript: '', prompt: '', memo: '', voice: '', phaseId: phase.id,
  });
});

const index = (() => { try { return lib.loadIndex(); } catch { return null; } })() || {
  meta: { project: 'Project_H', source: '', format: 2, columns: ['id', 'kind', 'speaker', 'korean', 'memo', 'voice', 'sceneType', 'sceneId', 'sceneDetail', 'phaseId', 'phase', 'phaseDetail', 'recordingScript'] },
  speakers: [], scenes: [],
};
const existing = index.scenes.findIndex((scene) => scene.id === sceneId);
if (existing !== -1) {
  const history = lib.loadChanges(sceneId).length;
  if (!replace || history) {
    console.error(history
      ? `이미 있는 씬이고 변경 기록이 ${history}건 있습니다: ${sceneId} (교체하면 기록이 사라지므로 하지 않습니다. 고칠 때는 tools/scene.js set 을 쓰세요)`
      : `이미 있는 씬입니다: ${sceneId} (변경 기록이 없을 때만 --replace 로 통째로 바꿀 수 있습니다)`);
    process.exit(1);
  }
}

const summary = {
  work: lib.current().id || workId, scene: sceneId, name: sceneName || sceneId, rows: rows.length,
  phases: phases.map((phase) => `${phase.id} ${phase.name} (${rows.filter((r) => r.phaseId === phase.id).length})`),
  speakers: [...new Set(rows.map((row) => row.speaker))],
};
if (dry) { console.log(JSON.stringify({ dry: true, ...summary }, null, 1)); process.exit(0); }

const sceneInfo = { id: sceneId, type: sceneType, detail: sceneName || sceneId, count: rows.length, stats: {}, phases };
if (existing !== -1) index.scenes[existing] = sceneInfo;
else index.scenes.push(sceneInfo);
const baseName = require('path').basename(source);
const sources = (index.meta.source || '').split(', ').filter(Boolean);
if (!sources.includes(baseName)) sources.push(baseName);
index.meta.source = sources.join(', ');
index.meta.sourceFile = index.meta.source;
lib.writeSceneRows(sceneId, rows);
const rowsByScene = Object.fromEntries(index.scenes.map((scene) => [scene.id, scene.id === sceneId ? rows : lib.loadSceneRows(scene.id)]));
index.speakers = lib.computeSpeakers(rowsByScene);
lib.writeIndex(index, rowsByScene);

// 검증: 다시 읽은 행이 엑셀과 같은지
const reloaded = lib.loadSceneRows(sceneId);
const mismatched = rows.filter((row, i) => !reloaded[i] || ['id', 'speaker', 'korean', 'phaseId'].some((key) => reloaded[i][key] !== row[key])).length;
console.log(JSON.stringify({ ...summary, mismatchedRows: mismatched }, null, 1));
if (mismatched) process.exit(1);
