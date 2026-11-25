#!/usr/bin/env node
// AI6WIN.exe 리소스(창 메뉴·대화 상자·문자열 표) 한글화
//   node tools/ai6win_exe.js dump  <게임 폴더>                       # 원문 보기
//   node tools/ai6win_exe.js apply <게임 폴더> <번역표.json> [--dry]  # 적용
// apply 는 처음 한 번 AI6WIN.exe 를 AI6WIN.exe.orig 로 보관하고, 항상 .orig 에서 새로 만든다(여러 번 돌려도 같은 결과).
// 되돌리기: AI6WIN.exe.orig 를 AI6WIN.exe 로 복사.
// 리소스는 UTF-16 이라 한글이 시스템 로캘과 관계없이 그대로 보인다. 문자열 표는 게임이 LoadStringA 로 읽으므로 한국어 로캘(cp949)에서 보인다.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// ---- PE 리소스 읽기 ----
function readResources(buf) {
  const pe = buf.readUInt32LE(0x3c);
  const nsec = buf.readUInt16LE(pe + 6);
  const opt = pe + 24;
  const optSize = buf.readUInt16LE(pe + 20);
  const rsrcRva = buf.readUInt32LE(opt + 96 + 2 * 8);
  const secs = [];
  for (let i = 0; i < nsec; i++) {
    const s = opt + optSize + i * 40;
    secs.push({ va: buf.readUInt32LE(s + 12), vsize: buf.readUInt32LE(s + 8), raw: buf.readUInt32LE(s + 20), rsize: buf.readUInt32LE(s + 16) });
  }
  const sec = secs.find((s) => rsrcRva >= s.va && rsrcRva < s.va + Math.max(s.vsize, s.rsize));
  const base = sec.raw + (rsrcRva - sec.va);
  const fileOff = (rva) => rva - sec.va + sec.raw;
  const dir = (o) => {
    const n = buf.readUInt16LE(o + 12) + buf.readUInt16LE(o + 14);
    return Array.from({ length: n }, (_, i) => ({ id: buf.readUInt32LE(o + 16 + i * 8), off: buf.readUInt32LE(o + 20 + i * 8) }));
  };
  const out = [];
  for (const t of dir(base)) for (const n of dir(base + (t.off & 0x7fffffff))) for (const l of dir(base + (n.off & 0x7fffffff))) {
    const d = base + l.off;
    const at = fileOff(buf.readUInt32LE(d));
    out.push({ type: t.id, name: n.id, lang: l.id, data: Buffer.from(buf.subarray(at, at + buf.readUInt32LE(d + 4))) });
  }
  return out;
}

// ---- 읽기·쓰기 도우미 ----
class Reader {
  constructor(b) { this.b = b; this.o = 0; }
  u8() { return this.b[this.o++]; }
  u16() { const v = this.b.readUInt16LE(this.o); this.o += 2; return v; }
  i16() { const v = this.b.readInt16LE(this.o); this.o += 2; return v; }
  u32() { const v = this.b.readUInt32LE(this.o); this.o += 4; return v; }
  wstr() { let e = this.o; while (this.b.readUInt16LE(e)) e += 2; const s = this.b.toString('utf16le', this.o, e); this.o = e + 2; return s; }
  szOrOrd() { if (this.b.readUInt16LE(this.o) === 0xffff) { this.o += 2; return { ord: this.u16() }; } return { str: this.wstr() }; }
  align(n) { this.o = (this.o + n - 1) & ~(n - 1); }
}
class Writer {
  constructor() { this.parts = []; this.len = 0; }
  push(b) { this.parts.push(b); this.len += b.length; }
  u8(v) { this.push(Buffer.from([v])); }
  u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v); this.push(b); }
  i16(v) { const b = Buffer.alloc(2); b.writeInt16LE(v); this.push(b); }
  u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v >>> 0); this.push(b); }
  wstr(s) { this.push(Buffer.from(`${s}\0`, 'utf16le')); }
  szOrOrd(x) { if (x.ord !== undefined) { this.u16(0xffff); this.u16(x.ord); } else this.wstr(x.str); }
  align(n) { while (this.len % n) this.u8(0); }
  buf() { return Buffer.concat(this.parts); }
}

// ---- 메뉴 (MENUTEMPLATE, 표준형) ----
function mapMenu(data, tr, used) {
  const r = new Reader(data);
  const w = new Writer();
  w.u16(r.u16()); w.u16(r.u16()); // version, header size
  const items = [];
  while (r.o < data.length) {
    const flags = r.u16();
    w.u16(flags);
    if (!(flags & 0x10)) w.u16(r.u16()); // 명령 ID (팝업이 아닐 때)
    const s = r.wstr();
    const [label, accel] = s.split('\t');
    const t = tr[label];
    if (t) used.add(label);
    w.wstr(t ? (accel !== undefined ? `${t}\t${accel}` : t) : s);
    items.push(s);
  }
  return { data: w.buf(), items };
}

