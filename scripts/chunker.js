// n8n Code node — Universal Adaptive Chunker (fixed bullets + merge small chunks)
// Input: items with item.json.title, item.json.data, item.json.metadata (may include metadata.externalSources)
// Output: structured chunks with metadata + externalSources

const MAX_LEN = 2400;           
const MAX_TOTAL_CHUNKS = 1200;  
const MAX_CHUNKS_PER_GROUP = 12;
const MIN_CHUNK_LEN = 80; // merge too-small chunks

function sanitize(text) {
  return (text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function* scanLines(text) { 
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) yield { i, line: lines[i] };
}

// Regex
const BAB_RE = /^#*\s*BAB\s+([IVXLCDM]+)\.?\s*(.*)$/i;
const PASAL_RE = /^Pasal\s+(\d{1,3}[A-Z]?)[:\.\)]?\s*(.*)$/i;
const SEC_RE = /^(\d+)\.\s+(.+)$/;
const SUBSEC_RE = /^(\d+\.\d+)\.\s+(.+)$/;
const DEEPSEC_RE = /^(\d+\.\d+\.\d+)\.\s+(.+)$/;
const BULLET_SPLIT = /\n(?=(?:[a-z]{1,2}[\)\.]|[0-9]{1,2}[\)\.])\s+)/g;

// --- Parsers ---
function parseBabs(fullText) {
  const out = [];
  let cur = null;
  for (const { line } of scanLines(fullText)) {
    const bab = line.match(BAB_RE);
    if (bab) { 
      if (cur) { cur.content = cur.buf.join("\n").trim(); out.push(cur); }
      cur = { 
        roman: (bab[1]||"").trim(), 
        title: (bab[2]||"").trim() || null, 
        buf: [line] // include the BAB header in content
      };
      continue; 
    }
    if (cur) cur.buf.push(line);
  }
  if (cur) { cur.content = cur.buf.join("\n").trim(); out.push(cur); }
  return out;
}

function parsePasals(fullText) {
  const out = [];
  let curBab = { roman: null, title: null };
  let cur = null;
  for (const { line } of scanLines(fullText)) {
    const bab = line.match(BAB_RE);
    if (bab) { 
      if (cur) { cur.content = cur.buf.join("\n").trim(); out.push(cur); cur = null; }
      curBab = { roman: (bab[1]||"").trim(), title: (bab[2]||"").trim() || null };
      continue; 
    }
    const pas = line.match(PASAL_RE);
    if (pas) { 
      if (cur) { cur.content = cur.buf.join("\n").trim(); out.push(cur); }
      cur = { babRoman: curBab.roman, babTitle: curBab.title, pasalNo: pas[1], pasalTitle: (pas[2]||"").trim() || null, buf: [] };
      continue; 
    }
    if (cur) cur.buf.push(line);
  }
  if (cur) { cur.content = cur.buf.join("\n").trim(); out.push(cur); }
  return out.filter(p => p && p.pasalNo && p.content.length > 20);
}

function parseSections(fullText) {
  const out = [];
  let cur = null;
  for (const { line } of scanLines(fullText)) {
    const clean = line.trim();

    // skip TOC entries like "6.4 .... \t 24"
    if (/^\d+(\.\d+)*\s+.+\t\d+$/.test(clean)) continue;

    const sec = clean.match(DEEPSEC_RE) || clean.match(SUBSEC_RE) || clean.match(SEC_RE);
    const word = clean.match(/^(Policy|Purpose|Scope|Objectives?|Responsibilities?|Related Documents?|General Standards?|Appendix)\b/i);

    if (sec || word) {
      if (cur) { cur.content = cur.buf.join("\n").trim(); out.push(cur); }

      if (sec) {
        cur = { secNo: sec[1], secTitle: sec[2]?.trim().replace(/[:\-]+$/, ""), buf: [] };
      } else {
        cur = { secNo: null, secTitle: word[1], buf: [] };
      }
      continue;
    }
    if (cur) cur.buf.push(line);
  }
  if (cur) { cur.content = cur.buf.join("\n").trim(); out.push(cur); }
  return out.filter(s => (s.secNo || s.secTitle) && s.content.length > 20);
}

