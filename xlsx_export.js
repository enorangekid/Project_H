// 라이브러리 없이 브라우저에서 .xlsx 파일을 만든다 (작업실의 「엑셀 다운로드」용).
// 압축하지 않은(store) zip + 인라인 문자열 시트 한 장. 1행은 머리글(굵게·고정·필터), 나머지는 위쪽 정렬·줄바꿈.
//   buildXlsx(시트이름, ['머리글', …], [[값, …], …], [열 너비, …]) → Blob
(function () {
  function esc(value) {
    return String(value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function colName(index) {
    let name = '';
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    return name;
  }

  function cell(value, r, c, style) {
    const ref = colName(c) + r;
    if (typeof value === 'number') return '<c r="' + ref + '" s="' + style + '"><v>' + value + '</v></c>';
    if (value === '' || value == null) return '<c r="' + ref + '" s="' + style + '"/>';
    return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + esc(value) + '</t></is></c>';
  }

  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const DOC_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const CT = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

  function buildXlsx(sheetName, header, rows, widths) {
    const all = [header].concat(rows);
    const sheetRows = all.map(function (values, i) {
      return '<row r="' + (i + 1) + '">' + values.map(function (v, c) { return cell(v, i + 1, c, i === 0 ? 1 : 2); }).join('') + '</row>';
    }).join('');
    const cols = (widths || []).map(function (w, i) {
      return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
    }).join('');
    const lastRef = colName(header.length - 1) + all.length;
    const safeName = esc(String(sheetName || 'Sheet1').replace(/[\\/?*[\]:]/g, '_').slice(0, 31));
    const files = [
      ['[Content_Types].xml', XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="' + CT + '.sheet.main+xml"/>'
        + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="' + CT + '.worksheet+xml"/>'
        + '<Override PartName="/xl/styles.xml" ContentType="' + CT + '.styles+xml"/></Types>'],
      ['_rels/.rels', XML + '<Relationships xmlns="' + PKG_REL + '">'
        + '<Relationship Id="rId1" Type="' + DOC_REL + '/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', XML + '<workbook xmlns="' + MAIN + '" xmlns:r="' + DOC_REL + '"><sheets>'
        + '<sheet name="' + safeName + '" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', XML + '<Relationships xmlns="' + PKG_REL + '">'
        + '<Relationship Id="rId1" Type="' + DOC_REL + '/worksheet" Target="worksheets/sheet1.xml"/>'
        + '<Relationship Id="rId2" Type="' + DOC_REL + '/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', XML + '<styleSheet xmlns="' + MAIN + '">'
        + '<fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts>'
        + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
        + '<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF6"/></patternFill></fill></fills>'
        + '<borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>'
        + '<cellXfs count="3"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/>'
        + '<xf applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs></styleSheet>'],
      ['xl/worksheets/sheet1.xml', XML + '<worksheet xmlns="' + MAIN + '"><dimension ref="A1:' + lastRef + '"/>'
        + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        + (cols ? '<cols>' + cols + '</cols>' : '')
        + '<sheetData>' + sheetRows + '</sheetData><autoFilter ref="A1:' + lastRef + '"/></worksheet>'],
    ];
    return new Blob([zipStore(files)], { type: CT + '.sheet' });
  }

  let crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i += 1) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // 압축하지 않는 zip (엑셀은 store 방식도 그대로 연다). 이름은 UTF-8 플래그(0x0800).
  function zipStore(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    files.forEach(function (file) {
      const nameBytes = enc.encode(file[0]);
      const data = enc.encode(file[1]);
      const crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
      local.setUint16(26, nameBytes.length, true);
      parts.push(new Uint8Array(local.buffer), nameBytes, data);
      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true); entry.setUint16(4, 20, true); entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true); entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true); entry.setUint32(24, data.length, true);
      entry.setUint16(28, nameBytes.length, true); entry.setUint32(42, offset, true);
      central.push(new Uint8Array(entry.buffer), nameBytes);
      offset += 30 + nameBytes.length + data.length;
    });
    const centralSize = central.reduce(function (sum, p) { return sum + p.length; }, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]));
  }

  window.buildXlsx = buildXlsx;
})();
