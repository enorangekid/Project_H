#!/usr/bin/env node
// 게임 화면 버튼 이미지(AKB) 한글화 — 버튼 칸을 지우고 한국어 글자를 원본과 같은 효과로 다시 그린다.
//   node tools/ui_text.js <번역표 ui.json> <원본 akb 폴더> <출력 폴더> [이미지 이름...]
// 출력: <이름>.akb (게임에 넣을 파일)와 <이름>.png (확인용).
// 글자 모양은 tools/text_mask.ps1 (Windows 글꼴)로 그리고, 효과(테두리·그림자·빛 번짐·누름 바)는 ui.json 의 수치로 합성한다.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const akb = require('./akb');

const [specFile, srcDir, outDir, ...only] = process.argv.slice(2);
if (!specFile || !srcDir || !outDir) { console.error('사용법: node tools/ui_text.js <ui.json> <원본 akb 폴더> <출력 폴더> [이미지 이름...]'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

// ---- 마스크 연산 (Float32Array, w*h, 0~1) ----
function dilate(m, w, h, r) {
  if (r <= 0) return Float32Array.from(m);
  const out = new Float32Array(w * h);
  const offs = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const d = Math.hypot(dx, dy); if (d <= r + 0.5) offs.push([dx, dy, Math.min(1, r + 0.5 - d + 0.5)]); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = 0;
    for (const [dx, dy, k] of offs) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const t = m[yy * w + xx] * k; if (t > v) v = t; }
    out[y * w + x] = v;
  }
  return out;
}
function boxBlur(m, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += m[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s / (2 * r + 1); s += m[y * w + Math.min(w - 1, x + r + 1)] - m[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / (2 * r + 1); s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  return out;
}
function blur(m, w, h, radius) { let o = m; const r = Math.max(1, Math.round(radius / 1.7)); for (let i = 0; i < 3; i++) o = boxBlur(o, w, h, r); return o; }
function shift(m, w, h, dx, dy) { const o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx = x - dx, sy = y - dy; if (sx >= 0 && sy >= 0 && sx < w && sy < h) o[y * w + x] = m[sy * w + sx]; } return o; }

// 칸 그림(RGBA float, 곱하지 않은 색) 위에 한 겹 올리기
function over(layer, w, h, alphaMask, rgb, k = 1) {
  for (let i = 0; i < w * h; i++) {
    const a = Math.min(1, Math.max(0, alphaMask[i] * k));
    if (!a) continue;
    const da = layer[i * 4 + 3], oa = a + da * (1 - a);
    for (let c = 0; c < 3; c++) layer[i * 4 + c] = (rgb[c] * a + layer[i * 4 + c] * da * (1 - a)) / oa;
    layer[i * 4 + 3] = oa;
  }
}

function renderCell(style, st, mask, w, h, cellEdges) {
  const layer = new Float32Array(w * h * 4);
  if (style === 'pressed') {
    // 누름 바: 세로 알파 모양 × 칸 경계 흐림
    const bar = new Float32Array(w * h);
    for (let y = 0; y < h && y < spec.barAlpha.length; y++) for (let x = 0; x < w; x++) {
      const d = Math.min(x - cellEdges[0], cellEdges[1] - 1 - x);
      const e = d < spec.barEdge.length ? spec.barEdge[Math.max(0, d)] : 1;
      bar[y * w + x] = (spec.barAlpha[y] / 255) * e;
    }
    over(layer, w, h, bar, st.bar);
  }
  if (style === 'normal') {
    const outline = dilate(mask, w, h, 1);
    over(layer, w, h, blur(shift(outline, w, h, st.shadowDx, st.shadowDy), w, h, 2), st.shadow, st.shadowAlpha);
    over(layer, w, h, outline, st.outline);
  }
  if (style === 'hover' || style === 'pressed') {
    const g = blur(dilate(mask, w, h, 1), w, h, st.glowRadius);
    over(layer, w, h, g.map((v) => Math.min(1, v * st.glowGain)), st.glow, st.glowAlpha);
  }
  over(layer, w, h, mask, st.text, style === 'disabled' ? st.textAlpha : 1);
  return layer;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-text-'));
const names = Object.keys(spec.images).filter((n) => !only.length || only.includes(n));
for (const name of names) {
  const img = spec.images[name];
  const srcFile = path.join(srcDir, `${name}.akb`);
  const orig = fs.readFileSync(srcFile);
  const d = akb.decode(orig);
  // 글자 마스크 요청 (칸마다 한 번 — 상태별로 같은 모양을 쓴다)
  const req = [];
  img.groups.forEach((g, gi) => g.cells.forEach((c, ci) => req.push({ id: `${gi}_${ci}`, text: c.ko, font: spec.font, size: g.size, bold: !!g.bold, w: c.x1 - c.x0, h: 40, cy: g.cy, maxWidth: g.maxWidth })));
  fs.writeFileSync(path.join(tmp, 'req.json'), JSON.stringify(req));
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'text_mask.ps1'), path.join(tmp, 'req.json'), tmp], { stdio: ['ignore', 'ignore', 'inherit'] });
  const report = [];
  img.groups.forEach((g, gi) => g.cells.forEach((c, ci) => {
    const w = c.x1 - c.x0, h = 40;
    const raw = fs.readFileSync(path.join(tmp, `${gi}_${ci}.mask`));
    const info = JSON.parse(fs.readFileSync(path.join(tmp, `${gi}_${ci}.json`), 'utf8'));
    const mask = Float32Array.from(raw, (v) => v / 255);
    report.push(`${c.jp} → ${c.ko} (글자 ${info.size}px, 폭 ${info.width})`);
    for (const b of g.bands) {
      const st = spec.styles[b.style];
      const layer = renderCell(b.style, st, mask, w, h, [0, w]);
      const y0 = g.y + b.dy;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const gx = c.x0 + x, gy = y0 + y;
        if (gx >= d.w || gy >= d.h) continue;
        const s = (y * w + x) * 4, o = (gy * d.w + gx) * 4;
        for (let k = 0; k < 3; k++) d.rgba[o + k] = Math.round(Math.min(255, layer[s + k]));
        d.rgba[o + 3] = Math.round(Math.min(1, layer[s + 3]) * 255);
      }
    }
  }));
  const outAkb = akb.encode(orig, d.rgba);
  fs.writeFileSync(path.join(outDir, `${name}.akb`), outAkb);
  fs.writeFileSync(path.join(outDir, `${name}.png`), akb.writePng(d.w, d.h, d.rgba));
  console.log(`${name}: ${report.join(' | ')}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
