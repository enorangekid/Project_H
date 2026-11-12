#!/usr/bin/env node
// 작품 관리 도구. 작품은 works/<작품ID>/ 폴더 하나이며, 페이지의 작품 선택 목록은 works/works.js 에서 읽는다.
//
//   node tools/work.js list                      등록된 작품 목록
//   node tools/work.js new <작품ID> "<표시 이름>"   새 작품 폴더 생성 + 목록 갱신
//   node tools/work.js sync                      works/*/work.json 을 읽어 works/works.js 다시 생성
//
// 작품 ID는 영문·숫자·_·- 만 사용 (폴더명과 같음). 새 작품에 데이터를 넣을 때는
//   node tools/split.js --work <작품ID> <원본 script-data.js 경로>
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

function readWork(id) {
  return JSON.parse(fs.readFileSync(path.join(lib.WORKS_DIR, id, 'work.json'), 'utf8'));
}

function sync() {
  const works = lib.listWorks().map((id) => {
    const info = readWork(id);
    // voiceDir: 이 작품의 한국어 음성 폴더 (페이지 기준 상대 경로, 없으면 Project_H/voice/)
    return info.voiceDir ? { id, name: info.name || id, voiceDir: info.voiceDir } : { id, name: info.name || id };
  });
  const lines = works.map((item) => `  ${JSON.stringify(item)}`).join(',\n');
  lib.writeAtomic(path.join(lib.WORKS_DIR, 'works.js'), `window.PROJECT_H_WORKS=[\n${lines}\n];\n`);
  return works;
}

const [command, id, name] = process.argv.slice(2);
if (command === 'list') {
  lib.listWorks().forEach((workId) => console.log(`${workId}\t${readWork(workId).name || ''}`));
} else if (command === 'sync') {
  console.log(`작품 ${sync().length}개 등록: works/works.js`);
} else if (command === 'new') {
  if (!id || !lib.ID_PATTERN.test(id)) { console.error('작품 ID는 영문·숫자·_·- 만 가능합니다. 예: node tools/work.js new seohee2 "서희2"'); process.exit(1); }
  const dir = path.join(lib.WORKS_DIR, id);
  if (fs.existsSync(dir)) { console.error(`이미 있는 작품: ${id}`); process.exit(1); }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'work.json'), `${JSON.stringify({ id, name: name || id }, null, 2)}\n`, 'utf8');
  lib.useWork(id);
  lib.writePrompts([]); // 프롬프트 템플릿 파일 (페이지가 항상 불러오므로 빈 목록으로 만들어 둔다)
  console.log(`작품 폴더 생성: works/${id}  (데이터는 tools/split.js --work ${id} 로 넣으세요)`);
  sync();
} else {
  console.error('사용법: node tools/work.js <list | new | sync> ...');
  process.exit(command ? 1 : 0);
}
