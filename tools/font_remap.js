#!/usr/bin/env node
// 글꼴의 문자표(cmap)를 고쳐 "빌린 한자" 자리에 한글 모양이 나오게 하고, 글꼴 이름을 바꿔 저장한다.
//   node tools/font_remap.js <원본 글꼴(.ttf/.otf)> <출력 글꼴> "<새 글꼴 이름>"
// 암호표는 tools/hangul_sjis.js (한글 2,350자 → JIS 2수준 한자). 원본 글꼴은 수정·재배포가 허용된 것(OFL 등)을 쓰고,
// OFL 의 예약 이름(Noto 등)을 피하려고 반드시 새 이름을 준다. 글자 모양(글리프)은 그대로이고 문자표·이름만 바뀐다.
'use strict';
const fs = require('fs');
const { build } = require('./hangul_sjis');

const [src, out, family] = process.argv.slice(2);
if (!src || !out || !family) { console.error('사용법: node tools/font_remap.js <원본 글꼴> <출력 글꼴> "<새 글꼴 이름>"'); process.exit(1); }
const buf = fs.readFileSync(src);
const sfnt = buf.readUInt32BE(0);
const numTables = buf.readUInt16BE(4);
const tables = new Map();
for (let i = 0; i < numTables; i++) {
  const o = 12 + i * 16;
  tables.set(buf.toString('latin1', o, o + 4), Buffer.from(buf.subarray(buf.readUInt32BE(o + 8), buf.readUInt32BE(o + 8) + buf.readUInt32BE(o + 12))));
}

// ---- cmap 읽기 (가장 넓은 유니코드 표) ----
function readCmap(t) {
  const n = t.readUInt16BE(2);
  const subs = [];
  for (let i = 0; i < n; i++) subs.push({ pid: t.readUInt16BE(4 + i * 8), eid: t.readUInt16BE(6 + i * 8), off: t.readUInt32BE(8 + i * 8) });
  const pick = subs.find((s) => t.readUInt16BE(s.off) === 12) || subs.find((s) => t.readUInt16BE(s.off) === 4);
  const map = new Map();
  const o = pick.off;
  if (t.readUInt16BE(o) === 12) {
    const groups = t.readUInt32BE(o + 12);
    for (let g = 0; g < groups; g++) {
      const p = o + 16 + g * 12;
      const s = t.readUInt32BE(p), e = t.readUInt32BE(p + 4), gid = t.readUInt32BE(p + 8);
      for (let c = s; c <= e; c++) map.set(c, gid + (c - s));
    }
  } else {
    const segX2 = t.readUInt16BE(o + 6), seg = segX2 / 2;
    const ends = o + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
    for (let i = 0; i < seg; i++) {
      const e = t.readUInt16BE(ends + i * 2), s = t.readUInt16BE(starts + i * 2), d = t.readInt16BE(deltas + i * 2), ro = t.readUInt16BE(ranges + i * 2);
      for (let c = s; c <= e && c !== 0xffff; c++) {
        let gid;
        if (!ro) gid = (c + d) & 0xffff;
        else { const gi = t.readUInt16BE(ranges + i * 2 + ro + (c - s) * 2); gid = gi ? (gi + d) & 0xffff : 0; }
        if (gid) map.set(c, gid);
      }
    }
  }
  return map;
}

