#!/usr/bin/env node
// AI6WIN .mes 대본(여계가족 3 등) → 작업실 씬 데이터. 일본어 원문은 `japanese` 필드에 넣고 `korean`은 비워 둔다.
//   node tools/ai6win.js extract "<게임>\mes.arc" "<게임>\work\mes"      # 먼저 대본을 꺼낸다
//   node tools/ai6win_mes.js --work jokei3 "<게임>\work\mes" [--dry]
//
// .mes 구조 (확인한 만큼): [u32 N][u32 × N 점프 위치표] 뒤에 명령 코드.
//   대사·나레이션 = 명령 0x0A + Shift-JIS 문자열(0으로 끝남).
//   음성이 있는 줄은 바로 앞에 0x19 + u32BE(음성 번호), 음성이 없는 줄은 앞 명령이 0xFF로 끝난다.
//   이 두 경우만 대사로 본다(그 밖의 0x0A 바이트는 숫자 인자 등이라 잡음).
// 줄 ID = `<파일명>#<0x0A 바이트 위치>` — 같은 .mes 파일이면 항상 같다(나중에 게임에 다시 넣을 때 위치를 찾는 열쇠).
//
// 이미 번역한 데이터가 있으면 같은 ID 줄의 korean·memo·review·speaker(한국어로 바꾼 경우)를 그대로 옮긴다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const wi = args.indexOf('--work');
const workId = wi >= 0 ? args[wi + 1] : null;
const dry = args.includes('--dry');
const srcDir = args.filter((a, i) => !a.startsWith('--') && i !== wi + 1)[0];
if (!workId || !srcDir) { console.error('사용법: node tools/ai6win_mes.js --work <작품ID> <.mes 폴더> [--dry]'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const dataDir = path.join(ROOT, 'works', workId, 'data');
const scenesDir = path.join(dataDir, 'scenes');
const sjis = new TextDecoder('shift_jis', { fatal: true });

// 파일 이름으로 씬 종류 정하기
function sceneType(name) {
  if (/^sc_/.test(name)) return '회상';
  if (/^end/.test(name)) return /h$/i.test(name) ? '엔딩 H' : '엔딩';
  if (/bad/i.test(name)) return /h$/i.test(name) ? '배드 H' : '배드';
  if (/h\d*$/i.test(name)) return 'H씬';
  if (/^stage_r/.test(name)) return 'r 루트';
  if (/^stage_t/.test(name)) return 't 루트';
  if (/k(_\d+)?$|kh$/.test(name)) return 'k 루트';
  return '본편';
}

// 정렬 키: 종류 순서 → 번호 → 나머지 이름
const TYPE_ORDER = ['본편', 'H씬', 'k 루트', 'r 루트', 't 루트', '배드', '배드 H', '엔딩', '엔딩 H', '회상'];
function sortKey(name) {
  const m = /(\d+)/.exec(name);
  return [TYPE_ORDER.indexOf(sceneType(name)), m ? Number(m[1]) : 0, name];
}

function isLead(c) { return (c >= 0x81 && c <= 0x9f) || (c >= 0xe0 && c <= 0xfc); }

function parseMes(buf) {
  const n = buf.readUInt32LE(0);
  const start = 4 + n * 4;
  const lines = [];
  for (let i = start; i < buf.length; i++) {
    if (buf[i] !== 0x0a) continue;
    let voice = null;
    if (i >= 5 && buf[i - 5] === 0x19) voice = buf.readUInt32BE(i - 4);
    else if (buf[i - 1] !== 0xff) continue;
    let e = i + 1;
    while (e < buf.length && buf[e]) e++;
    if (e >= buf.length || e === i + 1) continue;
    let text;
    try { text = sjis.decode(buf.subarray(i + 1, e)); } catch { continue; }
    if (!isLead(buf[i + 1]) && !/[　-鿿！-～]/.test(text)) continue; // 전각 문자가 없는 짧은 잡음 제외
    if (/[｡-ﾟ]/.test(text) && !/[぀-ヿ一-鿿]/.test(text)) continue; // 반각 가나만 있는 잡음 제외
    if (text === '・') { i = e; continue; } // 화면 전환용 빈 줄(번역할 것 없음)
    lines.push({ pos: i, voice, text });
    i = e;
  }
  return lines;
}

// `大樹「……」` / `大樹（……）` → 화자 분리
function splitSpeaker(text) {
  const m = /^(？+|[^「」（）『』\s、。…！？]{1,10})([「（『])/.exec(text);
  if (m && /[」）』]$/.test(text)) return { speaker: m[1], body: text.slice(m[1].length) };
  return { speaker: '나레이션', body: text };
}

// 기존 데이터 (번역 옮기기용)
const old = new Map();
if (fs.existsSync(scenesDir)) {
  for (const f of fs.readdirSync(scenesDir)) {
    const sb = { window: {} };
    try { vm.runInNewContext(fs.readFileSync(path.join(scenesDir, f), 'utf8'), sb); } catch { continue; }
    Object.values(sb.window.PROJECT_H_SCENES || {}).forEach((rows) => rows.forEach((r) => old.set(r.id, r)));
  }
}

const names = fs.readdirSync(srcDir).filter((f) => f.endsWith('.mes')).map((f) => f.slice(0, -4));
names.sort((a, b) => { const x = sortKey(a), y = sortKey(b); return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]); });

