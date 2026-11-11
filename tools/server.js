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
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
};
const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

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
    return { id, name, text };
  });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/ping' && req.method === 'GET') {
    sendJson(res, 200, { ok: true, works: lib.listWorks() });
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
  console.log('이 창을 닫거나 Ctrl+C 를 누르면 서버가 꺼집니다. (이 컴퓨터에서만 접속 가능)');
  if (args.includes('--open')) exec(`start "" "${url}"`);
});