// --- Splitters ---
function splitByParagraphs(text){ 
  // split only on 2+ newlines that are not bullets
  return text
    .split(/\n{2,}(?!\s*[\*\-\d]+\s)/)
    .map(s=>s.trim())
    .filter(Boolean); 
}
function splitBySentences(text){ 
  return text.split(/(?<=[\.\?!。；;:])\s+/).map(s=>s.trim()).filter(Boolean); 
}

// merge very small chunks with previous
function mergeSmall(chunks) {
  const out = [];
  for (let c of chunks) {
    if (out.length > 0 && c.length < MIN_CHUNK_LEN) {
      out[out.length-1] += " " + c;
    } else {
      out.push(c);
    }
  }
  return out;
}

function chunkParagraphs(text) {
  const paras = splitByParagraphs(text);
  let chunks = [];
  let buf = "";
  for (let p of paras) {
    const candidate = buf ? buf + "\n\n" + p : p;
    if (candidate.length <= MAX_LEN) { buf = candidate; continue; }
    if (buf) { chunks.push(buf); buf = ""; }
    if (p.length <= MAX_LEN) chunks.push(p);
    else chunks.push(...splitBySentences(p));
  }
  if (buf) chunks.push(buf);
  return mergeSmall(chunks);
}

function chunkPasalContent(content) {
  const paras = splitByParagraphs(content);
  let chunks = [];
  let buf = "";
  const pushBuf = () => { if (buf.trim()) chunks.push(buf.trim()); buf = ""; };

  for (let p of paras) {
    if ((buf + (buf ? "\n\n" : "") + p).length <= MAX_LEN) {
      buf = buf ? buf + "\n\n" + p : p;
      continue;
    }
    if (buf) pushBuf();
    let parts = p.split(BULLET_SPLIT).map(s=>s.trim()).filter(Boolean);
    if (parts.length === 0) parts = [p];
    for (const part of parts) {
      if (part.length <= MAX_LEN) chunks.push(part);
      else chunks.push(...splitBySentences(part));
    }
  }
  if (buf) pushBuf();
  return mergeSmall(chunks);
}

// --- MAIN ---
const items = $input.all();
const out = [];
const seen = new Set();

