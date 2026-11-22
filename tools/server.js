#!/usr/bin/env node
// 저장 서버: 이 컴퓨터에서만 열리는 작은 웹 서버. 페이지를 http://127.0.0.1:8787 로 열면
// 페이지에서 고친 내용(프롬프트 등)이 작품 데이터 파일에 바로 저장되고 변경 기록도 남는다.
//
//   node tools/server.js [--port 8787] [--open]      (Windows: 폴더의 `저장서버 켜기.bat` 더블클릭)
//
// - 이 컴퓨터(127.0.0.1)에서만 접속할 수 있고, 다른 사이트에서 오는 저장 요청은 거부한다.
// - 서버를 끄면 페이지는 예전처럼 읽기 전용(브라우저 로컬 수정)으로 동작한다.
// - 회사 PC 등에서는 켤 필요 없이 AI에게 요청하면 된다.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const lib = require('./lib');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const PORT = portIndex !== -1 ? Number(args[portIndex + 1]) : 8787;
const MAX_BODY = 8 * 1024 * 1024;
// CG는 저장소 밖의 로컬 폴더에 둔다. 다른 위치를 쓰려면 서버 실행 전에 PROJECT_H_CG_DIR을 지정한다.
const CG_DIR = path.resolve(process.env.PROJECT_H_CG_DIR || path.join(ROOT, '..', 'CG_extracted_20261111', 'patched_png'));
// 일본어 원본 음성은 저장소 밖의 로컬 폴더에만 둔다. 다른 위치는 PROJECT_H_ORIGINAL_VOICE_DIR로 지정한다.
const ORIGINAL_VOICE_DIR = path.resolve(process.env.PROJECT_H_ORIGINAL_VOICE_DIR || path.join(ROOT, '..', 'ko', 'voice_ja'));
const CG_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
};
const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const naturalName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// 작품별 CG 폴더: work.json 의 "cgDir"(Project_H 기준 상대 경로 또는 절대 경로)이 있으면 그 폴더, 없으면 공용 CG_DIR
function workInfo(workId) {
  if (!workId || !lib.listWorks().includes(workId)) return null;
  return JSON.parse(fs.readFileSync(path.join(lib.WORKS_DIR, workId, 'work.json'), 'utf8'));
}
// 프롬프트 문서에서 파일명(name)이 적힌 곳을 찾아 그 항목을 잘라 낸다.
// 제목(#) 줄에 있으면 그 절 전체, 표의 한 줄이면 절 머리말 + 표 머리 + 그 줄, 그 밖이면 둘러싼 절 전체.
function findCgPrompt(doc, name) {
  const lines = doc.split(/\r?\n/);
  const level = (line) => (/^(#{1,6})\s/.exec(line) || [])[1]?.length || 0;
  const inFence = [];
  let fence = false;
  lines.forEach((line, i) => { if (/^\s*```/.test(line)) fence = !fence; inFence[i] = fence && !/^\s*```/.test(line); });
  const isHeading = (i) => !inFence[i] && level(lines[i]) > 0;
  const prevHeading = (i) => { for (let k = i; k >= 0; k -= 1) if (isHeading(k)) return k; return -1; };
  const sectionEnd = (start) => {
    const lv = level(lines[start]);
    for (let k = start + 1; k < lines.length; k += 1) {
      // 같은 급 이상의 제목, 구분선, 또는 다른 이미지를 가리키는 하위 제목에서 끊는다 (### 캐릭터 1 같은 하위 제목은 포함)
      if (!inFence[k] && (lines[k].trim() === '---' || (isHeading(k) && (level(lines[k]) <= lv || lines[k].includes('novelai/'))))) return k;
    }
    return lines.length;
  };
  // 확장자는 무시하고 파일 이름으로 찾는다 (문서엔 .png, 실제 파일은 .webp 인 경우 등)
  const stem = name.replace(/\.[^.]+$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(^|[\\/\`\\s])${stem}\\.(png|jpe?g|webp|gif)(?=[\`\\s,)|]|$)`);
  const hits = lines.map((line, i) => (!inFence[i] && pattern.test(line) ? i : -1)).filter((i) => i >= 0);
  if (!hits.length) return { found: false, reason: `프롬프트 문서에 ${name} 항목이 없습니다.` };
  const pick = hits.find(isHeading) ?? hits.find((i) => lines[i].trim().startsWith('|')) ?? hits[0];
  const head = prevHeading(pick);
  const title = head >= 0 ? lines[head].replace(/^#+\s*/, '') : name;
  let text;
  if (isHeading(pick)) text = lines.slice(pick, sectionEnd(pick)).join('\n');
  else if (lines[pick].trim().startsWith('|')) {
    let top = pick;
    while (top > 0 && lines[top - 1].trim().startsWith('|')) top -= 1;
    const intro = head >= 0 ? lines.slice(head, top) : [];
    text = [...intro, lines[top], lines[top + 1], lines[pick]].join('\n');
  } else text = head >= 0 ? lines.slice(head, sectionEnd(head)).join('\n') : lines[pick];
  return { found: true, title, text: text.trim(), others: hits.length - 1 };
}

function cgDirFor(workId) {
  const info = workInfo(workId);
  return info && info.cgDir ? path.resolve(ROOT, info.cgDir) : CG_DIR;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('요청이 너무 큽니다.')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validateTemplates(list) {
  if (!Array.isArray(list)) throw new Error('templates 는 배열이어야 합니다.');
  const seen = new Set();
  return list.map((item, i) => {
    const id = item && item.id;
    const name = item && typeof item.name === 'string' ? item.name.trim() : '';
    const text = item && typeof item.text === 'string' ? item.text.trim() : '';
    if (typeof id !== 'string' || !lib.ID_PATTERN.test(id)) throw new Error(`#${i + 1}: 템플릿 ID가 올바르지 않습니다.`);
    if (seen.has(id)) throw new Error(`#${i + 1}: 템플릿 ID가 겹칩니다 (${id}).`);
    if (!name || !text) throw new Error(`#${i + 1}: 이름과 프롬프트 내용을 모두 적어야 합니다.`);
    seen.add(id);
    return { id, group: lib.promptGroup(item.group), name, text };
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/ping' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, works: lib.listWorks() });
    return;
  }
  if (pathname === '/api/cg-prompt' && req.method === 'GET') {
    // CG 한 장을 만들 때 쓴 프롬프트: work.json 의 cgPromptDoc(마크다운)에서 그 파일명이 적힌 항목을 찾아 돌려준다
    const params = new URL(req.url, 'http://localhost').searchParams;
    const info = workInfo(params.get('work'));
    const name = path.basename(String(params.get('name') || ''));
    if (!info || !info.cgPromptDoc || !name) { sendJson(res, 200, { found: false, reason: '이 작품에는 프롬프트 문서가 연결되어 있지 않습니다.' }); return; }
    const docPath = path.resolve(ROOT, info.cgPromptDoc);
    if (!docPath.startsWith(ROOT + path.sep) || !fs.existsSync(docPath)) { sendJson(res, 200, { found: false, reason: '프롬프트 문서를 찾지 못했습니다.' }); return; }
    sendJson(res, 200, findCgPrompt(fs.readFileSync(docPath, 'utf8'), name));
    return;
  }
  if (pathname === '/api/cg' && req.method === 'GET') {
    // 작품별: work.json 에 "cg": false 인 작품에는 CG 목록을 주지 않는다 (공용 CG 폴더가 다른 작품 것이므로)
    const workId = new URL(req.url, 'http://localhost').searchParams.get('work');
    const info = workInfo(workId);
    if (info && info.cg === false) { sendJson(res, 200, { available: false, path: '(이 작품은 CG 없음)', files: [] }); return; }
    // 탭만 정해 두고 폴더는 아직 연결하지 않은 작품: 공용 CG 폴더(다른 작품 것)를 보여 주지 않는다
    if (info && info.cgTabs && !info.cgDir) { sendJson(res, 200, { available: false, pending: true, path: '(아직 연결하지 않음)', files: [] }); return; }
    const dir = cgDirFor(workId);
    const query = info && info.cgDir ? `?work=${encodeURIComponent(workId)}` : '';
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      sendJson(res, 200, { available: false, path: dir, files: [] });
      return;
    }
    // 탭이 있는 작품은 cgDir/<탭>/ 를, 하위 탭(cgSubTabs[탭])이 있으면 cgDir/<탭>/<하위 탭>/ 까지 읽는다.
    // 파일마다 category(탭)·sub(하위 탭, 탭 폴더 바로 아래 파일은 '')를 붙인다
    const folders = [];
    if (info && info.cgTabs) {
      info.cgTabs.forEach((tab) => {
        folders.push([tab, '', path.join(dir, tab)]);
        (info.cgSubTabs?.[tab] || []).forEach((sub) => folders.push([tab, sub, path.join(dir, tab, sub)]));
      });
    } else folders.push(['', '', dir]);
    const files = folders.flatMap(([category, sub, folder]) => {
      if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) return [];
      return fs.readdirSync(folder, { withFileTypes: true })
        .filter((entry) => entry.isFile() && CG_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
        .map((entry) => {
          const stat = fs.statSync(path.join(folder, entry.name));
          const prefix = [category, sub].filter(Boolean).map((part) => `${encodeURIComponent(part)}/`).join('');
          const item = { name: entry.name, size: stat.size, url: `/media/cg/${prefix}${encodeURIComponent(entry.name)}${query}` };
          if (category) { item.category = category; item.sub = sub; }
          return item;
        })
        .sort((a, b) => naturalName.compare(a.name, b.name));
    });
    sendJson(res, 200, { available: true, path: dir, files });
    return;
  }
  if (req.method !== 'POST') { sendJson(res, 405, { error: '허용되지 않는 요청입니다.' }); return; }
  // 다른 웹사이트가 이 서버로 저장 요청을 보내지 못하게: Origin 확인 + JSON 요청만 허용
  const origin = req.headers.origin;
  if (origin && !allowedHosts.has(origin.replace(/^https?:\/\//, ''))) { sendJson(res, 403, { error: '허용되지 않는 출처입니다.' }); return; }
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) { sendJson(res, 415, { error: 'JSON 요청만 받습니다.' }); return; }
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (error) { sendJson(res, 400, { error: `요청을 읽을 수 없습니다: ${error.message}` }); return; }
  try {
    lib.useWork(body.work);
    if (pathname === '/api/set') {
      const summary = lib.applyPatch(String(body.scene), body.patch, typeof body.note === 'string' ? body.note : '페이지에서 수정');
      console.log(`[저장] ${body.work}/${body.scene}: ${summary.changedRows}행 변경 ${summary.batch ? `(${summary.batch})` : '(변경 없음)'}`);
      sendJson(res, 200, summary);
    } else if (pathname === '/api/templates') {
      const templates = validateTemplates(body.templates);
      lib.writePrompts(templates);
      console.log(`[템플릿] ${body.work}: ${templates.length}개 저장`);
      sendJson(res, 200, { templates });
    } else sendJson(res, 404, { error: '알 수 없는 요청입니다.' });
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
}

function serveCg(req, res, pathname) {
  const encodedName = pathname.slice('/media/cg/'.length);
  const workId = new URL(req.url, 'http://localhost').searchParams.get('work');
  const info = workInfo(workId);
  // "<탭>/<파일>", "<탭>/<하위 탭>/<파일>" 형태는 그 작품의 cgTabs·cgSubTabs 에 적힌 폴더만 허용
  const parts = encodedName.split('/');
  let tab = '';
  let sub = '';
  let name;
  try {
    if (parts.length > 3) throw new Error('bad');
    const decoded = parts.map((part) => decodeURIComponent(part));
    name = decoded.pop();
    [tab = '', sub = ''] = decoded;
  } catch { res.writeHead(400); res.end('bad path'); return; }
  if (tab && !(info && Array.isArray(info.cgTabs) && info.cgTabs.includes(tab))) { res.writeHead(403); res.end('forbidden'); return; }
  if (sub && !(info.cgSubTabs?.[tab] || []).includes(sub)) { res.writeHead(403); res.end('forbidden'); return; }
  if (!name || name !== path.basename(name) || !CG_EXTENSIONS.has(path.extname(name).toLowerCase())) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  const target = path.join(cgDirFor(workId), tab, sub, name);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  fs.createReadStream(target).pipe(res);
}

function serveOriginalVoice(req, res, pathname) {
  const encodedName = pathname.slice('/media/voice-ja/'.length);
  let name;
  try { name = decodeURIComponent(encodedName); } catch { res.writeHead(400); res.end('bad path'); return; }
  if (!name || name !== path.basename(name) || path.extname(name).toLowerCase() !== '.ogg') {
    res.writeHead(403); res.end('forbidden'); return;
  }
  const target = path.join(ORIGINAL_VOICE_DIR, name);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end('not found'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end('method not allowed'); return; }
  const stat = fs.statSync(target);
  const headers = {
    'Content-Type': 'audio/ogg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  };
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= stat.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); res.end(); return;
    }
    res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stat.size}` });
    if (req.method === 'HEAD') res.end(); else fs.createReadStream(target, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(target).pipe(res);
}

function serveStatic(res, pathname) {
  let target = path.resolve(ROOT, `.${decodeURIComponent(pathname)}`);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end('forbidden'); return; }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  const relative = path.relative(ROOT, target).split(path.sep);
  if (relative.some((part) => part.startsWith('.')) || !fs.existsSync(target)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer((req, res) => {
  if (!allowedHosts.has(req.headers.host || '')) { res.writeHead(403); res.end('forbidden host'); return; }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname.startsWith('/api/')) handleApi(req, res, pathname).catch((error) => sendJson(res, 500, { error: error.message }));
  else if (pathname.startsWith('/media/cg/')) serveCg(req, res, pathname);
  else if (pathname.startsWith('/media/voice-ja/')) serveOriginalVoice(req, res, pathname);
  else serveStatic(res, pathname);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') console.error(`포트 ${PORT}가 이미 사용 중입니다. 저장 서버가 이미 켜져 있을 수 있습니다 (http://127.0.0.1:${PORT}/). 다른 포트는 --port 로 지정하세요.`);
  else console.error(error.message);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log(`저장 서버 실행 중: ${url}`);
  console.log(`일본어 원본 음성: ${ORIGINAL_VOICE_DIR}`);
  console.log(`CG 폴더: ${CG_DIR}`);
  console.log('이 창을 닫거나 Ctrl+C 를 누르면 서버가 꺼집니다. (이 컴퓨터에서만 접속 가능)');
  if (args.includes('--open')) exec(`start "" "${url}"`);
});
