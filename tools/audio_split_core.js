// 음성 편집실 계산 부분 (브라우저 페이지 tools/audio_split.html 과 node 시험에서 같이 씀)
// 설계: 음성분할기_구상.md
(function (root) {
  'use strict';

  // 여러 채널을 모노로 평균
  function toMono(channels) {
    if (channels.length === 1) return channels[0];
    const n = channels[0].length;
    const out = new Float32Array(n);
    for (const ch of channels) for (let i = 0; i < n; i++) out[i] += ch[i];
    for (let i = 0; i < n; i++) out[i] /= channels.length;
    return out;
  }

  // 샘플레이트 변환(선형 보간). 음성용 44.1kHz 출력에 사용.
  function resampleLinear(input, sourceRate, targetRate) {
    if (!input || !input.length) return new Float32Array(0);
    if (sourceRate === targetRate) return input.slice();
    const length = Math.max(1, Math.round(input.length * targetRate / sourceRate));
    const out = new Float32Array(length);
    const ratio = sourceRate / targetRate;
    for (let i = 0; i < length; i++) {
      const at = i * ratio;
      const a = Math.min(input.length - 1, Math.floor(at));
      const b = Math.min(input.length - 1, a + 1);
      const mix = at - a;
      out[i] = input[a] + (input[b] - input[a]) * mix;
    }
    return out;
  }

  // 창(기본 10ms)마다 RMS를 dB로
  function frameDb(mono, sampleRate, frameSec) {
    const size = Math.max(1, Math.round(sampleRate * (frameSec || 0.01)));
    const count = Math.ceil(mono.length / size);
    const db = new Float32Array(count);
    for (let f = 0; f < count; f++) {
      let sum = 0;
      const start = f * size;
      const end = Math.min(mono.length, start + size);
      for (let i = start; i < end; i++) sum += mono[i] * mono[i];
      const rms = Math.sqrt(sum / Math.max(1, end - start));
      db[f] = rms > 0 ? 20 * Math.log10(rms) : -120;
    }
    return { db, frameSec: size / sampleRate };
  }

  // 기준(dB) 아래로 이어진 무음 구간 [{start,end,len}] (초)
  function silences(dbInfo, thresholdDb) {
    const { db, frameSec } = dbInfo;
    const out = [];
    let runStart = -1;
    for (let f = 0; f <= db.length; f++) {
      const quiet = f < db.length && db[f] < thresholdDb;
      if (quiet && runStart < 0) runStart = f;
      if (!quiet && runStart >= 0) {
        out.push({ start: runStart * frameSec, end: f * frameSec, len: (f - runStart) * frameSec });
        runStart = -1;
      }
    }
    return out;
  }

  // 경계 찾기. 맨 앞·맨 뒤 무음은 경계가 아님.
  // expected(조각 수)를 주면: 후보가 많으면 가장 긴 쉼 expected-1개만, 모자라면 그대로 두고 ok=false.
  function findBoundaries(mono, sampleRate, opts) {
    const o = Object.assign({ thresholdDb: -60, minSilence: 1.2, frameSec: 0.01, expected: 0 }, opts || {});
    const duration = mono.length / sampleRate;
    const info = frameDb(mono, sampleRate, o.frameSec);
    const all = silences(info, o.thresholdDb);
    const inner = all.filter((s) => s.start > 0 && s.end < duration - info.frameSec);
    const candidates = inner.filter((s) => s.len >= o.minSilence)
      .map((s) => ({ at: (s.start + s.end) / 2, len: s.len, start: s.start, end: s.end }));
    let chosen = candidates.slice();
    let note = '';
    let ok = true;
    if (o.expected > 0) {
      const need = o.expected - 1;
      if (candidates.length > need) {
        chosen = candidates.slice().sort((a, b) => b.len - a.len).slice(0, need).sort((a, b) => a.at - b.at);
        note = `쉼 후보 ${candidates.length}개 중 가장 긴 ${need}개만 사용`;
      } else if (candidates.length < need) {
        ok = false;
        note = `조각 ${o.expected}개가 필요한데 경계가 ${candidates.length}개뿐(조각 ${candidates.length + 1}개). 최소 쉼을 줄이거나 경계를 직접 추가하세요.`;
      }
    }
    return { duration, candidates, boundaries: chosen.map((c) => c.at), chosen, ok, note };
  }

  // 경계(초) → 조각 [{start,end}]
  function segmentsFrom(boundaries, duration) {
    const pts = [0].concat(boundaries.slice().sort((a, b) => a - b), [duration]);
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) out.push({ start: pts[i], end: pts[i + 1] });
    return out;
  }

  // 앞뒤 무음 붙이기(선택): 조각 안의 기존 무음을 걷어내고 앞 lead초·뒤 tail초 무음을 새로 붙임
  function trimRange(mono, sampleRate, seg, thresholdDb, keep) {
    const lin = Math.pow(10, thresholdDb / 20);
    let s = Math.floor(seg.start * sampleRate);
    let e = Math.min(mono.length, Math.floor(seg.end * sampleRate));
    while (s < e && Math.abs(mono[s]) < lin) s++;
    while (e > s && Math.abs(mono[e - 1]) < lin) e--;
    const k = Math.round((keep || 0.05) * sampleRate);
    return { start: Math.max(Math.floor(seg.start * sampleRate), s - k) / sampleRate,
             end: Math.min(Math.floor(seg.end * sampleRate), e + k) / sampleRate };
  }

  // 16-bit PCM WAV 만들기. channels: Float32Array[], 범위는 샘플 단위
  function encodeWav(channels, sampleRate, startSample, endSample, leadSec, tailSec) {
    const nCh = channels.length;
    const lead = Math.round((leadSec || 0) * sampleRate);
    const tail = Math.round((tailSec || 0) * sampleRate);
    const body = Math.max(0, endSample - startSample);
    const frames = lead + body + tail;
    const buf = new ArrayBuffer(44 + frames * nCh * 2);
    const v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + frames * nCh * 2, true); w(8, 'WAVE');
    w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * nCh * 2, true);
    v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, frames * nCh * 2, true);
    let off = 44 + lead * nCh * 2;
    for (let i = 0; i < body; i++) {
      for (let c = 0; c < nCh; c++) {
        const x = Math.max(-1, Math.min(1, channels[c][startSample + i] || 0));
        v.setInt16(off, x < 0 ? x * 0x8000 : x * 0x7fff, true);
        off += 2;
      }
    }
    return new Uint8Array(buf);
  }

  // 저장 전용(압축 없음) ZIP
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function makeZip(files) { // files: [{name, data:Uint8Array}]
    const enc = new TextEncoder();
    const parts = []; const central = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name); const crc = crc32(f.data); const size = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + size;
    }
    const cSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/zip' });
  }

  // 대본 → 조각 개수: [long pause]·<br>·빈 줄로 나눈 문단 수
  function countParagraphs(text) {
    const t = (text || '').replace(/\[long pause\]|<br\s*\/?>/gi, '\n\n').trim();
    if (!t) return 0;
    return t.split(/\n\s*\n/).filter((p) => p.trim()).length;
  }

  // 파일 이름에 못 쓰는 글자 정리 (EP1#85 → EP1_85)
  function safeName(s) {
    return String(s).trim().replace(/#/g, '_').replace(/[\\/:*?"<>|]/g, '_');
  }

  // ===== 자막(SRT) =====
  // 흐름: 대본 문단 → 문장 → 자막 조각(한 줄 최대 글자 수, 띄어쓰기 포함) → 문단의 말하는 시간을 글자 수 비율로 배분 → SRT

  // 대본 → 문단 목록 ([long pause]·<br>·빈 줄 기준. countParagraphs와 같은 규칙)
  function splitParagraphs(text) {
    const t = (text || '').replace(/\[long pause\]|<br\s*\/?>/gi, '\n\n').trim();
    if (!t) return [];
    return t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }

  // 문단 → 문장. 마침표·물음표·느낌표·말줄임표 뒤에 공백이 올 때만 자름(3.5 같은 숫자는 안 자름). 줄바꿈은 공백으로 취급.
  function splitSentences(paragraph) {
    const t = String(paragraph || '').replace(/\s+/g, ' ').trim();
    if (!t) return [];
    return t.split(/(?<=[.?!…。？！]["'”’)\]]*) /).map((s) => s.trim()).filter(Boolean);
  }

  // 문장 → 자막 조각. maxChars(띄어쓰기 포함) 이하면 그대로 한 조각.
  // 넘으면 필요한 최소 조각 수로, 어절 사이에서 글자 수가 고르게 나뉘도록 자름. 어절 하나가 maxChars보다 길면 글자 단위로 자름.
  function splitCaption(sentence, maxChars) {
    const max = Math.max(1, Math.floor(maxChars) || 1);
    const text = String(sentence || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    if (text.length <= max) return [text];
    const tokens = []; // glue: 앞 토큰과 공백 없이 이어 붙임(긴 어절을 글자 단위로 자른 경우)
    for (const w of text.split(' ')) {
      if (w.length <= max) { tokens.push({ t: w, glue: false }); continue; }
      for (let i = 0; i < w.length; i += max) tokens.push({ t: w.slice(i, i + max), glue: i > 0 });
    }
    const n = tokens.length;
    const P = [0], Q = [0]; // P: 글자 수 누적, Q: 토큰 앞 공백 수 누적
    tokens.forEach((k, i) => { P.push(P[i] + k.t.length); Q.push(Q[i] + (i > 0 && !k.glue ? 1 : 0)); });
    const lineLen = (i, j) => (P[j] - P[i]) + (Q[j] - Q[i + 1]); // 토큰 i..j-1 한 줄의 길이
    const total = lineLen(0, n);
    for (let K = Math.max(2, Math.ceil(P[n] / max)); K <= n; K++) { // 줄바꿈 자리의 공백은 글자 수에서 빠지므로 공백을 뺀 글자 수로 최소 줄 수를 잡음
      const target = total / K;
      const dp = Array.from({ length: K + 1 }, () => new Array(n + 1).fill(Infinity));
      const from = Array.from({ length: K + 1 }, () => new Array(n + 1).fill(-1));
      dp[0][0] = 0;
      for (let l = 1; l <= K; l++) {
        for (let j = l; j <= n; j++) {
          for (let i = l - 1; i < j; i++) {
            if (dp[l - 1][i] === Infinity) continue;
            const len = lineLen(i, j);
            if (len > max) continue;
            const cost = dp[l - 1][i] + (len - target) * (len - target);
            if (cost < dp[l][j]) { dp[l][j] = cost; from[l][j] = i; }
          }
        }
      }
      if (dp[K][n] === Infinity) continue;
      const lines = [];
      for (let l = K, j = n; l >= 1; l--) {
        const i = from[l][j];
        let s = tokens[i].t;
        for (let k = i + 1; k < j; k++) s += (tokens[k].glue ? '' : ' ') + tokens[k].t;
        lines.unshift(s);
        j = i;
      }
      return lines;
    }
    return [text]; // 도달하지 않음(K = n이면 항상 가능)
  }

  // 문단 목록 + 문단별 말하는 구간(초) → 자막 [{start, end, text}]
  // 문단 안에서는 자막 조각의 글자 수(띄어쓰기 제외) 비율로 시간을 나눔.
  function buildCues(paragraphs, ranges, maxChars) {
    const cues = [];
    paragraphs.forEach((p, i) => {
      const r = ranges[i];
      if (!r) return;
      const pieces = [];
      for (const s of splitSentences(p)) for (const c of splitCaption(s, maxChars)) pieces.push(c);
      if (!pieces.length) return;
      const from = r.start, span = Math.max(0.2, r.end - r.start);
      const weights = pieces.map((c) => Math.max(1, c.replace(/\s/g, '').length));
      const sum = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      pieces.forEach((text, k) => {
        const start = from + span * acc / sum;
        acc += weights[k];
        cues.push({ start, end: from + span * acc / sum, text });
      });
    });
    return cues;
  }

  // 문단 수와 조각 수가 다를 때(예: 문단 안에 무음을 넣으려고 경계를 더 찍은 경우):
  // 모든 문단의 자막 조각을 하나로 이어, 조각들의 말하는 구간 ranges(시간 순서, 같은 시간축)의 소리 길이 전체에 글자 수 비율로 배분.
  // 자막 하나가 조각 사이의 무음을 가로지르게 되면 무음 앞뒤로 어절 경계에서 나눠서, 쉼 동안에는 자막이 남지 않게 함(어절이 하나뿐이면 그대로 둠).
  function buildCuesAcross(paragraphs, ranges, maxChars) {
    const texts = [];
    for (const p of paragraphs) for (const s of splitSentences(p)) for (const c of splitCaption(s, maxChars)) texts.push(c);
    const rs = ranges.filter((r) => r && r.end > r.start);
    if (!texts.length || !rs.length) return [];
    const lens = rs.map((r) => r.end - r.start), total = lens.reduce((a, b) => a + b, 0);
    const cum = []; let c0 = 0;
    for (const l of lens) { cum.push(c0); c0 += l; }
    const weights = texts.map((c) => Math.max(1, c.replace(/\s/g, '').length)), sum = weights.reduce((a, b) => a + b, 0);
    const timeAt = (k, tau) => rs[k].start + Math.max(0, Math.min(lens[k], tau - cum[k]));
    // 소리 길이 축의 [a, b]가 걸치는 조각들: [{k, lo, hi}]
    const piecesOf = (a, b) => {
      const out = [];
      for (let k = 0; k < rs.length; k++) {
        const lo = Math.max(a, cum[k]), hi = Math.min(b, cum[k] + lens[k]);
        if (hi - lo > 1e-9) out.push({ k, lo, hi });
      }
      return out;
    };
    // 글자를 어절 경계에서 비중(fracs, 합 1)대로 나눔. 어절이 모자라면 null
    const splitText = (text, fracs) => {
      const words = text.split(' '), n = fracs.length;
      if (words.length < n) return null;
      const pos = []; let acc = 0;
      words.forEach((w, i) => { acc += w.length + (i ? 1 : 0); pos.push(acc); });
      const totalLen = pos[pos.length - 1], cuts = [];
      let prev = -1, f = 0;
      for (let j = 1; j < n; j++) {
        f += fracs[j - 1];
        let best = -1, bd = Infinity;
        for (let i = prev + 1; i <= words.length - 1 - (n - j); i++) { const d = Math.abs(pos[i] - totalLen * f); if (d < bd) { bd = d; best = i; } }
        if (best < 0) return null;
        cuts.push(best); prev = best;
      }
      const parts = []; let from = 0;
      for (const c of cuts) { parts.push(words.slice(from, c + 1).join(' ')); from = c + 1; }
      parts.push(words.slice(from).join(' '));
      return parts;
    };
    const cues = []; let acc = 0;
    texts.forEach((text, j) => {
      const a = total * acc / sum; acc += weights[j]; const b = total * acc / sum;
      const ps = piecesOf(a, b);
      if (ps.length <= 1) {
        const k = ps.length ? ps[0].k : Math.max(0, rs.findIndex((r, i) => a < cum[i] + lens[i]));
        cues.push({ start: timeAt(k, a), end: timeAt(k, b), text });
        return;
      }
      const span = ps.reduce((x, p) => x + (p.hi - p.lo), 0);
      const parts = splitText(text, ps.map((p) => (p.hi - p.lo) / span));
      if (!parts) { // 나눌 수 없으면 한 장으로 두고 처음~끝에 걸침
        cues.push({ start: timeAt(ps[0].k, ps[0].lo), end: timeAt(ps[ps.length - 1].k, ps[ps.length - 1].hi), text });
        return;
      }
      ps.forEach((p, m) => cues.push({ start: timeAt(p.k, p.lo), end: timeAt(p.k, p.hi), text: parts[m] }));
    });
    return cues;
  }
  // 초 → SRT 시간 (00:00:00,000)
  function srtTime(sec) {
    const ms = Math.max(0, Math.round(sec * 1000));
    const p = (n, w) => String(n).padStart(w, '0');
    return `${p(Math.floor(ms / 3600000), 2)}:${p(Math.floor(ms % 3600000 / 60000), 2)}:${p(Math.floor(ms % 60000 / 1000), 2)},${p(ms % 1000, 3)}`;
  }

  // 자막 → SRT 글자(줄바꿈은 \n. 파일로 저장할 때 \r\n으로 바꿈). offsetSec: 모든 시간에 더함
  function buildSrt(cues, offsetSec) {
    const off = offsetSec || 0;
    return cues.map((c, i) => `${i + 1}\n${srtTime(c.start + off)} --> ${srtTime(c.end + off)}\n${c.text}\n`).join('\n');
  }

  // ===== 음량 맞추기 =====
  // ITU-R BS.1770 방식의 통합 음량(LUFS): K 가중 → 400ms 블록(100ms 간격) → 절대 −70 / 상대 −10 LU 게이트.
  // 모노 신호는 dualMono=true로 양쪽 채널에 같은 소리로 재생하는 기준(+3.01 LU, 스테레오 영상·샘플 음성과 같은 잣대)으로 계산.
  function kCoeffs(fs) {
    // 1단: 고음 선반(+4 dB), 2단: 저음 하이패스. BS.1770의 48kHz 표준 계수와 같은 값이 나오는 설계식이고, 다른 샘플레이트도 같은 식으로 계산.
    let K = Math.tan(Math.PI * 1681.974450955533 / fs), Q = 0.7071752369554196;
    const Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    let a0 = 1 + K / Q + K * K;
    const hs = {
      b: [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0],
      a: [2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0],
    };
    K = Math.tan(Math.PI * 38.13547087602444 / fs); Q = 0.5003270373238773;
    a0 = 1 + K / Q + K * K;
    const hp = { b: [1, -2, 1], a: [2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0] };
    return { hs, hp };
  }
  // K 가중을 거친 소리의 100ms 단위 제곱합(메모리를 아끼려고 한 번에 흘려보내며 계산)
  function hopEnergies(x, fs) {
    const { hs, hp } = kCoeffs(fs);
    const hop = Math.round(0.1 * fs), count = Math.floor(x.length / hop);
    const e = new Float64Array(count);
    let a1 = 0, a2 = 0, p1 = 0, p2 = 0, c1 = 0, c2 = 0, q1 = 0, q2 = 0;
    for (let h = 0; h < count; h++) {
      let sum = 0;
      for (let i = h * hop, end = i + hop; i < end; i++) {
        const xi = x[i];
        const y = hs.b[0] * xi + hs.b[1] * a1 + hs.b[2] * a2 - hs.a[0] * p1 - hs.a[1] * p2;
        a2 = a1; a1 = xi; p2 = p1; p1 = y;
        const z = hp.b[0] * y + hp.b[1] * c1 + hp.b[2] * c2 - hp.a[0] * q1 - hp.a[1] * q2;
        c2 = c1; c1 = y; q2 = q1; q1 = z;
        sum += z * z;
      }
      e[h] = sum;
    }
    return { e, hop };
  }

  function integratedLoudness(x, fs, dualMono) {
    const { e, hop } = hopEnergies(x, fs);
    const k = dualMono ? 2 : 1;
    const lk = (z) => -0.691 + 10 * Math.log10(z || 1e-12);
    const blocks = [];
    for (let i = 0; i + 4 <= e.length; i++) blocks.push(k * (e[i] + e[i + 1] + e[i + 2] + e[i + 3]) / (4 * hop));
    const above = blocks.filter((z) => lk(z) > -70);
    if (!above.length) return -Infinity;
    const rel = lk(above.reduce((a, b) => a + b, 0) / above.length) - 10;
    const gated = above.filter((z) => lk(z) > rel);
    return gated.length ? lk(gated.reduce((a, b) => a + b, 0) / gated.length) : -Infinity;
  }

  // 샘플 피크(dBFS)
  function samplePeakDb(x) {
    let p = 0;
    for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > p) p = v; }
    return p > 0 ? 20 * Math.log10(p) : -Infinity;
  }

  // 현재 음량·피크 → 목표 음량에 맞추는 게인. 피크가 상한(ceilingDb)을 넘게 되면 상한까지만 올림(limited=true).
  function loudnessGain(lufs, peakDb, targetLufs, ceilingDb) {
    if (!isFinite(lufs) || !isFinite(targetLufs)) return { ok: false, gainDb: 0, factor: 1, limited: false, resultLufs: lufs, resultPeakDb: peakDb };
    let gainDb = targetLufs - lufs;
    let limited = false;
    if (isFinite(peakDb) && isFinite(ceilingDb) && peakDb + gainDb > ceilingDb + 1e-9) { gainDb = ceilingDb - peakDb; limited = true; }
    return { ok: true, gainDb, factor: Math.pow(10, gainDb / 20), limited, resultLufs: lufs + gainDb, resultPeakDb: peakDb + gainDb };
  }

  const api = { toMono, resampleLinear, frameDb, silences, findBoundaries, segmentsFrom, trimRange, encodeWav, crc32, makeZip, countParagraphs, safeName, splitParagraphs, splitSentences, splitCaption, buildCues, buildCuesAcross, srtTime, buildSrt, kCoeffs, hopEnergies, integratedLoudness, samplePeakDb, loudnessGain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AudioSplit = api;
})(typeof window !== 'undefined' ? window : globalThis);
