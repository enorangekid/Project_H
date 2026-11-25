#!/usr/bin/env node
// Silky's AKB 이미지 ↔ PNG (AI6WIN 게임의 layer.arc 안 이미지)
//   node tools/akb.js topng <입력.akb> <출력.png>
//   node tools/akb.js frompng <원본.akb> <입력.png> <출력.akb>    # 원본 헤더(크기·플래그·배경색)를 따라 새로 만듦
// 형식: "AKB " | u16 폭 | u16 높이 | u32 플래그(0x40000000 = 24비트, 아니면 32비트 BGRA) | u32 배경색
//       | i32 x, y, right, bottom (그림이 있는 영역) | LZSS 압축 데이터
// 압축을 풀면 줄 순서는 아래→위(BMP식, 마지막 저장 줄 = 그림 맨 위 줄)이고 값은 차분이다 (2026-11-25, 게임 화면 캡처와
// title.akb 를 비교해 100% 일치 확인):
//   그림 맨 위 줄 = 가로 차분 (첫 픽셀은 값 그대로, 나머지는 왼쪽 픽셀과 바이트 단위로 더함)
//   그 아래 줄들  = 바로 위 줄(화면 기준)과 바이트 단위로 더함
// 그래서 풀 때는 맨 위 줄(마지막 저장 줄)부터 아래로 내려가며 더한다.
'use strict';
const fs = require('fs');
const zlib = require('zlib');

function lzssDecode(src, outSize) {
  const out = Buffer.alloc(outSize);
  const win = Buffer.alloc(4096);
  let wp = 0xfee, sp = 0, op = 0, flags = 0;
  while (op < outSize && sp < src.length) {
    flags >>= 1;
    if (!(flags & 0x100)) flags = src[sp++] | 0xff00;
    if (flags & 1) { const c = src[sp++]; out[op++] = c; win[wp] = c; wp = (wp + 1) & 0xfff; }
    else {
      const lo = src[sp++], hi = src[sp++];
      const off = lo | ((hi & 0xf0) << 4), len = (hi & 0x0f) + 3;
      for (let k = 0; k < len && op < outSize; k++) { const c = win[(off + k) & 0xfff]; out[op++] = c; win[wp] = c; wp = (wp + 1) & 0xfff; }
    }
  }
  return out;
}

// 단순하지만 올바른 LZSS 압축 (해시로 일치 찾기). 게임이 읽는 형식과 같다.
function lzssEncode(src) {
  const out = [];
  const win = Buffer.alloc(4096);
  let wp = 0xfee;
  const head = new Map(); // 3바이트 → 최근 창 위치 목록
  let i = 0;
  while (i < src.length) {
    const flagPos = out.length; out.push(0);
    let flags = 0;
    for (let bit = 0; bit < 8 && i < src.length; bit++) {
      let bestLen = 0, bestOff = 0;
      if (i + 2 < src.length) {
        const key = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
        const cands = head.get(key);
        if (cands) {
          for (let c = cands.length - 1; c >= 0 && c >= cands.length - 16; c--) {
            const p = cands[c]; // 원본 위치
            if (i - p > 4096 - 18) continue;
            let l = 0;
            while (l < 18 && i + l < src.length && src[p + l] === src[i + l] && p + l < i) l++;
            if (l > bestLen) { bestLen = l; bestOff = (0xfee + p) & 0xfff; if (l === 18) break; }
          }
        }
      }
      const take = bestLen >= 3 ? bestLen : 1;
      if (bestLen >= 3) { out.push(bestOff & 0xff, ((bestOff >> 4) & 0xf0) | (bestLen - 3)); }
      else { flags |= 1 << bit; out.push(src[i]); }
      for (let k = 0; k < take; k++) {
        const pos = i + k;
        if (pos + 2 < src.length) {
          const key = (src[pos] << 16) | (src[pos + 1] << 8) | src[pos + 2];
          let arr = head.get(key); if (!arr) { arr = []; head.set(key, arr); }
          arr.push(pos); if (arr.length > 64) arr.splice(0, arr.length - 32);
        }
        win[wp] = src[pos]; wp = (wp + 1) & 0xfff;
      }
      i += take;
    }
    out[flagPos] = flags;
  }
  return Buffer.from(out);
}

function readAkb(buf) {
  if (buf.toString('latin1', 0, 3) !== 'AKB') throw new Error('AKB 파일이 아님');
  const plus = buf[3] === 0x2b; // "AKB+" (차분 이미지) — 헤더가 더 김
  const w = buf.readUInt16LE(4), h = buf.readUInt16LE(6), flags = buf.readUInt32LE(8), bg = buf.readUInt32LE(12);
  let p = 16;
  if (plus) p += 16; // AKB+ 는 기준 이미지 정보 16바이트가 더 있음 (아직 미검증)
  const x = buf.readInt32LE(p), y = buf.readInt32LE(p + 4), right = buf.readInt32LE(p + 8), bottom = buf.readInt32LE(p + 12);
  const dataOff = p + 16;
  const bpp = flags & 0x40000000 ? 3 : 4;
  return { plus, w, h, flags, bg, x, y, right, bottom, bpp, headerLen: dataOff, data: buf.subarray(dataOff) };
}