// ---- cmap 쓰기: 형식 4(BMP) + 형식 12(전체) ----
function writeCmap(map) {
  const cps = [...map.keys()].sort((a, b) => a - b);
  const bmp = cps.filter((c) => c < 0xffff);
  // 형식 4: 연속 코드 구간마다 한 구간, 글리프는 배열로(idRangeOffset)
  const segs = [];
  for (const c of bmp) { const last = segs[segs.length - 1]; if (last && c === last.e + 1) last.e = c; else segs.push({ s: c, e: c }); }
  segs.push({ s: 0xffff, e: 0xffff, end: true });
  const segCount = segs.length;
  const glyphArr = [];
  const f4 = [];
  const ends = [], starts = [], deltas = [], ros = [];
  segs.forEach((sg, i) => {
    ends.push(sg.e); starts.push(sg.s);
    if (sg.end) { deltas.push(1); ros.push(0); return; }
    // 글리프 번호가 연속이면 delta 로, 아니면 배열로
    let consecutive = true;
    for (let c = sg.s; c <= sg.e; c++) if (map.get(c) !== map.get(sg.s) + (c - sg.s)) { consecutive = false; break; }
    if (consecutive) { deltas.push((map.get(sg.s) - sg.s) & 0xffff); ros.push(0); }
    else { deltas.push(0); ros.push({ idx: glyphArr.length, seg: i }); for (let c = sg.s; c <= sg.e; c++) glyphArr.push(map.get(c)); }
  });
  const len4 = 16 + segCount * 8 + glyphArr.length * 2;
  if (len4 > 0xffff) throw new Error(`형식 4 표가 너무 큼 (${len4})`);
  const t4 = Buffer.alloc(len4);
  t4.writeUInt16BE(4, 0); t4.writeUInt16BE(len4, 2); t4.writeUInt16BE(0, 4);
  t4.writeUInt16BE(segCount * 2, 6);
  const es = Math.floor(Math.log2(segCount));
  t4.writeUInt16BE(2 * 2 ** es, 8); t4.writeUInt16BE(es, 10); t4.writeUInt16BE(segCount * 2 - 2 * 2 ** es, 12);
  const pEnd = 14, pStart = pEnd + segCount * 2 + 2, pDelta = pStart + segCount * 2, pRo = pDelta + segCount * 2, pGlyph = pRo + segCount * 2;
  for (let i = 0; i < segCount; i++) {
    t4.writeUInt16BE(ends[i], pEnd + i * 2); t4.writeUInt16BE(starts[i], pStart + i * 2); t4.writeUInt16BE(deltas[i], pDelta + i * 2);
    const ro = ros[i];
    t4.writeUInt16BE(ro ? (pGlyph + ro.idx * 2) - (pRo + i * 2) : 0, pRo + i * 2);
  }
  glyphArr.forEach((g, k) => t4.writeUInt16BE(g, pGlyph + k * 2));
  // 형식 12
  const groups = [];
  for (const c of cps) { const g = map.get(c); const last = groups[groups.length - 1]; if (last && c === last.e + 1 && g === last.g + (c - last.s)) last.e = c; else groups.push({ s: c, e: c, g }); }
  const t12 = Buffer.alloc(16 + groups.length * 12);
  t12.writeUInt16BE(12, 0); t12.writeUInt32BE(t12.length, 4); t12.writeUInt32BE(groups.length, 12);
  groups.forEach((g, k) => { t12.writeUInt32BE(g.s, 16 + k * 12); t12.writeUInt32BE(g.e, 20 + k * 12); t12.writeUInt32BE(g.g, 24 + k * 12); });
  const recs = [[0, 3, t4], [0, 4, t12], [3, 1, t4], [3, 10, t12]];
  const head = Buffer.alloc(4 + recs.length * 8);
  head.writeUInt16BE(0, 0); head.writeUInt16BE(recs.length, 2);
  const off4 = head.length, off12 = off4 + t4.length;
  recs.forEach(([p, e, t], k) => { head.writeUInt16BE(p, 4 + k * 8); head.writeUInt16BE(e, 6 + k * 8); head.writeUInt32BE(t === t4 ? off4 : off12, 8 + k * 8); });
  return Buffer.concat([head, t4, t12]);
}

// ---- name: 가족 이름 등 바꾸기 ----
function writeName(t, fam) {
  const count = t.readUInt16BE(2), strOff = t.readUInt16BE(4);
  const ps = fam.replace(/[^A-Za-z0-9]/g, '');
  const sub = (() => { // 원래 하위 이름(굵기)
    for (let i = 0; i < count; i++) { const o = 6 + i * 12; if (t.readUInt16BE(o) === 3 && t.readUInt16BE(o + 6) === 2) return t.subarray(strOff + t.readUInt16BE(o + 10), strOff + t.readUInt16BE(o + 10) + t.readUInt16BE(o + 8)).swap16().toString('utf16le'); }
    return 'Regular';
  })();
  const replace = { 1: fam, 3: `${ps}-${sub};remap`, 4: `${fam} ${sub}`.replace(/ Regular$/, ''), 6: `${ps}-${sub}`, 16: fam, 17: sub };
  const recs = [];
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 12;
    const r = { pid: t.readUInt16BE(o), eid: t.readUInt16BE(o + 2), lid: t.readUInt16BE(o + 4), nid: t.readUInt16BE(o + 6) };
    let data = Buffer.from(t.subarray(strOff + t.readUInt16BE(o + 10), strOff + t.readUInt16BE(o + 10) + t.readUInt16BE(o + 8)));
    if (replace[r.nid] !== undefined) {
      if (r.pid === 3 || r.pid === 0) data = Buffer.from(replace[r.nid], 'utf16le').swap16();
      else if (r.pid === 1) data = Buffer.from(replace[r.nid], 'latin1');
    }
    recs.push({ ...r, data });
  }
  const headLen = 6 + recs.length * 12;
  const outHead = Buffer.alloc(headLen);
  outHead.writeUInt16BE(0, 0); outHead.writeUInt16BE(recs.length, 2); outHead.writeUInt16BE(headLen, 4);
  let pos = 0;
  recs.forEach((r, i) => { const o = 6 + i * 12; outHead.writeUInt16BE(r.pid, o); outHead.writeUInt16BE(r.eid, o + 2); outHead.writeUInt16BE(r.lid, o + 4); outHead.writeUInt16BE(r.nid, o + 6); outHead.writeUInt16BE(r.data.length, o + 8); outHead.writeUInt16BE(pos, o + 10); pos += r.data.length; });
  return Buffer.concat([outHead, ...recs.map((r) => r.data)]);
}

