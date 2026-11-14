#!/usr/bin/env node
// 한 번에 길게 녹음한 WAV(줄 사이에 쉼을 넣은 것)를 줄별 파일로 자르고 voices.js 에 연결한다. (새가족용, README `음성 녹음·자르기`)
//
//   node tools/voice_cut.js --work newfamily <녹음.wav> --ids EP1#85,EP1#92,... [--at 10.75,29.2] [--out <폴더>] [--gap 1.2] [--dry]
//
// - 쉼(소리 없음)이 --gap 초(기본 1.2) 이상인 곳을 줄 경계로 본다. 조각 수와 --ids 수가 같아야 자른다.
//   쉼이 짧아 두 줄이 한 조각이 된 곳은 --at 으로 자를 위치(초)를 직접 준다. 다르면 조각 표만 보여 주고 멈춘다.
// - 각 파일은 앞뒤 무음을 걷어 내고(소리 앞뒤 0.05초만 남김) 앞에 0.3초, 뒤에 0.2초 무음을 똑같이 붙인다.
// - 파일 이름 = 줄 ID 의 # 을 _ 로 바꾼 것 (EP1#85 → EP1_85.wav). 기본 저장 폴더는 works/<작품>/voice/ (저장소에 올리지 않음).
// - 길이 검사: 글자 수 대비 길이가 다른 줄들과 크게 다르면 "확인" 표시 (잘림·합쳐짐 의심).
// - voices.js 에 { 줄ID: 파일이름 } 을 더한다(기존 항목 유지).
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

function parseArgs(args) {
  const positional = []; const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) { const next = args[i + 1]; if (next === undefined || next.startsWith('--')) options[arg.slice(2)] = true; else { options[arg.slice(2)] = next; i += 1; } }
    else positional.push(arg);
  }
  return { positional, options };
}
function fail(message) { console.error(message); process.exit(1); }

function readWav(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') fail(`WAV 파일이 아닙니다: ${file}`);
  let p = 12; let fmt; let data;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4); const size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { tag: b.readUInt16LE(p + 8), channels: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') { data = b.subarray(p + 8, p + 8 + Math.min(size, b.length - p - 8)); break; }
    p += 8 + size + (size & 1);
  }
  if (!fmt || !data) fail(`WAV 구조를 읽지 못했습니다: ${file}`);
  if (fmt.tag !== 1 || fmt.bits !== 16) fail(`16비트 PCM WAV만 지원합니다 (현재 tag ${fmt.tag}, ${fmt.bits}bit).`);
  return { fmt, data };
}
function writeWav(file, fmt, pcm) {
  const h = Buffer.alloc(44); const block = fmt.channels * 2;
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(fmt.channels, 22); h.writeUInt32LE(fmt.rate, 24); h.writeUInt32LE(fmt.rate * block, 28);
  h.writeUInt16LE(block, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
}

const FRAME = 0.01; const THRESHOLD_DB = -50; const KEEP = 0.05; const LEAD = 0.3; const TAIL = 0.2;
function frameLevels({ fmt, data }) {
  const block = fmt.channels * 2; const frame = Math.round(fmt.rate * FRAME); const count = Math.floor(data.length / block / frame);
  const levels = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    let sum = 0;
    for (let j = 0; j < frame; j += 1) {
      const o = (i * frame + j) * block; let v = 0;
      for (let c = 0; c < fmt.channels; c += 1) v += data.readInt16LE(o + c * 2);
      v /= fmt.channels * 32768; sum += v * v;
    }
    levels[i] = 10 * Math.log10(sum / frame + 1e-12);
  }
  return levels;
}
function segments(levels, minGap) {
  const loud = (i) => levels[i] >= THRESHOLD_DB;
  let first = 0; while (first < levels.length && !loud(first)) first += 1;
  let last = levels.length - 1; while (last > first && !loud(last)) last -= 1;
  const result = []; let start = first; let silentFrom = -1;
  for (let i = first; i <= last + 1; i += 1) {
    const silent = i <= last && !loud(i);
    if (silent && silentFrom < 0) silentFrom = i;
    if (!silent && silentFrom >= 0) { if ((i - silentFrom) * FRAME >= minGap) { result.push([start, silentFrom]); start = i; } silentFrom = -1; }
  }
  result.push([start, last + 1]);
  return result.map(([a, b]) => ({ start: a * FRAME, end: b * FRAME }));
}
function splitAt(segs, cuts, levels) {
  let list = segs.slice();
  for (const t of cuts) {
    const k = list.findIndex((s) => t > s.start && t < s.end);
    if (k < 0) fail(`--at ${t}초는 어느 조각 안에도 있지 않습니다.`);
    const s = list[k];
    // 자르는 곳 주변의 무음 구간 끝을 찾아 앞뒤 조각의 경계를 정한다
    let a = Math.round(t / FRAME); let b = a;
    while (a > s.start / FRAME && levels[a - 1] < THRESHOLD_DB) a -= 1;
    while (b < s.end / FRAME && levels[b] < THRESHOLD_DB) b += 1;
    list.splice(k, 1, { start: s.start, end: a * FRAME }, { start: b * FRAME, end: s.end });
  }
  return list;
}

