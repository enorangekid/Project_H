#!/usr/bin/env node
// 프롬프트 템플릿 관리 + 대본 행에 프롬프트 일괄 적용/삭제. 페이지의 `프롬프트 관리/삽입`이 만들어 주는 요청을 실행하는 도구다.
//
//   node tools/prompt.js [--work 작품ID] templates                                  템플릿 목록
//   node tools/prompt.js [--work 작품ID] template set <템플릿ID> --name "이름" --text "프롬프트" [--group act|phase|arousal|emotion]   추가·수정
//                                         (group: act=행위, phase=단계, arousal=흥분도, emotion=추가 감정 — 페이지의 분류 탭)
//   node tools/prompt.js [--work 작품ID] template remove <템플릿ID>
//   node tools/prompt.js [--work 작품ID] apply <씬ID> --template <템플릿ID>[,<템플릿ID>…] (--rows 22-30,35 | --phase 단계ID | --all)
//                                         [--mode fill|replace] [--note "사유"] [--dry]
//   node tools/prompt.js [--work 작품ID] clear <씬ID> (--rows … | --phase … | --all) [--note "사유"] [--dry]
//
//   - --template 에 쉼표로 여러 개를 주면 그 순서대로 [내용1, 내용2, …] 형식으로 넣는다 (페이지의 여러 개 선택과 같음, 하나여도 대괄호로 감쌈).
//   - 대상은 녹음용 대본(recordingScript)이 있는 행뿐이다. --rows 는 엑셀 행 번호(rowNumber) 범위 목록이다.
//   - apply --mode fill(기본): 프롬프트가 빈 행에만 넣는다. replace: 이미 값이 있는 행도 교체한다.
//   - 바뀐 내용은 tools/scene.js 와 같은 변경 기록(data/changes/)에 남아 `scene.js revert <씬ID> --last` 로 되돌릴 수 있다.
//   - 템플릿은 data/prompts.js 에 저장되며 페이지의 `프롬프트 관리/삽입` 목록에 그대로 나타난다.
const lib = require('./lib');

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) options[key] = true;
      else { options[key] = next; i += 1; }
    } else positional.push(arg);
  }
  return { positional, options };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireScene(index, sceneId) {
  if (!sceneId) fail('씬 ID를 지정하세요. 예: node tools/prompt.js apply N1 --template daily --all');
  const scene = index.scenes.find((item) => item.id === sceneId);
  if (!scene) fail(`없는 씬 ID: ${sceneId}  (사용 가능: ${index.scenes.map((s) => s.id).join(', ')})`);
  return scene;
}

// "22-30,35" → [[22,30],[35,35]]
function parseRanges(spec) {
  const ranges = String(spec).split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) fail(`--rows 형식 오류: "${part}"  (예: 22-30,35)`);
    const from = Number(match[1]);
    const to = match[2] === undefined ? from : Number(match[2]);
    if (to < from) fail(`--rows 범위 오류: "${part}"`);
    return [from, to];
  });
  if (!ranges.length) fail('--rows 가 비어 있습니다.');
  return ranges;
}

function templates() {
  const list = lib.loadPrompts();
  if (!list.length) console.error('# 등록된 템플릿이 없습니다.');
  list.forEach((item) => console.log(JSON.stringify(item)));
}

function templateCommand(sub, id, options) {
  const list = lib.loadPrompts();
  if (sub === 'set') {
    if (!id || !lib.ID_PATTERN.test(id)) fail('템플릿 ID는 영문·숫자·_·- 만 가능합니다. 예: template set daily --name "일상 대화" --text "…"');
    const existing = list.find((item) => item.id === id);
    const name = typeof options.name === 'string' ? options.name.trim() : existing?.name;
    const text = typeof options.text === 'string' ? options.text.trim() : existing?.text;
    if (!name || !text) fail('새 템플릿에는 --name 과 --text 가 모두 필요합니다.');
    if (typeof options.group === 'string' && !lib.PROMPT_GROUPS.includes(options.group)) fail(`--group 은 ${lib.PROMPT_GROUPS.join(' | ')} 중 하나입니다.`);
    const group = typeof options.group === 'string' ? options.group : (existing?.group || 'emotion');
    if (existing) { existing.name = name; existing.text = text; existing.group = group; } else list.push({ id, group, name, text });
    lib.writePrompts(list);
    console.log(JSON.stringify({ template: id, action: existing ? 'updated' : 'added', total: list.length }));
  } else if (sub === 'remove') {
    if (!list.some((item) => item.id === id)) fail(`없는 템플릿: ${id}`);
    lib.writePrompts(list.filter((item) => item.id !== id));
    console.log(JSON.stringify({ template: id, action: 'removed', total: list.length - 1 }));
  } else fail('사용법: template <set | remove> <템플릿ID> ...');
}

