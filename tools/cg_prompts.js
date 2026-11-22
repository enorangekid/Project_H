#!/usr/bin/env node
// 이미지별 CG 프롬프트(work.json 의 cgPrompts JSON) 점검.
//
//   node tools/cg_prompts.js check --work <작품ID>
//
// CG 폴더(cgDir/<탭>/<하위 탭>/)의 이미지와 JSON 항목을 맞춰 보고
//   - 프롬프트가 없는 이미지
//   - 이미지가 없는 프롬프트 (파일 이름을 바꿨거나 아직 저장 안 한 것)
// 를 알려 준다. 둘 다 없으면 "모두 맞음".
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function check(workId) {
  if (!workId || !lib.listWorks().includes(workId)) throw new Error(`작품을 찾을 수 없습니다: ${workId || '(없음)'} — --work <작품ID>`);
  const info = JSON.parse(fs.readFileSync(path.join(lib.WORKS_DIR, workId, 'work.json'), 'utf8'));
  if (!info.cgDir || !info.cgPrompts) throw new Error('이 작품의 work.json 에 cgDir 또는 cgPrompts 가 없습니다.');
  const dir = path.resolve(ROOT, info.cgDir);
  const images = JSON.parse(fs.readFileSync(path.resolve(ROOT, info.cgPrompts), 'utf8')).images || {};

  const files = [];
  const folders = (info.cgTabs || ['']).flatMap((tab) => [[tab, ''], ...(info.cgSubTabs?.[tab] || []).map((sub) => [tab, sub])]);
  folders.forEach(([tab, sub]) => {
    const folder = path.join(dir, tab, sub);
    if (!fs.existsSync(folder)) return;
    fs.readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isFile() && IMAGE.test(entry.name))
      .forEach((entry) => files.push([tab, sub, entry.name].filter(Boolean).join('/')));
  });

  const keys = Object.keys(images);
  const noPrompt = files.filter((file) => !images[file]);
  const noImage = keys.filter((key) => !files.includes(key));
  console.log(`이미지 ${files.length}장 · 프롬프트 ${keys.length}개`);
  if (noPrompt.length) console.log(`\n프롬프트가 없는 이미지 (${noPrompt.length}):\n${noPrompt.map((f) => `  ${f}`).join('\n')}`);
  if (noImage.length) console.log(`\n이미지가 없는 프롬프트 (${noImage.length}):\n${noImage.map((k) => `  ${k}`).join('\n')}`);
  if (!noPrompt.length && !noImage.length) console.log('모두 맞음');
  return noPrompt.length + noImage.length;
}

try {
  const command = process.argv[2];
  if (command !== 'check') {
    console.log('사용법: node tools/cg_prompts.js check --work <작품ID>');
    process.exit(command ? 1 : 0);
  }
  process.exit(check(argValue('--work')) ? 1 : 0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