const index = {
  meta: {
    project: 'Project_H', source: `${srcDir} (.mes, AI6WIN)`, format: 2,
    columns: ['id', 'kind', 'speaker', 'japanese', 'korean', 'memo', 'voice', 'sceneType', 'sceneId', 'sceneDetail', 'phaseId', 'phase', 'phaseDetail'],
    rowCount: 0, sceneCount: 0, voiceCheckedCount: 0, koreanCount: 0, recordingScriptCount: 0,
    builtAt: new Date().toISOString(), generator: 'tools/ai6win_mes.js — 일본어 원문은 .mes에서 다시 만들 수 있음, 번역(korean)은 다시 만들어도 줄 ID로 옮겨짐',
  },
  speakers: [], scenes: [],
};
const files = {};
const speakerCount = new Map();
let carried = 0;
for (const name of names) {
  if (!/^[A-Za-z0-9_-]+$/.test(name)) { console.error(`건너뜀 (씬 ID로 못 쓰는 이름): ${name}`); continue; }
  if (/^sc_/.test(name)) continue; // 회상 모드용 사본 — 대사가 본편과 같아서(13,963줄 중 13,962줄) 번역하지 않고, 게임에 넣을 때 같은 문장의 번역을 옮겨 쓴다
  const lines = parseMes(fs.readFileSync(path.join(srcDir, `${name}.mes`)));
  if (!lines.length) continue;
  const phaseId = `${name}-P1`;
  const rows = lines.map((l, k) => {
    const { speaker } = splitSpeaker(l.text);
    const id = `${name}.mes#${l.pos}`;
    const row = { rowNumber: k + 1, id, kind: 'text', speaker, english: '', japanese: l.text, korean: '', recordingScript: '', memo: l.voice != null ? `음성 ${l.voice}` : '', voice: '', phaseId };
    const prev = old.get(id);
    if (prev) {
      if (prev.japanese === l.text || !prev.japanese) {
        ['korean', 'review'].forEach((key) => { if (prev[key]) row[key] = prev[key]; });
        if (prev.speaker && prev.speaker !== speaker && !/[぀-ヿ一-鿿]/.test(prev.speaker)) row.speaker = prev.speaker; // 한국어로 바꾼 화자 이름 유지
        if (prev.memo && prev.memo !== row.memo) row.memo = prev.memo;
        if (prev.korean) carried += 1;
      }
    }
    speakerCount.set(row.speaker, (speakerCount.get(row.speaker) || 0) + 1);
    return row;
  });
  files[name] = rows;
  const korean = rows.filter((r) => r.korean).length;
  index.scenes.push({
    id: name, type: sceneType(name), detail: `${name}.mes`, count: rows.length,
    stats: { korean, voice: 0, script: 0, review: rows.filter((r) => r.review).length },
    phases: [{ id: phaseId, name: '전체', detail: '', count: rows.length }], idKeys: [`${name}.mes`],
  });
}
index.meta.rowCount = index.scenes.reduce((a, s) => a + s.count, 0);
index.meta.koreanCount = index.scenes.reduce((a, s) => a + s.stats.korean, 0);
index.meta.sceneCount = index.scenes.length;
index.speakers = [...speakerCount].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

const byType = {};
index.scenes.forEach((s) => { byType[s.type] = (byType[s.type] || 0) + 1; });
console.log(JSON.stringify({ scenes: index.meta.sceneCount, rows: index.meta.rowCount, byType, carriedKorean: carried, topSpeakers: index.speakers.slice(0, 15) }));
if (dry) process.exit(0);

fs.mkdirSync(scenesDir, { recursive: true });
for (const f of fs.readdirSync(scenesDir)) if (f.endsWith('.js') && !files[f.slice(0, -3)]) fs.unlinkSync(path.join(scenesDir, f));
for (const [id, rows] of Object.entries(files)) {
  fs.writeFileSync(path.join(scenesDir, `${id}.js`), `window.PROJECT_H_SCENES=window.PROJECT_H_SCENES||{};\nwindow.PROJECT_H_SCENES[${JSON.stringify(id)}]=[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n];\n`);
}
const head = JSON.stringify({ meta: index.meta, speakers: index.speakers }, null, 1);
const sceneLines = index.scenes.map((s) => `  ${JSON.stringify(s)}`).join(',\n');
fs.writeFileSync(path.join(dataDir, 'index.js'), `window.PROJECT_H_INDEX=Object.assign(${head},{scenes:[\n${sceneLines}\n]});\n`);
console.log(`저장: works/${workId}/data`);
