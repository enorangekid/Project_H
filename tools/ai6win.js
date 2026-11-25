#!/usr/bin/env node
// AI6WIN(Silky's) .arc 아카이브 도구 — 목록 보기·꺼내기·파일 교체·되돌리기 (여계가족 3 등)
//   node tools/ai6win.js list    <아카이브.arc> [--filter 정규식]
//   node tools/ai6win.js extract <아카이브.arc> <출력 폴더> [--filter 정규식] [--raw]
//   node tools/ai6win.js replace <아카이브.arc> <새 파일>... [--pack]   # 같은 이름의 항목을 새 파일로 바꿈
//   node tools/ai6win.js restore <아카이브.arc>                          # replace/rebuild 전 상태로 정확히 되돌림
//   node tools/ai6win.js rebuild <아카이브.arc> <새 파일>... [--pack]   # 아카이브를 통째로 다시 만듦 (mes.arc 용)
//
// ※ mes.arc(대본)는 게임이 목록의 위치 값을 쓰지 않고 "목록 순서대로 빈틈없이 붙어 있다"고 보고 앞 파일들의 압축 크기를
//   더해 위치를 계산한다(2026-11-25 확인: 끝에 덧붙인 대본은 무시되고, 압축 없이 넣으면 원래 자리를 잘못 읽어 게임이 꺼짐).
//   그래서 mes.arc 는 replace 가 아니라 rebuild 를 쓴다. layer.arc 는 위치 값을 쓰므로 replace(덧붙이기)로 된다.
// 형식: [u32 파일 수] + 파일마다 272바이트 [이름 260바이트 | u32BE 압축 크기 | u32BE 원래 크기 | u32BE 위치]
// 이름은 글자마다 (이름 길이+1)부터 1씩 줄어드는 값을 더해 저장돼 있고, 내용은 LZSS 압축(압축 크기 = 원래 크기면 압축 안 함).
//
// replace 는 아카이브를 통째로 다시 쓰지 않는다(layer.arc 는 1GB). 새 내용을 파일 끝에 덧붙이고 목록의 위치·크기만 고친다.
// 처음 replace 할 때 원래 목록과 원래 파일 길이를 <아카이브>.orig-index 에 보관하고, 다시 replace 하면 그 원래 상태에서 새로 시작한다
// (덧붙인 내용이 쌓이지 않음). restore 는 그 보관본으로 목록을 되돌리고 덧붙인 부분을 잘라낸다.
// --pack: 새 파일을 LZSS 로 압축해 넣음 (원래 항목이 압축돼 있던 아카이브 — mes.arc 등). 압축 안 된 항목(layer.arc 의 .akb)은 생략.
'use strict';
const fs = require('fs');
const path = require('path');

const ENTRY = 272;

function readAt(fd, pos, len) {
  const b = Buffer.alloc(len);
  let done = 0;
  while (done < len) { const n = fs.readSync(fd, b, done, len - done, pos + done); if (!n) throw new Error('파일 끝을 넘어 읽음'); done += n; }
  return b;
}

function decodeName(raw) {
  let key = raw.length + 1;
  return Buffer.from(raw.map((c) => (c - key--) & 0xff)).toString('latin1');
}

function readIndexFd(fd) {
  const count = readAt(fd, 0, 4).readUInt32LE(0);
  const size = fs.fstatSync(fd).size;
  if (count === 0 || 4 + count * ENTRY > size) throw new Error('AI6WIN .arc 형식이 아님');
  const idx = readAt(fd, 4, count * ENTRY);
  const files = [];
  for (let i = 0; i < count; i++) {
    const o = i * ENTRY;
    let e = o;
    while (e < o + 260 && idx[e]) e++;
    files.push({ i, name: decodeName(idx.subarray(o, e)), packed: idx.readUInt32BE(o + 260), size: idx.readUInt32BE(o + 264), offset: idx.readUInt32BE(o + 268) });
  }
  return { count, idx, files };
}

