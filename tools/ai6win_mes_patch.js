#!/usr/bin/env node
// 작업 데이터의 번역(korean)을 AI6WIN .mes 대본에 넣어 게임용 .mes 를 만든다 (시험 단계).
//   node tools/ai6win_mes_patch.js --work jokei3 <원본 .mes 폴더> <출력 폴더> [--encoding hangul-sjis|cp949]
//   → 출력 폴더의 .mes 를 node tools/ai6win.js rebuild "<게임>\mes.arc" <파일>... --pack 으로 넣는다.
// 인코딩 기본값 hangul-sjis: 한글을 "빌린 한자" Shift-JIS 코드로 넣는다(tools/hangul_sjis.js) — 게임 글꼴을
// tools/font_remap.js 로 만든 한글 매핑 글꼴로 바꿔야 한글로 보인다. cp949 는 이 게임에서 반각 가나로 깨진다(2026-11-26 확인).
//
// 지금은 "같은 길이" 방식: 번역문을 원문 문자열 자리(같은 바이트 수) 안에 넣고 남는 자리는 공백(0x20)으로 채운다.
// 대본 안의 점프 위치를 건드리지 않아 안전하지만, 원문보다 긴 번역은 넣을 수 없다(목록으로 알려 주고 건너뜀).
// 길이를 바꿔 넣으려면 .mes 명령 구조(점프 위치를 담은 명령들)를 모두 알아야 한다 — 미구현.
// 화자 줄: 원문이 `이름「…」` 꼴이면 korean 에 괄호가 없을 때 `<화자>「…」` 로 감싼다(화자 이름은 speaker 필드).
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const args = process.argv.slice(2);
const wi = args.indexOf('--work');
const ei = args.indexOf('--encoding');
const workId = wi >= 0 ? args[wi + 1] : null;
const encoding = ei >= 0 ? args[ei + 1] : 'hangul-sjis';
const pos = args.filter((a, i) => !a.startsWith('--') && i !== wi + 1 && i !== ei + 1);
const [srcDir, outDir] = pos;
if (!workId || !srcDir || !outDir) { console.error('사용법: node tools/ai6win_mes_patch.js --work <작품ID> <원본 .mes 폴더> <출력 폴더> [--encoding cp949]'); process.exit(1); }

// cp949 인코더: 디코더로 모든 2바이트 코드를 풀어 거꾸로 표를 만든다
function makeEncoder(enc) {
  if (enc === 'hangul-sjis') { const h = require('./hangul_sjis'); return (text) => h.encode(text); }
  if (enc !== 'cp949') throw new Error(`지원하지 않는 인코딩: ${enc}`);
  const dec = new TextDecoder('euc-kr'); // WHATWG euc-kr = windows-949
  const map = new Map();
  for (let lead = 0x81; lead <= 0xfe; lead++) for (let trail = 0x41; trail <= 0xfe; trail++) {
    const ch = dec.decode(Buffer.from([lead, trail]));
    if (ch.length === 1 && ch !== '�' && !map.has(ch)) map.set(ch, [lead, trail]);
  }
  return (text) => {
    const out = [];
    const bad = [];
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c < 0x80) out.push(c);
      else if (map.has(ch)) out.push(...map.get(ch));
      else bad.push(ch);
    }
    return { bytes: Buffer.from(out), bad };
  };
}
const encode = makeEncoder(encoding);

lib.useWork(workId);
const index = lib.loadIndex();
fs.mkdirSync(outDir, { recursive: true });
const report = { files: [], applied: 0, tooLong: [], badChars: [] };
for (const scene of index.scenes) {
  const rows = lib.loadSceneRows(scene.id).filter((r) => r.korean);
  if (!rows.length) continue;
  const file = path.join(srcDir, `${scene.id}.mes`);
  const buf = Buffer.from(fs.readFileSync(file));
  let applied = 0;
  for (const r of rows) {
    const at = Number(String(r.id).split('#')[1]);
    if (buf[at] !== 0x0a) throw new Error(`${r.id}: 그 위치에 대사 명령이 없음 (.mes 가 바뀌었나?)`);
    const end = buf.indexOf(0, at + 1);
    const room = end - (at + 1);
    let text = r.korean;
    const m = /^([^「（『]{1,10})([「（『])/.exec(r.japanese || '');
    if (m && !/[「（『]/.test(text)) {
      const close = { '「': '」', '（': '）', '『': '』' }[m[2]];
      text = `${r.speaker && r.speaker !== '나레이션' ? r.speaker : m[1]}${m[2]}${text}${close}`;
    }
    const { bytes, bad } = encode(text);
    if (bad.length) { report.badChars.push({ id: r.id, chars: [...new Set(bad)].join('') }); continue; }
    if (bytes.length > room) { report.tooLong.push({ id: r.id, bytes: bytes.length, room, text }); continue; }
    bytes.copy(buf, at + 1);
    buf.fill(0x20, at + 1 + bytes.length, end);
    applied++;
  }
  if (!applied) continue;
  fs.writeFileSync(path.join(outDir, `${scene.id}.mes`), buf);
  report.files.push(`${scene.id}.mes (${applied}줄)`);
  report.applied += applied;
}
console.log(JSON.stringify(report, null, 1));