// ---- 대화 상자 (DLGTEMPLATEEX) ----
function mapDialog(data, tr, used) {
  const r = new Reader(data);
  if (r.b.readUInt16LE(0) !== 1 || r.b.readUInt16LE(2) !== 0xffff) return null; // EX 형식만
  const w = new Writer();
  const texts = [];
  const tx = (s) => { texts.push(s); if (tr[s]) { used.add(s); return tr[s]; } return s; };
  w.u16(r.u16()); w.u16(r.u16()); w.u32(r.u32()); w.u32(r.u32());
  const style = r.u32(); w.u32(style);
  const count = r.u16(); w.u16(count);
  for (let i = 0; i < 4; i++) w.i16(r.i16());
  w.szOrOrd(r.szOrOrd()); w.szOrOrd(r.szOrOrd());
  w.wstr(tx(r.wstr()));
  if (style & 0x40 /* DS_SETFONT */) {
    w.u16(r.u16()); w.u16(r.u16()); w.u8(r.u8());
    r.u8(); w.u8(1); // 글꼴 문자 집합 → DEFAULT_CHARSET (한글이 일본어 글꼴로 바뀌지 않게)
    w.wstr(r.wstr());
  }
  for (let i = 0; i < count; i++) {
    r.align(4); w.align(4);
    w.u32(r.u32()); w.u32(r.u32()); w.u32(r.u32());
    for (let k = 0; k < 4; k++) w.i16(r.i16());
    w.u32(r.u32());
    w.szOrOrd(r.szOrOrd());
    const title = r.szOrOrd();
    w.szOrOrd(title.str !== undefined ? { str: tx(title.str) } : title);
    const extra = r.u16(); w.u16(extra);
    if (extra) { w.push(r.b.subarray(r.o, r.o + extra)); r.o += extra; }
  }
  return { data: w.buf(), texts };
}

// ---- 문자열 표 (16개 묶음) ----
function mapStrings(data, blockId, tr, used) {
  const r = new Reader(data);
  const w = new Writer();
  const items = [];
  for (let k = 0; k < 16; k++) {
    const len = r.u16();
    let s = r.b.toString('utf16le', r.o, r.o + len * 2); r.o += len * 2;
    const no = (blockId - 1) * 16 + k;
    if (len) items.push([no, s]);
    if (tr[String(no)] !== undefined) { s = tr[String(no)]; used.add(String(no)); }
    w.u16(s.length); w.push(Buffer.from(s, 'utf16le'));
  }
  return { data: w.buf(), items };
}

function main() {
  const [cmd, gameDir, tableFile] = process.argv.slice(2);
  const dry = process.argv.includes('--dry');
  if (!['dump', 'apply'].includes(cmd) || !gameDir || (cmd === 'apply' && !tableFile)) {
    console.error('사용법: node tools/ai6win_exe.js dump <게임 폴더>\n        node tools/ai6win_exe.js apply <게임 폴더> <번역표.json> [--dry]');
    process.exit(1);
  }
  const exe = path.join(gameDir, 'AI6WIN.exe');
  const orig = `${exe}.orig`;
  const src = fs.existsSync(orig) ? orig : exe;
  const res = readResources(fs.readFileSync(src));
  const table = cmd === 'apply' ? JSON.parse(fs.readFileSync(tableFile, 'utf8')) : { menu: {}, dialog: {}, string: {} };
  const used = new Set();
  const changes = [];
  for (const r of res) {
    let out = null;
    if (r.type === 4) { const m = mapMenu(r.data, table.menu || {}, used); if (cmd === 'dump') console.log(`MENU ${r.name}:`, m.items.filter(Boolean).join(' | ')); out = m.data; }
    else if (r.type === 5) { const d = mapDialog(r.data, table.dialog || {}, used); if (!d) continue; if (cmd === 'dump') console.log(`DIALOG ${r.name}:`, d.texts.filter(Boolean).join(' | ')); out = d.data; }
    else if (r.type === 6) { const s = mapStrings(r.data, r.name, table.string || {}, used); if (cmd === 'dump') s.items.forEach(([n, t]) => console.log(`STRING ${n}: ${t}`)); out = s.data; }
    if (out && !out.equals(r.data)) changes.push({ type: r.type, name: r.name, lang: r.lang, data: out });
  }
  if (cmd === 'dump') return;
  const all = [...Object.keys(table.menu || {}), ...Object.keys(table.dialog || {}), ...Object.keys(table.string || {})];
  const unused = all.filter((k) => !used.has(k) && !k.startsWith('_'));
  console.log(JSON.stringify({ source: path.basename(src), changedResources: changes.map((c) => `${c.type}/${c.name}`), unusedEntries: unused }));
  if (dry) return;
  if (!fs.existsSync(orig)) fs.copyFileSync(exe, orig);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai6win-res-'));
  const work = path.join(tmp, 'AI6WIN.exe');
  fs.copyFileSync(orig, work);
  const manifest = changes.map((c, i) => { const f = path.join(tmp, `${i}.bin`); fs.writeFileSync(f, c.data); return { type: c.type, name: c.name, lang: c.lang, file: f }; });
  fs.writeFileSync(path.join(tmp, 'list.json'), JSON.stringify(manifest));
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'win_update_resource.ps1'), work, path.join(tmp, 'list.json')], { stdio: 'inherit' });
  fs.copyFileSync(work, exe);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`적용: ${exe} (원본 ${path.basename(orig)})`);
}

main();
