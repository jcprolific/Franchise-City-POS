import AdmZip from 'adm-zip';

export function loadWorkbookSheets(buffer) {
  const zip = new AdmZip(buffer);
  const files = {};
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory) {
      files[entry.entryName] = entry.getData().toString('utf8');
    }
  }

  const shared = parseSharedStrings(files['xl/sharedStrings.xml']);
  const relsXml = files['xl/_rels/workbook.xml.rels'] || '';
  const ridToTarget = {};
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    ridToTarget[m[1]] = m[2];
  }

  const wbXml = files['xl/workbook.xml'] || '';
  const sheets = [];
  for (const m of wbXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = ridToTarget[m[2]] || '';
    sheets.push({
      name: m[1],
      path: target.startsWith('xl/') ? target : `xl/${target.replace(/^\//, '')}`,
    });
  }

  const out = {};
  for (const { name, path: sheetPath } of sheets) {
    const xml = files[sheetPath];
    if (xml) out[name] = parseSheetRows(xml, shared);
  }
  return out;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  for (const block of xml.match(/<si[\s\S]*?<\/si>/g) || []) {
    const texts = [...block.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]));
    out.push(texts.join(''));
  }
  return out;
}

function parseSheetRows(xml, shared) {
  const rows = {};
  for (const m of xml.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attrs = m[1];
    const body = m[2];
    const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
    if (!ref) continue;
    const col = colToNum(ref[1]);
    const row = Number(ref[2]);
    const t = /t="([^"]+)"/.exec(attrs)?.[1];
    let val = '';
    const vMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
    if (t === 's' && vMatch) {
      val = shared[Number(vMatch[1])] ?? '';
    } else if (t === 'inlineStr') {
      val = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => decodeXml(x[1])).join('');
    } else if (vMatch) {
      val = vMatch[1];
    }
    val = val.trim();
    if (!val) continue;
    rows[row] ??= {};
    rows[row][col] = val;
  }
  return rows;
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function colToNum(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
