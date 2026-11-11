#!/usr/bin/env node
// 대사 행 → 음성 파일 ID 연결표를 만든다. 페이지의 ▶ 재생 버튼이 이 표를 보고 voice/<음성ID>.wav 를 재생한다.
//
//   node tools/voicemap.js [--work 작품ID] --scripts "<게임 스크립트(.ks) 폴더>"
//   예) node tools/voicemap.js --scripts "C:\Games\Onee-chan no Yuuwaku\work\patch_en"
//
// - 행 id 는 `파일명.ks#줄번호` 이고, 그 줄 바로 위의 `@nm ... s=may_0065` 같은 태그에서 음성 ID 를 읽는다.
// - 결과: works/<작품ID>/data/voices.js  (window.PROJECT_H_VOICES = { "<행 id>": "<음성ID>", ... })
// - 음성 파일 자체는 저장소에 올리지 않는다. Project_H/voice 폴더(또는 실제 음성 폴더로 연결한 바로가기)에 둔다.
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const args = process.argv.slice(2);
const at = args.indexOf('--scripts');
const scriptsDir = at !== -1 ? args[at + 1] : '';
if (!scriptsDir || !fs.existsSync(scriptsDir)) {
  console.error('사용법: node tools/voicemap.js [--work 작품ID] --scripts "<.ks 폴더>"');
  process.exit(1);
}
const workAt = args.indexOf('--work');
try { lib.useWork(workAt !== -1 ? args[workAt + 1] : undefined); } catch (error) { console.error(error.message); process.exit(1); }

function readKs(file) {
  const buffer = fs.readFileSync(file);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le').slice(1);
  return buffer.toString('utf8').replace(/^\uFEFF/, '');
}

const cache = new Map();
function lines(fileName) {
  if (!cache.has(fileName)) {
    const file = path.join(scriptsDir, fileName);
    cache.set(fileName, fs.existsSync(file) ? readKs(file).split(/\r?\n/) : null);
  }
  return cache.get(fileName);
}

const index = lib.loadIndex();
const map = {};
let rows = 0;
let missingFiles = 0;
index.scenes.forEach((scene) => {
  lib.loadSceneRows(scene.id).forEach((row) => {
    rows += 1;
    const [fileName, lineText] = String(row.id).split('#');
    const all = lines(fileName);
    if (!all) { missingFiles += 1; return; }
    const lineNo = Number(lineText);
    // 텍스트 줄 바로 위쪽(빈 줄은 건너뜀)의 태그 줄에서 s=음성ID 를 찾는다
    for (let i = lineNo - 2; i >= 0 && i >= lineNo - 4; i -= 1) {
      const line = all[i].trim();
      if (!line) continue;
      const match = line.startsWith('@') && line.match(/\bs=([A-Za-z0-9_]+)/);
      if (match) map[row.id] = match[1];
      break;
    }
  });
});

const file = path.join(lib.current().dataDir, 'voices.js');
const body = Object.entries(map).map(([id, voice]) => `${JSON.stringify(id)}:${JSON.stringify(voice)}`).join(',\n');
fs.writeFileSync(file, `window.PROJECT_H_VOICES={\n${body}\n};\n`);
console.log(JSON.stringify({ rows, withVoice: Object.keys(map).length, missingScriptRows: missingFiles, file: path.relative(process.cwd(), file) }));
