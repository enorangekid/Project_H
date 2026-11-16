// 음성 분할기 계산 부분 (브라우저 페이지 tools/audio_split.html 과 node 시험에서 같이 씀)
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

  // 대본 → 조각 이름/개수: <br> 또는 빈 줄로 나눈 문단 수
  function countParagraphs(text) {
    const t = (text || '').replace(/<br\s*\/?>/gi, '\n\n').trim();
    if (!t) return 0;
    return t.split(/\n\s*\n/).filter((p) => p.trim()).length;
  }

  // 파일 이름에 못 쓰는 글자 정리 (EP1#85 → EP1_85)
  function safeName(s) {
    return String(s).trim().replace(/#/g, '_').replace(/[\\/:*?"<>|]/g, '_');
  }

  const api = { toMono, frameDb, silences, findBoundaries, segmentsFrom, trimRange, encodeWav, crc32, makeZip, countParagraphs, safeName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AudioSplit = api;
})(typeof window !== 'undefined' ? window : globalThis);