const cmap = readCmap(tables.get('cmap'));
const { toKanji } = build();
let mapped = 0, missing = [];
for (const [h, k] of toKanji) {
  const gid = cmap.get(h.codePointAt(0));
  if (!gid) { missing.push(h); continue; }
  cmap.set(k.codePointAt(0), gid);
  mapped++;
}
tables.set('cmap', writeCmap(cmap));
tables.set('name', writeName(tables.get('name'), family));
tables.delete('DSIG'); // 서명은 수정 후 무효
// OS/2: 일본어(JIS) 문자 집합 지원 표시 — 게임이 일본어 글꼴을 요구해도 이 글꼴이 골라지게
const os2 = tables.get('OS/2');
if (os2 && os2.readUInt16BE(0) >= 1) os2.writeUInt32BE((os2.readUInt32BE(78) | (1 << 17)) >>> 0, 78);
// 세로 여백: 게임은 글자 칸 높이로 글꼴 크기를 정하므로, 위아래 여백이 큰 글꼴(Noto CJK: 1.45em)은 글자가 작게 그려진다.
// MS 고딕처럼 위 0.88em·아래 0.12em(합 1em)으로 맞춘다 (2026-11-26, 여계가족 3 메시지 창에서 확인).
const upm = tables.get('head').readUInt16BE(18);
const asc = Math.round(upm * 0.88), desc = Math.round(upm * 0.12);
if (os2) { os2.writeInt16BE(asc, 68); os2.writeInt16BE(-desc, 70); os2.writeInt16BE(0, 72); os2.writeUInt16BE(asc, 74); os2.writeUInt16BE(desc, 76); }
const hhea = tables.get('hhea');
hhea.writeInt16BE(asc, 4); hhea.writeInt16BE(-desc, 6); hhea.writeInt16BE(0, 8);
// 평균 글자 폭: 게임이 CreateFont 에 "반각 폭"을 주면 Windows 는 이 값에 맞춰 가로 배율을 정한다.
// MS 고딕은 0.5em 인데 Noto CJK 는 약 1em 이라 한글이 절반 폭으로 눌려 보였다(2026-11-26 확인) → 0.5em 으로.
if (os2) os2.writeInt16BE(Math.round(upm * 0.5), 2);

// ---- 다시 묶기 ----
const tags = [...tables.keys()].sort();
const n = tags.length;
const es = Math.floor(Math.log2(n));
const header = Buffer.alloc(12 + n * 16);
header.writeUInt32BE(sfnt, 0); header.writeUInt16BE(n, 4); header.writeUInt16BE(16 * 2 ** es, 6); header.writeUInt16BE(es, 8); header.writeUInt16BE(n * 16 - 16 * 2 ** es, 10);
const sum = (b) => { let s = 0; const p = Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]); for (let i = 0; i < p.length; i += 4) s = (s + p.readUInt32BE(i)) >>> 0; return s; };
const headT = tables.get('head'); headT.writeUInt32BE(0, 8);
let off = header.length;
const body = [];
tags.forEach((tag, i) => {
  const t = tables.get(tag);
  const o = 12 + i * 16;
  header.write(tag, o, 4, 'latin1'); header.writeUInt32BE(sum(t), o + 4); header.writeUInt32BE(off, o + 8); header.writeUInt32BE(t.length, o + 12);
  const pad = Buffer.alloc((4 - (t.length % 4)) % 4);
  body.push(t, pad); off += t.length + pad.length;
});
const font = Buffer.concat([header, ...body]);
const headOff = header.readUInt32BE(12 + tags.indexOf('head') * 16 + 8);
font.writeUInt32BE((0xb1b0afba - sum(font)) >>> 0, headOff + 8);
fs.writeFileSync(out, font);
console.log(JSON.stringify({ out, family, mappedHangul: mapped, missing: missing.join(''), glyphsInCmap: cmap.size }));
