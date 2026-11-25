#!/usr/bin/env node
// 마크다운 대본(엘도르 연대기 형식) → 작업실 씬 데이터. 원본은 md 이고, 이 도구로 언제든 다시 만든다.
//   node tools/md_script.js --work eldor 프롤로그=docs/eldor/eldor_prologue_script.md 1막=docs/eldor/eldor_act1_script.md [--dry]
//   (인자 = <씬 종류>=<md 파일>, 적은 순서대로 씬이 놓인다)
//
// md 형식 (eldor_prologue_script.md 의 "표기 규칙"):
//   # 프롤로그 / # 제N장 제목  → 씬 하나 (ID: PRO, CH01 …)     ## … (부록·메모)부터는 읽지 않음
//   ### P-01 제목              → 단계,  바로 아래 "> …" 줄은 단계 설명
//   N: 나레이션 · 이름: 대사 · VO 이름: (memo VO) · 이름(속말): (memo 속말)
//   ? 선택 …  + "  1) 보기" 줄들 → 선택지 한 줄, 보기 아래 들여쓴 줄은 memo [선택 … n)] 로 표시
//   @조사 … · - **항목** — … · (연출: …) · (단서 획득: …) · → 변수 · [if …] → 화자 "연출"/"조사" 줄
//   ⇒ P-00 (다음 장면) 은 건너뜀
// 다시 만들 때 같은 씬·같은 문장의 🚩 검수 표시(review)는 옮겨 붙인다. 작업실에서 대사를 고치면 다음 변환 때 덮어써지므로 고치는 곳은 md.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const workIdx = args.indexOf('--work');
const workId = workIdx >= 0 ? args[workIdx + 1] : null;
const dry = args.includes('--dry');
const sources = args.filter((a, i) => a.includes('=') && i !== workIdx + 1).map((a) => { const [type, file] = a.split('='); return { type, file }; });
if (!workId || !sources.length) { console.error('사용법: node tools/md_script.js --work <작품ID> <종류>=<md 파일> ... [--dry]'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const dataDir = path.join(ROOT, 'works', workId, 'data');
const scenesDir = path.join(dataDir, 'scenes');
const clean = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();
const NUM = ['', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

function sceneIdOf(title, used) {
  let id;
  if (/^프롤로그/.test(title)) id = 'PRO';
  else { const m = /^제\s*(\d+)\s*장/.exec(title); id = m ? `CH${String(m[1]).padStart(2, '0')}` : `S${used.size + 1}`; }
  while (used.has(id)) id += 'x';
  used.add(id);
  return id;
}

function parse(md, type, used) {
  const scenes = [];
  let scene = null; let phase = null; let choice = null; let optTag = ''; let stop = false;
  const lines = md.split(/\r?\n/);
  const push = (speaker, korean, memo = '') => {
    if (!scene) return;
    if (!phase) { phase = { name: '(시작)', detail: '', rows: [] }; scene.phases.push(phase); }
    phase.rows.push({ speaker, korean: clean(korean), memo: [optTag && `[${optTag}]`, memo].filter(Boolean).join(' ') });
  };
  const flushChoice = () => {
    if (!choice) return;
    // 선택지 줄은 보기 아래 대사보다 앞에 와야 하므로, 모아 둔 자리(choice.at)에 끼워 넣는다
    // 새 가족 선택지 줄과 같은 모양: "▶ 보기1 / ▶ 보기2 — 설명"
    const opts = choice.opts.map((o) => `▶ ${o.replace(/^\d+\)\s*/, '')}`).join(' / ');
    const row = { speaker: '선택지', korean: `${opts || choice.head} — ${choice.head.replace(/\s+—\s+/, ' · ')}`, memo: '' };
    choice.phase.rows.splice(choice.at, 0, row);
    choice = null; optTag = '';
  };
  for (const raw of lines) {
    if (stop) break;
    const line = raw.replace(/\s+$/, '');
    const t = line.trim();
    if (/^# /.test(line)) {
      const title = clean(line.slice(2));
      if (/스크립트|초안/.test(title) && !/^(프롤로그|제\s*\d+\s*장)/.test(title)) continue; // 문서 제목
      flushChoice();
      scene = { id: sceneIdOf(title, used), type, detail: title, phases: [] }; phase = null;
      scenes.push(scene);
      continue;
    }
    if (/^## /.test(line)) { if (scene) { flushChoice(); stop = true; } continue; } // 부록·메모부터는 대본이 아님
    if (!scene) continue;
    if (/^### /.test(line)) { flushChoice(); phase = { name: clean(line.slice(4)), detail: '', rows: [] }; scene.phases.push(phase); continue; }
    if (!t || /^---+$/.test(t) || t.startsWith('|')) continue;
    if (t.startsWith('>')) { if (phase && !phase.rows.length) { phase.detail = [phase.detail, clean(t.replace(/^>\s*/, ''))].filter(Boolean).join(' · '); } continue; }
    if (t.startsWith('⇒')) { if (choice && optTag) choice.opts[choice.opts.length - 1] += ` ${t}`; continue; }
    const indent = line.length - line.trimStart().length;
    if (choice && indent === 0 && !/^\d+\)/.test(t)) flushChoice();
    let m;
    if ((m = /^\?\s*(선택.*)$/.exec(t))) {
      flushChoice();
      if (!phase) push('연출', '');
      choice = { head: clean(m[1]), opts: [], phase, at: phase.rows.length }; optTag = '';
      continue;
    }
    if (choice && (m = /^(\d+)\)\s*(.+)$/.exec(t))) {
      choice.opts.push(clean(`${m[1]}) ${m[2]}`));
      optTag = `${choice.head.replace(/\s*—.*$/, '').replace(/^선택\s*/, '선택 ')} ${m[1]})`;
      continue;
    }
    if ((m = /^→\s*(.+)$/.exec(t))) {
      if (choice && optTag && /^⇒/.test(m[1])) { choice.opts[choice.opts.length - 1] += ` ${clean(m[1])}`; continue; }
      push('연출', `변수: ${m[1]}`); continue;
    }
    if ((m = /^@조사\s*(.*)$/.exec(t))) { push('연출', `조사 — ${m[1]}`); continue; }
    if ((m = /^-\s+\*\*(.+?)\*\*\s*(?:—\s*(.*))?$/.exec(t))) { push('조사', m[2] ? `${m[1]} — ${m[2]}` : m[1]); continue; }
    if (/^\[(if|else|end)/.test(t) || t.startsWith('(')) { push('연출', t.replace(/^\(([^)]*)\)/, '$1')); continue; }
    if ((m = /^N:\s*(.*)$/.exec(t))) { push('나레이션', m[1]); continue; }
    if ((m = /^VO\s+([^:：]{1,12}):\s*(.*)$/.exec(t))) { push(m[1].trim(), m[2], 'VO'); continue; }
    if ((m = /^([^:：()\-@?\[\s][^:：]{0,14}?)\s*\(속말\)\s*:\s*(.*)$/.exec(t))) { push(m[1].trim(), m[2], '속말'); continue; }
    if ((m = /^([^:：()\-@?\[\s*][^:：]{0,14}?):\s*(.+)$/.exec(t))) {
      const who = m[1].trim();
      // 추리 화면 같은 진행 표시(단서 후보·정답·질문 N)는 인물이 아니라 연출 줄로
      if (/^(단서 후보|정답|오답|질문\s*\d*|결과|힌트|조건)$/.test(who)) push('연출', `${who}: ${m[2]}`);
      else push(who, m[2]);
      continue;
    }
    if (t.startsWith('- ')) { push('연출', t.slice(2)); continue; }
    push('나레이션', t); // 표기 없이 쓴 문장
  }
  flushChoice();
  return scenes;
}

const used = new Set();
const scenes = sources.flatMap(({ type, file }) => parse(fs.readFileSync(path.resolve(ROOT, file), 'utf8'), type, used));

// 기존 🚩 표시 옮겨 붙이기 (같은 씬·같은 화자·같은 문장)
const oldReview = new Map();
if (fs.existsSync(scenesDir)) {
  for (const f of fs.readdirSync(scenesDir)) {
    const sb = { window: {} };
    try { require('vm').runInNewContext(fs.readFileSync(path.join(scenesDir, f), 'utf8'), sb); } catch { continue; }
    Object.entries(sb.window.PROJECT_H_SCENES || {}).forEach(([sid, rows]) => rows.forEach((r) => { if (r.review) oldReview.set(`${sid}|${r.speaker}|${r.korean}`, r.review); }));
  }
}

const index = { meta: { project: 'Project_H', source: sources.map((s) => `${s.type}=${s.file}`).join(', '), format: 2, columns: ['id', 'kind', 'speaker', 'korean', 'memo', 'voice', 'sceneType', 'sceneId', 'sceneDetail', 'phaseId', 'phase', 'phaseDetail', 'recordingScript'], rowCount: 0, sceneCount: 0, voiceCheckedCount: 0, koreanCount: 0, recordingScriptCount: 0, builtAt: new Date().toISOString(), generator: 'tools/md_script.js — 원본은 md, 작업실에서 대사를 고치지 말 것' }, speakers: [], scenes: [] };
const speakerCount = new Map();
const files = {};
let carried = 0;
scenes.forEach((s) => {
  let n = 0;
  const rows = [];
  const phases = s.phases.filter((p) => p.rows.length).map((p, i) => {
    const pid = `${s.id}-P${i + 1}`;
    p.rows.forEach((r) => {
      n += 1;
      const row = { rowNumber: n, id: `${s.id}#${n}`, kind: 'text', speaker: r.speaker, english: '', korean: r.korean, recordingScript: '', prompt: '', memo: r.memo, voice: '', phaseId: pid };
      const rv = oldReview.get(`${s.id}|${r.speaker}|${r.korean}`);
      if (rv) { row.review = rv; carried += 1; }
      rows.push(row);
      speakerCount.set(r.speaker, (speakerCount.get(r.speaker) || 0) + 1);
    });
    return { id: pid, name: p.name, detail: p.detail, count: p.rows.length };
  });
  if (!rows.length) return;
  files[s.id] = rows;
  index.scenes.push({ id: s.id, type: s.type, detail: s.detail, count: rows.length, stats: { korean: rows.length, voice: 0, script: 0, review: rows.filter((r) => r.review).length }, phases, idKeys: [s.id] });
});
index.meta.rowCount = index.scenes.reduce((a, s) => a + s.count, 0);
index.meta.koreanCount = index.meta.rowCount;
index.meta.sceneCount = index.scenes.length;
index.speakers = [...speakerCount].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

console.log(index.scenes.map((s) => `${s.id} ${s.type} "${s.detail}" ${s.count}줄 / 단계 ${s.phases.length}`).join('\n'));
console.log(`합계 ${index.meta.rowCount}줄, 씬 ${index.meta.sceneCount}개, 🚩 옮김 ${carried}`);
if (dry) process.exit(0);
fs.mkdirSync(scenesDir, { recursive: true });
for (const f of fs.readdirSync(scenesDir)) if (f.endsWith('.js') && !files[f.slice(0, -3)]) fs.unlinkSync(path.join(scenesDir, f));
Object.entries(files).forEach(([id, rows]) => {
  fs.writeFileSync(path.join(scenesDir, `${id}.js`), `window.PROJECT_H_SCENES=window.PROJECT_H_SCENES||{};\nwindow.PROJECT_H_SCENES[${JSON.stringify(id)}]=[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n];\n`);
});
const sceneLines = index.scenes.map((s) => `  ${JSON.stringify(s)}`).join(',\n');
const head = JSON.stringify({ meta: index.meta, speakers: index.speakers }, null, 1).replace(/\n}$/, '');
fs.writeFileSync(path.join(dataDir, 'index.js'), `window.PROJECT_H_INDEX=Object.assign(${head},\n "scenes": [\n${sceneLines}\n]});\n`);
console.log(`저장: works/${workId}/data`);
