const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");

const SQL_FILE_PATH = path.resolve(__dirname, "../../database/seeds/001_additional_pois.sql");
const DATASET_ID = "TCV_ADDITIONAL_POIS_V1";
const LANGUAGE_CODES = ["vi", "en", "zh-Hans", "ko", "ja", "ru", "fr", "de", "es", "it", "pt-BR", "nl", "pl", "cs", "tr"];
const ADDITIONAL_POI_NAMES = ["Hổ Bengal", "Gấu ngựa", "Báo hoa mai", "Chim hồng hạc", "Cá sấu hoa cà", "Vượn má vàng", "Đền thờ Vua Hùng", "Cây đa cổ thụ di sản"];
const hash = value => createHash("sha256").update(value).digest("hex");

// Only the seed's INSERT ... SELECT grammar is accepted. Quoted apostrophes and
// semicolons stay inside text; no SQL is executed while reading the source.
function splitStatements(content) {
  const text = content.replace(/^\uFEFF/, "");
  let source = "", inText = false;
  for (let i = 0; i < text.length; i++) {
    if (!inText && text[i] === "-" && text[i + 1] === "-" && /\s/.test(text[i + 2] || "\n")) {
      while (i < text.length && text[i] !== "\n") i++;
      source += "\n";
      continue;
    }
    source += text[i];
    if (text[i] === "'") {
      if (inText && text[i + 1] === "'") source += text[++i];
      else inText = !inText;
    }
  }
  const statements = []; let start = 0, quoted = false;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "'") {
      if (quoted && source[i + 1] === "'") { i++; continue; }
      quoted = !quoted;
    } else if (!quoted && source[i] === ";") {
      if (source.slice(start, i).trim()) statements.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quoted) throw new Error("ADDITIONAL_SQL_UNTERMINATED_TEXT");
  if (source.slice(start).trim()) throw new Error("ADDITIONAL_SQL_MISSING_TERMINATOR");
  return statements;
}

function fields(source) {
  const result = []; let rest = source.trim();
  while (rest) {
    const match = rest.match(/^(?:'((?:[^']|'')*)'|(-?\d+(?:\.\d+)?))(?:\s*,\s*|\s*$)/);
    if (!match) throw new Error("ADDITIONAL_SQL_INVALID_VALUE");
    result.push(match[1] === undefined ? Number(match[2]) : match[1].replaceAll("''", "'"));
    rest = rest.slice(match[0].length);
  }
  return result;
}

function parseInput(content, translationsSource) {
  const statements = splitStatements(content);
  if (statements.length !== 128) throw new Error("ADDITIONAL_SQL_RECORD_COUNT");
  const pois = [], translated = [];
  for (const statement of statements) {
    if (statement.startsWith("INSERT INTO POIS ")) {
      const match = statement.match(/^INSERT INTO POIS \(name, category, conservation_status, activity_hours, latitude, longitude, trigger_radius, display_order, status, content_version\)\s+SELECT ([\s\S]+?)\s+WHERE NOT EXISTS \(SELECT 1 FROM POIS WHERE name = '((?:[^']|'')*)'\)$/);
      if (!match) throw new Error("ADDITIONAL_SQL_INVALID_POI");
      const row = fields(match[1]);
      const [name, category, conservationStatus, activityHours, latitude, longitude, radius, displayOrder, status, sourceVersion] = row;
      const poiId = 11 + pois.length;
      if (row.length !== 10 || name !== ADDITIONAL_POI_NAMES[pois.length] || match[2].replaceAll("''", "'") !== name ||
          !["ANIMAL", "PLANT", "HERITAGE"].includes(category) || status !== "ACTIVE" || sourceVersion !== 1 || displayOrder !== poiId ||
          !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !Number.isSafeInteger(radius) || radius < 1) throw new Error("ADDITIONAL_SQL_POI_MISMATCH");
      pois.push({ poiId, name, category, conservationStatus, activityHours, latitude, longitude, radius, displayOrder, sourceVersion, translations: {} });
    } else {
      const match = statement.match(/^INSERT INTO POI_TRANSLATIONS \(poi_id, language_code, name, description, audio_script, source_version, status\)\s+SELECT p\.poi_id, ([\s\S]+?)\s+FROM POIS p\s+WHERE p\.name = '((?:[^']|'')*)'\s+AND NOT EXISTS \(SELECT 1 FROM POI_TRANSLATIONS pt WHERE pt\.poi_id = p\.poi_id AND pt\.language_code = '([^']+)'\)$/);
      if (!match) throw new Error("ADDITIONAL_SQL_INVALID_TRANSLATION");
      const row = fields(match[1]);
      const [languageCode, name, description, audioScript, version, status] = row;
      if (row.length !== 6 || languageCode !== match[3] || !LANGUAGE_CODES.includes(languageCode) || version !== 1 || status !== "READY" ||
          [name, description, audioScript].some(value => typeof value !== "string" || !value.trim())) throw new Error("ADDITIONAL_SQL_TRANSLATION_MISMATCH");
      translated.push({ originalName: match[2].replaceAll("''", "'"), languageCode, name, description, audioScript });
    }
  }
  if (pois.length !== 8 || translated.length !== 120 || Object.keys(translationsSource).length !== 8) throw new Error("ADDITIONAL_INPUT_RECORD_COUNT");
  for (const row of translated) {
    const poi = pois.find(item => item.name === row.originalName);
    if (!poi || poi.translations[row.languageCode]) throw new Error("ADDITIONAL_INPUT_DUPLICATE_TRANSLATION");
    poi.translations[row.languageCode] = { name: row.name, description: row.description, audioScript: row.audioScript };
  }
  for (const poi of pois) {
    const source = translationsSource[poi.poiId];
    if (!source || source.originalName !== poi.name || Object.keys(source.translations).length !== 13 ||
        LANGUAGE_CODES.some(code => !poi.translations[code])) throw new Error("ADDITIONAL_INPUT_LANGUAGE_COVERAGE");
    for (const code of LANGUAGE_CODES.slice(2)) {
      if (!source.translations[code] || ["name", "description", "audioScript"].some(field =>
        source.translations[code][field] !== poi.translations[code][field])) throw new Error("ADDITIONAL_SQL_DATASET_TEXT_MISMATCH");
    }
    poi.translations = Object.fromEntries(LANGUAGE_CODES.map(code => [code, poi.translations[code]]));
  }
  return { datasetId: DATASET_ID, sourceSha256: hash(JSON.stringify({ datasetId: DATASET_ID, pois })), pois };
}

async function loadSqlStatements() { return splitStatements(await fs.readFile(SQL_FILE_PATH, "utf8")); }
async function loadInput() {
  return parseInput(await fs.readFile(SQL_FILE_PATH, "utf8"), require("../../data/demo/additional-pois-translations.cjs"));
}

module.exports = { DATASET_ID, LANGUAGE_CODES, ADDITIONAL_POI_NAMES, SQL_FILE_PATH, splitStatements, parseInput, loadInput, loadSqlStatements };
