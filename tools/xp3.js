#!/usr/bin/env node
// KiriKiri XP3 아카이브 읽기 도구 (목록 보기·파일 꺼내기)
//   node tools/xp3.js list <아카이브.xp3> [--filter <정규식>]
//   node tools/xp3.js extract <아카이브.xp3> <출력 폴더> [--filter <정규식>]
// 암호화되지 않은 표준 XP3만 처리합니다. 내용이 암호화된 파일은 "encrypted" 표시와 함께 그대로 저장합니다.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MAGIC = Buffer.from([0x58, 0x50, 0x33, 0x0d, 0x0a, 0x20, 0x0a, 0x1a, 0x8b, 0x67, 0x01]);

function readAt(fd, pos, len) {
  const buf = Buffer.alloc(len);
  let done = 0;
  while (done < len) {
    const n = fs.readSync(fd, buf, done, len - done, pos + done);
    if (n === 0) throw new Error(`파일 끝을 넘어 읽으려 함 (위치 ${pos + done})`);
    done += n;
  }
  return buf;
}

function u64(buf, off) {
  const v = buf.readBigUInt64LE(off);
  if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('64비트 값이 너무 큼');
  return Number(v);
}

function readIndex(fd) {
  const head = readAt(fd, 0, 32);
  if (!head.subarray(0, 11).equals(MAGIC)) throw new Error('XP3 파일이 아님');
  let indexOffset = u64(head, 11);
  if (indexOffset === 0x17) {
    // 버전 2 헤더: 19번째 바이트에 [u32 0x01], 0x17 위치에 [u8 0x80][u64 0][u64 진짜 인덱스 위치]
    const cinfo = readAt(fd, 0x17, 17);
    indexOffset = u64(cinfo, 9);
  }
  for (;;) {
    const flag = readAt(fd, indexOffset, 1)[0];
    let data;
    if ((flag & 7) === 1) {
      const sizes = readAt(fd, indexOffset + 1, 16);
      const packed = u64(sizes, 0);
      data = zlib.inflateSync(readAt(fd, indexOffset + 17, packed));
    } else {
      const size = u64(readAt(fd, indexOffset + 1, 8), 0);
      data = readAt(fd, indexOffset + 9, size);
    }
    if (flag & 0x80) { indexOffset = u64(data, 0); continue; } // 이어지는 인덱스
    return data;
  }
}

function parseIndex(data) {
  const files = [];
  const extra = {};
  let p = 0;
  while (p + 12 <= data.length) {
    const tag = data.toString('latin1', p, p + 4);
    const size = u64(data, p + 4);
    const body = data.subarray(p + 12, p + 12 + size);
    p += 12 + size;
    if (tag !== 'File') { extra[tag] = (extra[tag] || 0) + 1; continue; }
    const f = { segments: [], chunks: [] };
    let q = 0;
    while (q + 12 <= body.length) {
      const ct = body.toString('latin1', q, q + 4);
      const cs = u64(body, q + 4);
      const cb = body.subarray(q + 12, q + 12 + cs);
      q += 12 + cs;
      f.chunks.push(ct);
      if (ct === 'info') {
        f.flags = cb.readUInt32LE(0);
        f.size = u64(cb, 4);
        f.packed = u64(cb, 12);
        const nlen = cb.readUInt16LE(20);
        f.name = cb.toString('utf16le', 22, 22 + nlen * 2);
      } else if (ct === 'segm') {
        for (let s = 0; s + 28 <= cb.length; s += 28) {
          f.segments.push({ compressed: (cb.readUInt32LE(s) & 7) === 1, offset: u64(cb, s + 4), size: u64(cb, s + 12), packed: u64(cb, s + 20) });
        }
      } else if (ct === 'adlr') {
        f.adler = cb.readUInt32LE(0);
      }
    }
    files.push(f);
  }
  return { files, extra };
}

function readFile(fd, f) {
  const parts = f.segments.map(s => {
    const raw = readAt(fd, s.offset, s.packed);
    return s.compressed ? zlib.inflateSync(raw) : raw;
  });
  return Buffer.concat(parts);
}

function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const fi = args.indexOf('--filter');
  const filter = fi >= 0 ? new RegExp(args[fi + 1], 'i') : null;
  const pos = args.filter((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1)).slice(1);
  if (!['list', 'extract'].includes(cmd) || !pos[0]) {
    console.error('사용법: node tools/xp3.js list <아카이브.xp3> [--filter 정규식]\n        node tools/xp3.js extract <아카이브.xp3> <출력 폴더> [--filter 정규식]');
    process.exit(1);
  }
  const fd = fs.openSync(pos[0], 'r');
  const { files, extra } = parseIndex(readIndex(fd));
  const sel = files.filter(f => !filter || filter.test(f.name || ''));
  if (cmd === 'list') {
    for (const f of sel) console.log(`${f.size}\t${f.flags ? 'encrypted' : ''}\t${f.name}`);
    console.error(`파일 ${files.length}개 (표시 ${sel.length}개)` + (Object.keys(extra).length ? `, 기타 청크: ${JSON.stringify(extra)}` : ''));
    return;
  }
  const out = path.resolve(pos[1] || '.');
  let ok = 0, bad = 0, enc = 0;
  for (const f of sel) {
    const rel = (f.name || '').replace(/\\/g, '/');
    if (!rel || rel.split('/').some(s => s === '..' || s === '') || path.isAbsolute(rel) || /^[a-z]:/i.test(rel)) {
      console.error(`건너뜀 (경로 이상): ${f.name}`); bad++; continue;
    }
    const data = readFile(fd, f);
    if (f.adler !== undefined && adler32(data) !== f.adler && !f.flags) { console.error(`체크섬 불일치: ${rel}`); bad++; }
    if (f.flags) enc++;
    const dest = path.join(out, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
    ok++;
  }
  console.log(JSON.stringify({ archive: pos[0], out, extracted: ok, problems: bad, encrypted: enc }));
}

main();