// 표준 LZSS (창 4096, 시작 위치 0xFEE, 플래그 비트 1 = 그대로 1바이트)
function lzss(src, outSize) {
  const out = Buffer.alloc(outSize);
  const win = Buffer.alloc(4096);
  let wp = 0xfee, sp = 0, op = 0, flags = 0;
  while (op < outSize && sp < src.length) {
    flags >>= 1;
    if (!(flags & 0x100)) flags = src[sp++] | 0xff00;
    if (flags & 1) {
      const c = src[sp++];
      out[op++] = c; win[wp] = c; wp = (wp + 1) & 0xfff;
    } else {
      if (sp + 1 >= src.length) break;
      const lo = src[sp++], hi = src[sp++];
      const off = lo | ((hi & 0xf0) << 4);
      const len = (hi & 0x0f) + 3;
      for (let k = 0; k < len && op < outSize; k++) {
        const c = win[(off + k) & 0xfff];
        out[op++] = c; win[wp] = c; wp = (wp + 1) & 0xfff;
      }
    }
  }
  return op === outSize ? out : out.subarray(0, op);
}

function backupFile(arc) { return `${arc}.orig-index`; }

// 보관본: [u32 원래 길이(하위)][u32 원래 길이(상위)][원래 목록 바이트]
function loadOrSaveBackup(arc, fd, idx) {
  const bf = backupFile(arc);
  if (fs.existsSync(bf)) {
    const b = fs.readFileSync(bf);
    return { length: b.readUInt32LE(0) + b.readUInt32LE(4) * 0x100000000, idx: b.subarray(8) };
  }
  const length = fs.fstatSync(fd).size;
  const head = Buffer.alloc(8);
  head.writeUInt32LE(length % 0x100000000, 0); head.writeUInt32LE(Math.floor(length / 0x100000000), 4);
  fs.writeFileSync(bf, Buffer.concat([head, idx]));
  return { length, idx: Buffer.from(idx) };
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const fi = args.indexOf('--filter');
  const filter = fi >= 0 ? new RegExp(args[fi + 1], 'i') : null;
  const rawMode = args.includes('--raw');
  const pos = args.filter((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1)).slice(1);
  if (!['list', 'extract', 'replace', 'restore', 'rebuild'].includes(cmd) || !pos[0] || ((cmd === 'replace' || cmd === 'rebuild') && pos.length < 2)) {
    console.error('사용법: node tools/ai6win.js list <아카이브.arc> [--filter 정규식]\n        node tools/ai6win.js extract <아카이브.arc> <출력 폴더> [--filter 정규식] [--raw]\n        node tools/ai6win.js replace <아카이브.arc> <새 파일>... [--pack]\n        node tools/ai6win.js restore <아카이브.arc>');
    process.exit(1);
  }
  const arc = pos[0];

  if (cmd === 'rebuild') {
    const full = `${arc}.orig`;
    if (fs.existsSync(backupFile(arc))) throw new Error(`${path.basename(arc)} 는 replace 로 바뀐 상태 — 먼저 restore 할 것`);
    if (!fs.existsSync(full)) fs.copyFileSync(arc, full);
    const src = fs.readFileSync(full);
    const fd = fs.openSync(full, 'r');
    const { count, idx, files } = readIndexFd(fd);
    fs.closeSync(fd);
    const repl = new Map(pos.slice(1).map((p) => [path.basename(p).toLowerCase(), p]));
    const newIdx = Buffer.from(idx);
    const parts = [];
    let off = 4 + count * ENTRY;
    const done = [];
    for (const f of files) {
      let stored = src.subarray(f.offset, f.offset + f.packed);
      let size = f.size;
      const p = repl.get(f.name.toLowerCase());
      if (p) {
        const data = fs.readFileSync(p);
        stored = args.includes('--pack') ? require('./akb').lzssEncode(data) : data;
        size = data.length;
        repl.delete(f.name.toLowerCase());
        done.push({ name: f.name, size, stored: stored.length });
      }
      const o = f.i * ENTRY;
      newIdx.writeUInt32BE(stored.length, o + 260);
      newIdx.writeUInt32BE(size, o + 264);
      newIdx.writeUInt32BE(off, o + 268);
      parts.push(stored);
      off += stored.length;
    }
    if (repl.size) throw new Error(`아카이브에 없는 이름: ${[...repl.keys()].join(', ')}`);
    const head = Buffer.alloc(4); head.writeUInt32LE(count);
    fs.writeFileSync(arc, Buffer.concat([head, newIdx, ...parts]));
    console.log(JSON.stringify({ archive: arc, rebuilt: done, length: off, original: path.basename(full) }));
    return;
  }

  if (cmd === 'restore') {
    if (fs.existsSync(`${arc}.orig`)) {
      fs.copyFileSync(`${arc}.orig`, arc);
      fs.unlinkSync(`${arc}.orig`);
      console.log(JSON.stringify({ restored: arc, from: `${path.basename(arc)}.orig` }));
      return;
    }
    if (!fs.existsSync(backupFile(arc))) { console.log('보관본 없음 — 바꾼 적이 없음'); return; }
    const fd = fs.openSync(arc, 'r+');
    const { length, idx } = loadOrSaveBackup(arc, fd, null);
    fs.writeSync(fd, idx, 0, idx.length, 4);
    fs.ftruncateSync(fd, length);
    fs.closeSync(fd);
    fs.unlinkSync(backupFile(arc));
    console.log(JSON.stringify({ restored: arc, length }));
    return;
  }

  if (cmd === 'replace') {
    const fd = fs.openSync(arc, 'r+');
    const cur = readIndexFd(fd);
    const backup = loadOrSaveBackup(arc, fd, cur.idx);
    // 항상 원래 상태에서 시작: 원래 목록으로 덮고 원래 길이로 자른 뒤 이번 파일들만 덧붙인다
    const idx = Buffer.from(backup.idx);
    fs.ftruncateSync(fd, backup.length);
    let end = backup.length;
    const { files } = (() => { fs.writeSync(fd, idx, 0, idx.length, 4); return readIndexFd(fd); })();
    const byName = new Map(files.map((f) => [f.name.toLowerCase(), f]));
    const done = [];
    for (const p of pos.slice(1)) {
      const name = path.basename(p).toLowerCase();
      const f = byName.get(name);
      if (!f) { fs.closeSync(fd); throw new Error(`아카이브에 없는 이름: ${path.basename(p)}`); }
      const data = fs.readFileSync(p);
      let stored = data;
      if (args.includes('--pack')) stored = require('./akb').lzssEncode(data);
      if (end + stored.length > 0xffffffff) { fs.closeSync(fd); throw new Error('아카이브가 4GB를 넘음'); }
      fs.writeSync(fd, stored, 0, stored.length, end);
      const o = f.i * ENTRY;
      idx.writeUInt32BE(stored.length, o + 260);
      idx.writeUInt32BE(data.length, o + 264);
      idx.writeUInt32BE(end, o + 268);
      done.push({ name: f.name, size: data.length, stored: stored.length, offset: end });
      end += stored.length;
    }
    fs.writeSync(fd, idx, 0, idx.length, 4);
    fs.closeSync(fd);
    console.log(JSON.stringify({ archive: arc, replaced: done, originalLength: backup.length, newLength: end }));
    return;
  }

  const fd = fs.openSync(arc, 'r');
  const files = readIndexFd(fd).files.filter((f) => !filter || filter.test(f.name));
  if (cmd === 'list') {
    for (const f of files) console.log(`${f.size}\t${f.packed}\t${f.name}`);
    console.error(`파일 ${files.length}개`);
    fs.closeSync(fd);
    return;
  }
  const out = path.resolve(pos[1] || '.');
  fs.mkdirSync(out, { recursive: true });
  let ok = 0, bad = 0;
  for (const f of files) {
    if (!/^[\w.\-]+$/.test(f.name)) { console.error(`건너뜀 (이름 이상): ${f.name}`); bad++; continue; }
    const src = readAt(fd, f.offset, f.packed);
    const data = rawMode || f.packed === f.size ? src : lzss(src, f.size);
    if (data.length !== f.size) { console.error(`크기 불일치: ${f.name} (${data.length}/${f.size})`); bad++; }
    fs.writeFileSync(path.join(out, f.name), data);
    ok++;
  }
  fs.closeSync(fd);
  console.log(JSON.stringify({ archive: arc, out, extracted: ok, problems: bad }));
}

main();