// AKB → 전체 크기 RGBA (위→아래)
function decode(buf) {
  const a = readAkb(buf);
  const iw = a.right - a.x, ih = a.bottom - a.y;
  const stride = iw * a.bpp;
  const px = lzssDecode(a.data, stride * ih);
  const top = (ih - 1) * stride; // 마지막 저장 줄 = 그림 맨 위 줄
  for (let i = top + a.bpp; i < top + stride; i++) px[i] = (px[i] + px[i - a.bpp]) & 0xff;
  for (let i = top - 1; i >= 0; i--) px[i] = (px[i] + px[i + stride]) & 0xff;
  const rgba = Buffer.alloc(a.w * a.h * 4);
  // 배경색 채우기 (BGRA, 32비트면 알파 포함)
  const bb = a.bg & 0xff, bgG = (a.bg >> 8) & 0xff, bgR = (a.bg >> 16) & 0xff, bgA = a.bpp === 4 ? (a.bg >>> 24) & 0xff : 255;
  for (let i = 0; i < a.w * a.h; i++) { rgba[i * 4] = bgR; rgba[i * 4 + 1] = bgG; rgba[i * 4 + 2] = bb; rgba[i * 4 + 3] = bgA; }
  for (let row = 0; row < ih; row++) {
    const srcRow = ih - 1 - row; // 아래→위 저장
    const dy = a.y + row;
    for (let col = 0; col < iw; col++) {
      const s = srcRow * stride + col * a.bpp, d = (dy * a.w + a.x + col) * 4;
      rgba[d] = px[s + 2]; rgba[d + 1] = px[s + 1]; rgba[d + 2] = px[s]; rgba[d + 3] = a.bpp === 4 ? px[s + 3] : 255;
    }
  }
  return { ...a, rgba };
}

// 전체 크기 RGBA → AKB (원본 헤더 기준, 그림 영역은 원본과 같게 둠)
function encode(origBuf, rgba) {
  const a = readAkb(origBuf);
  if (a.plus) throw new Error('AKB+ 는 아직 다시 만들 수 없음');
  const iw = a.right - a.x, ih = a.bottom - a.y;
  const stride = iw * a.bpp;
  const px = Buffer.alloc(stride * ih);
  for (let row = 0; row < ih; row++) {
    const srcRow = ih - 1 - row, dy = a.y + row;
    for (let col = 0; col < iw; col++) {
      const s = (dy * a.w + a.x + col) * 4, d = srcRow * stride + col * a.bpp;
      px[d] = rgba[s + 2]; px[d + 1] = rgba[s + 1]; px[d + 2] = rgba[s];
      if (a.bpp === 4) px[d + 3] = rgba[s + 3];
    }
  }
  // 차분 걸기 (풀 때의 역순): 아래 줄부터 위 줄을 빼고, 맨 위 줄은 오른쪽부터 왼쪽 픽셀을 뺀다
  const top = (ih - 1) * stride;
  for (let i = 0; i < top; i++) px[i] = (px[i] - px[i + stride]) & 0xff;
  for (let i = top + stride - 1; i >= top + a.bpp; i--) px[i] = (px[i] - px[i - a.bpp]) & 0xff;
  return Buffer.concat([origBuf.subarray(0, a.headerLen), lzssEncode(px)]);
}

// ---- PNG ----
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(b) { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); }
function writePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function readPng(buf) {
  let p = 8, w = 0, h = 0, ct = 0, depth = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; ct = d[9]; if (d[12]) throw new Error('인터레이스 PNG는 지원 안 함'); }
    else if (type === 'IDAT') idat.push(d);
    p += 12 + len;
  }
  if (depth !== 8 || (ct !== 6 && ct !== 2)) throw new Error('8비트 RGB/RGBA PNG만 지원');
  const bpp = ct === 6 ? 4 : 3, rs = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4), cur = Buffer.alloc(rs), prev = Buffer.alloc(rs);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (rs + 1)]; raw.copy(cur, 0, y * (rs + 1) + 1, (y + 1) * (rs + 1));
    for (let i = 0; i < rs; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v = cur[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) { out[(y * w + x) * 4] = cur[x * bpp]; out[(y * w + x) * 4 + 1] = cur[x * bpp + 1]; out[(y * w + x) * 4 + 2] = cur[x * bpp + 2]; out[(y * w + x) * 4 + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    cur.copy(prev);
  }
  return { w, h, rgba: out };
}

module.exports = { decode, encode, writePng, readPng, readAkb, lzssEncode, lzssDecode };

if (require.main === module) {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'topng') {
    const d = decode(fs.readFileSync(a[0]));
    fs.writeFileSync(a[1], writePng(d.w, d.h, d.rgba));
    console.log(JSON.stringify({ w: d.w, h: d.h, bpp: d.bpp * 8, plus: d.plus, rect: [d.x, d.y, d.right, d.bottom] }));
  } else if (cmd === 'frompng') {
    const orig = fs.readFileSync(a[0]);
    const info = readAkb(orig);
    const png = readPng(fs.readFileSync(a[1]));
    if (png.w !== info.w || png.h !== info.h) throw new Error(`크기가 다름: PNG ${png.w}x${png.h}, AKB ${info.w}x${info.h}`);
    fs.writeFileSync(a[2], encode(orig, png.rgba));
    console.log(JSON.stringify({ out: a[2] }));
  } else {
    console.error('사용법: node tools/akb.js topng <입력.akb> <출력.png>\n        node tools/akb.js frompng <원본.akb> <입력.png> <출력.akb>');
    process.exit(1);
  }
}