// 선택 조건(--rows | --phase | --all)에 해당하고 녹음용 대본이 있는 행
function selectRows(rows, options) {
  const modes = ['rows', 'phase', 'all'].filter((key) => options[key] !== undefined);
  if (modes.length !== 1) fail('대상을 하나만 지정하세요: --rows 22-30,35 | --phase <단계ID> | --all');
  let picked;
  let unknownRows = 0;
  if (options.rows !== undefined) {
    if (options.rows === true) fail('--rows 에 행 번호 범위를 적으세요. 예: --rows 22-30,35');
    const ranges = parseRanges(options.rows);
    picked = rows.filter((row) => ranges.some(([from, to]) => row.rowNumber >= from && row.rowNumber <= to));
    const known = new Set(rows.map((row) => row.rowNumber));
    ranges.forEach(([from, to]) => { if (from === to && !known.has(from)) unknownRows += 1; });
  } else if (options.phase !== undefined) {
    if (options.phase === true) fail('--phase 에 단계 ID를 적으세요.');
    picked = rows.filter((row) => row.phaseId === String(options.phase));
    if (!picked.length) fail(`단계 ${options.phase}에 해당하는 행이 없습니다.`);
  } else picked = rows;
  const withScript = picked.filter((row) => row.recordingScript);
  return { withScript, skippedNoScript: picked.length - withScript.length, unknownRows };
}

// 선택한 행의 prompt 필드를 값으로 바꾸고 변경 기록·통계를 남긴다 (tools/scene.js 의 set 과 같은 방식)
function commit(index, sceneId, rows, targets, newValue, note, options, summary) {
  const entries = [];
  targets.forEach((row) => {
    const after = newValue(row);
    if (after === row.prompt) return;
    entries.push({ id: row.id, rowNumber: row.rowNumber, field: 'prompt', before: row.prompt, after });
    row.__after = after;
  });
  summary.changedRows = entries.length;
  summary.unchangedRows = targets.length - entries.length;
  summary.dryRun = Boolean(options.dry);
  rows.forEach((row) => {
    if (row.__after !== undefined) {
      if (!options.dry) row.prompt = row.__after;
      delete row.__after;
    }
  });
  if (!options.dry && entries.length) {
    lib.writeSceneRows(sceneId, rows);
    const log = lib.loadChanges(sceneId);
    const batch = lib.newBatchId(log);
    const t = new Date().toISOString();
    lib.writeChanges(sceneId, [...log, ...entries.map((entry) => ({ t, batch, note, ...entry }))]);
    summary.batch = batch;
    lib.writeIndex(index, { [sceneId]: rows });
  }
  console.log(JSON.stringify(summary));
}

function apply(sceneId, options) {
  const index = lib.loadIndex();
  requireScene(index, sceneId);
  const id = options.template;
  if (!id || id === true) fail('--template <템플릿ID> 를 지정하세요. (목록: node tools/prompt.js templates)');
  const all = lib.loadPrompts();
  const picked = String(id).split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const found = all.find((item) => item.id === part);
    if (!found) fail(`없는 템플릿: ${part}  (목록: node tools/prompt.js templates)`);
    return found;
  });
  // 최종 형식: [항목1, 항목2, …] (페이지의 formatPrompt 와 같음)
  const template = { name: picked.map((item) => item.name).join(' + '), text: `[${picked.map((item) => item.text.trim().replace(/^\[+\s*/, '').replace(/\s*\]+$/, '').trim()).filter(Boolean).join(', ')}]` }; // 템플릿에 대괄호가 있어도 한 겹만
  const mode = options.mode === undefined || options.mode === true ? 'fill' : String(options.mode);
  if (!['fill', 'replace'].includes(mode)) fail('--mode 는 fill(빈 칸만) 또는 replace(기존 값 교체)입니다.');
  const rows = lib.loadSceneRows(sceneId);
  const { withScript, skippedNoScript, unknownRows } = selectRows(rows, options);
  const targets = mode === 'fill' ? withScript.filter((row) => !row.prompt) : withScript;
  const summary = {
    scene: sceneId, template: id, mode, selectedWithScript: withScript.length, skippedNoScript,
    skippedHasValue: withScript.length - targets.length,
  };
  if (unknownRows) summary.unknownRows = unknownRows;
  if (mode === 'replace') summary.replacingExisting = targets.filter((row) => row.prompt && row.prompt !== template.text).length;
  const note = typeof options.note === 'string' ? options.note : `프롬프트 ${mode === 'fill' ? '빈 칸 적용' : '교체'}: ${template.name}`;
  commit(index, sceneId, rows, targets, () => template.text, note, options, summary);
}

function clear(sceneId, options) {
  const index = lib.loadIndex();
  requireScene(index, sceneId);
  const rows = lib.loadSceneRows(sceneId);
  const { withScript, skippedNoScript, unknownRows } = selectRows(rows, options);
  const targets = withScript.filter((row) => row.prompt);
  const summary = { scene: sceneId, selectedWithScript: withScript.length, skippedNoScript, clearing: targets.length };
  if (unknownRows) summary.unknownRows = unknownRows;
  const note = typeof options.note === 'string' ? options.note : '프롬프트 일괄 삭제';
  commit(index, sceneId, rows, targets, () => '', note, options, summary);
}

const { positional, options } = parseArgs(process.argv.slice(2));
const [command, ...args] = positional;
if (!['templates', 'template', 'apply', 'clear'].includes(command)) {
  console.error('사용법: node tools/prompt.js [--work 작품ID] <templates | template set|remove | apply | clear> ...  (자세한 내용은 파일 상단 주석 참고)');
  process.exit(command ? 1 : 0);
}
try { lib.useWork(options.work); } catch (error) { fail(error.message); }
if (command === 'templates') templates();
else if (command === 'template') templateCommand(args[0], args[1], options);
else if (command === 'apply') apply(args[0], options);
else clear(args[0], options);