for (const item of items) {
  // safe Training node lookup
  let trainingNode = null;
  try { trainingNode = $('Training').first(); } catch(e) {}
  const baseMeta = trainingNode?.json?.body?.metadata || {};
  const fileName = trainingNode?.json?.body?.filename || item.json?.title || "Document";

  const pageNumber = item.json?.pageNumber || null;

  // merge externalSources if both exist
  let externalSources = [];
  if (Array.isArray(baseMeta.externalSources)) externalSources = externalSources.concat(baseMeta.externalSources);
  if (Array.isArray(item.json?.externalSources)) externalSources = externalSources.concat(item.json.externalSources);
  if (externalSources.length === 0) externalSources = null;

  let text = sanitize(item.json?.data || "");
  if (!text) continue;

  const babs = parseBabs(text);
  const pasals = babs.length === 0 ? parsePasals(text) : [];
  const sections = babs.length === 0 && pasals.length === 0 ? parseSections(text) : [];

  const addMeta = (extra) => ({
    ...baseMeta,
    ...extra,
    ...(externalSources ? { externalSources } : {})
  });

  if (babs.length > 0) {
    for (const b of babs) {
      const header = `BAB ${b.roman}${b.title ? `. ${b.title}` : ""}`;
      let chunks = chunkParagraphs(b.content);
      if (chunks.length > MAX_CHUNKS_PER_GROUP) {
        const ratio = Math.ceil(chunks.length / MAX_CHUNKS_PER_GROUP);
        chunks = chunks.reduce((acc, c, i) => {
          if (i % ratio === 0) acc.push(c); else acc[acc.length-1] += "\n\n" + c;
          return acc;
        }, []);
      }
      chunks.forEach((ck, idx) => {
        const payload = ck.trim();
        if (seen.has(payload)) return; seen.add(payload);
        out.push({
          json: {
            title: `${fileName} :: BAB ${b.roman} [${idx+1}/${chunks.length}]`,
            metadata: addMeta({ sectionType: "bab", babRoman: b.roman, babTitle: b.title, pageNumber }),
            data: payload,
          }
        });
      });
    }

  } else if (pasals.length > 0) {
    for (const p of pasals) {
      const header = [
        p.babRoman ? `BAB ${p.babRoman}${p.babTitle ? `: ${p.babTitle}` : ""}` : null,
        `Pasal ${p.pasalNo}${p.pasalTitle ? `. ${p.pasalTitle}` : ""}`,
      ].filter(Boolean).join("\n");
      let chunks = chunkPasalContent(p.content);
      if (chunks.length > MAX_CHUNKS_PER_GROUP) {
        const ratio = Math.ceil(chunks.length / MAX_CHUNKS_PER_GROUP);
        chunks = chunks.reduce((acc, c, i) => {
          if (i % ratio === 0) acc.push(c); else acc[acc.length-1] += "\n\n" + c;
          return acc;
        }, []);
      }
      chunks.forEach((ck, idx) => {
        const payload = `${header}\n\n${ck}`.trim();
        if (seen.has(payload)) return; seen.add(payload);
        out.push({
          json: {
            title: `${fileName} :: Pasal ${p.pasalNo} [${idx+1}/${chunks.length}]`,
            metadata: addMeta({ sectionType: "pasal", pasalNo: p.pasalNo, pageNumber }),
            data: payload,
          }
        });
      });
    }

  } else if (sections.length > 0) {
    for (const s of sections) {
      const header = `${s.secNo ? `Section ${s.secNo}` : s.secTitle}${s.secTitle && s.secNo ? ` - ${s.secTitle}` : ""}`;
      let chunks = chunkParagraphs(s.content);
      if (chunks.length > MAX_CHUNKS_PER_GROUP) {
        const ratio = Math.ceil(chunks.length / MAX_CHUNKS_PER_GROUP);
        chunks = chunks.reduce((acc, c, i) => {
          if (i % ratio === 0) acc.push(c); else acc[acc.length-1] += "\n\n" + c;
          return acc;
        }, []);
      }
      chunks.forEach((ck, idx) => {
        const payload = `${header}\n\n${ck}`.trim();
        if (seen.has(payload)) return; seen.add(payload);
        out.push({
          json: {
            title: `${fileName} :: ${s.secNo ? `Section ${s.secNo}` : s.secTitle} [${idx+1}/${chunks.length}]`,
            metadata: addMeta({ sectionType: s.secNo ? "numeric" : "word", secNo: s.secNo, secTitle: s.secTitle, pageNumber }),
            data: payload,
          }
        });
      });
    }

  } else {
    const chunks = chunkParagraphs(text);
    chunks.forEach((ck, idx) => {
      if (seen.has(ck)) return; seen.add(ck);
      out.push({
        json: {
          title: `${fileName} :: chunk [${idx+1}/${chunks.length}]`,
          metadata: addMeta({ sectionType: "generic", pageNumber, chunkIndex: idx }),
          data: ck,
        }
      });
    });
  }
}

// --- Safety net ---
if (out.length > MAX_TOTAL_CHUNKS) {
  const k = Math.ceil(out.length / MAX_TOTAL_CHUNKS);
  const merged = [];
  for (let i = 0; i < out.length; i += k) {
    const group = out.slice(i, i+k);
    const first = group[0];
    merged.push({
      json: {
        title: first.json.title.replace(/\[\d+\/\d+\]/, "[merged]"),
        metadata: { ...first.json.metadata, note: "merged_for_limit" },
        data: group.map(g => g.json.data).join("\n\n")
      }
    });
  }
  return merged;
}

return out;
