// 한글 → Shift-JIS "빌린 한자" 암호표 (Shift-JIS 로만 글자를 그리는 일본 게임에 한글을 넣기 위한 것)
//
// 규칙(항상 같은 표가 나옴): KS X 1001 한글 2,350자(cp949 0xB0A1~0xC8FE 순서)를
// Shift-JIS JIS 2수준 한자(0x989F 부터, 코드 순서)에 하나씩 배정한다.
// 게임에는 그 한자 코드를 넣고, 같은 한자 자리에 한글 모양을 넣은 글꼴(tools/font_remap.js)을 게임 글꼴로 쓴다.
// → 한글이 아닌 글자(숫자·문장부호·가나·1수준 한자)는 원래 Shift-JIS 그대로 넣는다.
// 주의: 2수준 한자 중 앞의 2,350자는 이 글꼴에서 한글로 보이므로, 번역하지 않은 원문에 그 한자가 있으면 한글로 보인다.
//       KS X 1001 밖의 한글(예: 똠·햏 등 드문 글자)은 넣을 수 없다 — encode 가 알려 준다.
'use strict';

let cache = null;

function build() {
  if (cache) return cache;
  const kr = new TextDecoder('euc-kr');
  const jp = new TextDecoder('shift_jis');
  const hangul = [];
  for (let lead = 0xb0; lead <= 0xc8; lead++) for (let trail = 0xa1; trail <= 0xfe; trail++) {
    const ch = kr.decode(Buffer.from([lead, trail]));
    if (/^[가-힣]$/.test(ch)) hangul.push(ch);
  }
  const slots = []; // [lead, trail, kanji]
  for (let lead = 0x98; lead <= 0xea && slots.length < hangul.length; lead++) {
    for (let trail = 0x40; trail <= 0xfc && slots.length < hangul.length; trail++) {
      if (trail === 0x7f) continue;
      if (lead === 0x98 && trail < 0x9f) continue; // 2수준은 0x989F 부터
      const ch = jp.decode(Buffer.from([lead, trail]));
      if (ch.length === 1 && /[一-鿿]/.test(ch)) slots.push([lead, trail, ch]);
    }
  }
  if (slots.length < hangul.length) throw new Error('빌릴 한자 자리가 모자람');
  const toBytes = new Map(), toKanji = new Map(), fromKanji = new Map();
  hangul.forEach((h, i) => { const [l, t, k] = slots[i]; toBytes.set(h, [l, t]); toKanji.set(h, k); fromKanji.set(k, h); });
  // 일반 Shift-JIS 인코딩 표 (한글이 아닌 글자용)
  const sj = new Map();
  for (let lead = 0x81; lead <= 0xfc; lead++) {
    if (lead > 0x9f && lead < 0xe0) continue;
    for (let trail = 0x40; trail <= 0xfc; trail++) {
      if (trail === 0x7f) continue;
      const ch = jp.decode(Buffer.from([lead, trail]));
      if (ch.length === 1 && ch !== '�' && !sj.has(ch)) sj.set(ch, [lead, trail]);
    }
  }
  cache = { hangul, toBytes, toKanji, fromKanji, sj };
  return cache;
}

// 대체 문자: 한국어 문장에 흔한데 Shift-JIS 에 없는 것
const SUBST = { '·': '・', '‘': '’', '“': '”', '~': '～', '-': '－' };

// 한국어 문장 → 게임용 Shift-JIS 바이트
function encode(text) {
  const { toBytes, fromKanji, sj } = build();
  const out = [];
  const bad = [];
  const borrowed = [];
  for (let ch of text) {
    if (SUBST[ch] && !sj.has(ch)) ch = SUBST[ch];
    const c = ch.codePointAt(0);
    if (toBytes.has(ch)) out.push(...toBytes.get(ch));
    else if (c < 0x80) out.push(c);
    else if (sj.has(ch)) { out.push(...sj.get(ch)); if (fromKanji.has(ch)) borrowed.push(ch); }
    else bad.push(ch);
  }
  return { bytes: Buffer.from(out), bad, borrowed };
}

module.exports = { build, encode };