const { positional, options } = parseArgs(process.argv.slice(2));
const source = positional[0];
if (!source || !fs.existsSync(source) || !options.ids) fail('사용법: node tools/voice_cut.js --work <작품> <녹음.wav> --ids 줄ID,줄ID,... [--at 초,초] [--out 폴더] [--gap 1.2] [--dry]');
try { lib.useWork(options.work); } catch (error) { fail(error.message); }
const ids = String(options.ids).split(',').map((s) => s.trim()).filter(Boolean);
const rowsById = new Map();
lib.loadIndex().scenes.forEach((scene) => lib.loadSceneRows(scene.id).forEach((row) => rowsById.set(row.id, row)));
ids.forEach((id) => { if (!rowsById.has(id)) fail(`없는 줄 ID: ${id}`); });

const wav = readWav(source);
const levels = frameLevels(wav);
let segs = segments(levels, Number(options.gap || 1.2));
if (options.at && options.at !== true) segs = splitAt(segs, String(options.at).split(',').map(Number).sort((a, b) => a - b), levels);

const chars = (row) => [...String(row.recordingScript || row.korean).replace(/["“”…—~!?.,\s]/g, '')].length || 1;
const table = segs.map((s, i) => ({ no: i + 1, start: +s.start.toFixed(2), sec: +(s.end - s.start).toFixed(2), id: ids[i] || '(남음)', text: ids[i] ? String(rowsById.get(ids[i]).recordingScript).slice(0, 30) : '' }));
if (segs.length !== ids.length) {
  table.forEach((t) => console.log(`${t.no}\t${t.start}s\t${t.sec}s\t${t.id}\t${t.text}`));
  fail(`조각 ${segs.length}개 ≠ 줄 ${ids.length}개. 쉼이 짧아 붙은 곳은 --at 으로 자를 위치를 주세요.`);
}
const rates = table.map((t) => t.sec / chars(rowsById.get(t.id)));
const median = rates.slice().sort((a, b) => a - b)[Math.floor(rates.length / 2)];
table.forEach((t, i) => { const ratio = rates[i] / median; t.check = ratio < 0.45 || ratio > 2.2 ? `확인(${ratio.toFixed(1)}배)` : ''; });

const outDir = path.resolve(options.out && options.out !== true ? options.out : path.join(lib.current().dir, 'voice'));
const block = wav.fmt.channels * 2; const toByte = (sec) => Math.max(0, Math.min(wav.data.length, Math.round(sec * wav.fmt.rate) * block));
const pad = (sec) => Buffer.alloc(Math.round(sec * wav.fmt.rate) * block);
const voices = (() => { const file = path.join(lib.current().dir, 'data', 'voices.js'); try { const window = {}; eval(fs.readFileSync(file, 'utf8')); return window.PROJECT_H_VOICES || {}; } catch { return {}; } })();
if (!options.dry) fs.mkdirSync(outDir, { recursive: true });
table.forEach((t, i) => {
  const s = segs[i]; const name = t.id.replace(/#/g, '_');
  if (!options.dry) {
    const pcm = wav.data.subarray(toByte(s.start - KEEP), toByte(s.end + KEEP));
    writeWav(path.join(outDir, `${name}.wav`), wav.fmt, Buffer.concat([pad(LEAD), pcm, pad(TAIL)]));
    voices[t.id] = name;
  }
  console.log(`${t.no}\t${t.start}s\t${t.sec}s\t${t.id}\t${t.check}\t${t.text}`);
});
if (!options.dry) {
  const file = path.join(lib.current().dir, 'data', 'voices.js');
  const body = Object.keys(voices).map((k) => `${JSON.stringify(k)}:${JSON.stringify(voices[k])}`).join(',\n');
  fs.writeFileSync(file, `window.PROJECT_H_VOICES={\n${body}\n};\n`);
}
console.log(JSON.stringify({ source: path.basename(source), lines: table.length, out: outDir, checks: table.filter((t) => t.check).map((t) => t.id), dryRun: Boolean(options.dry) }));
