/**
 * Meridian Toolkit · pure, dependency-free local utility engines.
 * No network, telemetry, storage or mutation of caller-provided data.
 */
export const MAX_INPUT_CHARS = 1_000_000;
export const MAX_CSV_ROWS = 2000;
export const MAX_CSV_COLUMNS = 120;
export const MAX_DIFF_LINES = 260;

export function guardInput(input) {
  if (typeof input !== "string") throw new TypeError("Expected text input");
  if (input.length > MAX_INPUT_CHARS) throw new RangeError("Input exceeds the 1,000,000 character safety limit");
  return input;
}

export function formatJson(input, mode = "pretty") {
  guardInput(input);
  const data = JSON.parse(input);
  if (mode !== "pretty" && mode !== "compact") throw new Error("Unknown JSON mode");
  return JSON.stringify(data, null, mode === "pretty" ? 2 : 0);
}

/** Supported paths: $.key, $[0], $["key.with.dots"]. No eval or prototype traversal. */
export function getJsonPath(input, rawPath) {
  const data = JSON.parse(guardInput(input));
  const path = String(rawPath ?? "").trim();
  if (!path.startsWith("$") || path.length > 240) throw new Error("Path must start with $ and be <= 240 characters");
  let index = 1, node = data, depth = 0;
  while (index < path.length) {
    if (++depth > 32) throw new RangeError("Path is too deep");
    const suffix = path.slice(index);
    const match = /^\.([A-Za-z_$][\w$-]*)|^\[(\d+)\]|^\[("(?:\\.|[^"\\])*")\]/.exec(suffix);
    if (!match) throw new Error("Unsupported JSON path syntax");
    const key = match[1] ?? (match[2] !== undefined ? Number(match[2]) : JSON.parse(match[3]));
    if (["__proto__", "prototype", "constructor"].includes(String(key))) throw new Error("Protected key in path");
    if (node === null || typeof node !== "object" || !Object.hasOwn(node, key)) throw new Error("Path not found");
    node = node[key];
    index += match[0].length;
  }
  return JSON.stringify(node, null, 2) ?? "undefined";
}

function chooseDelimiter(text) {
  let quotes = false;
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quotes && text[i + 1] === '"') { i++; continue; }
      quotes = !quotes;
    } else if (!quotes && (c === "\n" || c === "\r")) break;
    else if (!quotes && c in counts) counts[c]++;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] ? sorted[0][0] : ",";
}

/** RFC 4180 quotes, CRLF, UTF-8 BOM and embedded newlines; errors are explicit. */
export function parseCsv(input, delimiter = "auto") {
  let source = guardInput(input).replace(/^\uFEFF/, "");
  if (!source.trim()) return { rows: [], delimiter: "," };
  const sep = delimiter === "auto" ? chooseDelimiter(source) : delimiter;
  if (![",", ";", "\t"].includes(sep)) throw new Error("Unsupported delimiter");
  const rows = [];
  let row = [], field = "", quoted = false, afterQuote = false, atFieldStart = true;
  const addField = () => {
    if (row.length >= MAX_CSV_COLUMNS) throw new RangeError("CSV has too many columns");
    row.push(field); field = ""; atFieldStart = true; afterQuote = false;
  };
  const addRow = () => {
    if (rows.length >= MAX_CSV_ROWS) throw new RangeError("CSV has too many rows");
    rows.push(row); row = [];
  };
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; afterQuote = true; }
      } else field += c;
    } else if (afterQuote) {
      if (c === sep) addField();
      else if (c === "\n" || c === "\r") {
        addField(); addRow();
        if (c === "\r" && source[i + 1] === "\n") i++;
      } else throw new Error("Unexpected character after closing CSV quote");
    } else if (c === '"' && atFieldStart) {
      quoted = true; atFieldStart = false;
    } else if (c === '"') {
      throw new Error("Unexpected quote in unquoted CSV field");
    } else if (c === sep) addField();
    else if (c === "\n" || c === "\r") {
      addField(); addRow();
      if (c === "\r" && source[i + 1] === "\n") i++;
    } else {
      field += c; atFieldStart = false;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field");
  if (field !== "" || row.length || (source.length && !/[\r\n]$/.test(source))) {
    addField(); addRow();
  }
  return { rows, delimiter: sep };
}

export function csvAsJson(input) {
  const { rows } = parseCsv(input);
  if (!rows.length) return "[]";
  const counter = new Map();
  const keys = rows[0].map((name, n) => {
    const base = name.trim() || "column_" + (n + 1);
    const count = (counter.get(base) || 0) + 1;
    counter.set(base, count);
    return count === 1 ? base : base + "_" + count;
  });
  return JSON.stringify(rows.slice(1).map(row => Object.fromEntries(
    keys.map((key, i) => [key, row[i] ?? ""])
  )), null, 2);
}

export function serializeCsv(rows, delimiter = ",") {
  if (![",", ";", "\t"].includes(delimiter)) throw new Error("Unsupported delimiter");
  if (!Array.isArray(rows) || rows.length > MAX_CSV_ROWS) throw new RangeError("Invalid row count");
  return rows.map(row => {
    if (!Array.isArray(row) || row.length > MAX_CSV_COLUMNS) throw new RangeError("Invalid column count");
    return row.map(value => {
      const raw = String(value ?? "");
      // Formula injection mitigation when opening user CSV in spreadsheet apps.
      const safe = /^[\s]*[=+\-@]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replaceAll('"', '""') + '"';
    }).join(delimiter);
  }).join("\r\n") + (rows.length ? "\r\n" : "");
}

export function diffLines(left, right) {
  const a = guardInput(left).replace(/\r\n?/g, "\n").split("\n");
  const b = guardInput(right).replace(/\r\n?/g, "\n").split("\n");
  if (left === "") a.length = 0;
  if (right === "") b.length = 0;
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES)
    throw new RangeError("Diff is limited to 260 lines per side");
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const lines = [];
  let i = 0, j = 0, added = 0, removed = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      lines.push({ type: "same", text: a[i++] }); j++;
    } else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) {
      lines.push({ type: "add", text: b[j++] }); added++;
    } else { lines.push({ type: "remove", text: a[i++] }); removed++; }
  }
  return { lines, added, removed, unchanged: lines.length - added - removed };
}

function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(bin);
}
function base64ToBytes(text) {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))
    throw new Error("Invalid Base64");
  const bin = atob(text);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
export function transformEncoding(input, format, direction = "encode") {
  guardInput(input);
  const encode = direction === "encode";
  if (!encode && direction !== "decode") throw new Error("Unknown direction");
  if (format === "url") return encode ? encodeURIComponent(input) : decodeURIComponent(input);
  if (format === "base64") {
    if (encode) return bytesToBase64(new TextEncoder().encode(input));
    return new TextDecoder("utf-8", { fatal: true }).decode(base64ToBytes(input.trim()));
  }
  if (format === "hex") {
    if (encode) return [...new TextEncoder().encode(input)].map(n => n.toString(16).padStart(2, "0")).join("");
    const clean = input.trim();
    if (clean.length % 2 || !/^(?:[A-Fa-f0-9]{2})*$/.test(clean)) throw new Error("Invalid hexadecimal bytes");
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(clean.match(/../g) || [], c => parseInt(c, 16)));
  }
  throw new Error("Unknown encoding");
}

export async function sha256(input, webCrypto = globalThis.crypto) {
  const bytes = new TextEncoder().encode(guardInput(input));
  if (!webCrypto?.subtle) throw new Error("Secure context required for SHA-256");
  const digest = await webCrypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function timeInfo(value, now = Date.now()) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error("Enter an ISO date or Unix timestamp");
  let ms;
  if (/^-?\d{1,16}$/.test(text)) {
    const n = Number(text);
    ms = Math.abs(n) < 1e11 ? n * 1000 : n;
  } else ms = Date.parse(text);
  if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) throw new Error("Invalid timestamp");
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid date");
  const elapsedSeconds = Math.trunc((ms - now) / 1000);
  return {
    iso: date.toISOString(), unixSeconds: Math.floor(ms / 1000),
    unixMilliseconds: ms, local: date.toLocaleString(),
    relativeSeconds: elapsedSeconds,
  };
}

export function parseHexColor(input) {
  if (typeof input !== "string") throw new Error("Hex color required");
  const hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) return hex.split("").map(c => parseInt(c + c, 16));
  if (/^[0-9a-f]{6}$/i.test(hex)) return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  throw new Error("Use #RGB or #RRGGBB");
}
const luminance = rgb => rgb.map(x => {
  const v = x / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
export function colorContrast(foreground, background) {
  const fg = parseHexColor(foreground), bg = parseHexColor(background);
  const a = luminance(fg), b = luminance(bg);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  return {
    ratio,
    aaText: ratio >= 4.5, aaLarge: ratio >= 3,
    aaaText: ratio >= 7, aaaLarge: ratio >= 4.5,
    foreground: "#" + fg.map(x => x.toString(16).padStart(2, "0")).join(""),
    background: "#" + bg.map(x => x.toString(16).padStart(2, "0")).join(""),
  };
}

export function textStatistics(input) {
  const text = guardInput(input);
  const han = [...text.matchAll(/\p{Script=Han}/gu)].length;
  const englishWords = [...text.matchAll(/[A-Za-z]+(?:['-][A-Za-z]+)*/g)].length;
  const chars = [...text].length;
  const lines = text ? text.replace(/\r\n?/g, "\n").split("\n").length : 0;
  const bytes = new TextEncoder().encode(text).length;
  const readingMinutes = chars ? Math.max(1, Math.ceil(han / 300 + englishWords / 200)) : 0;
  return { chars, nonWhitespace: [...text.replace(/\s/g, "")].length, han, englishWords, lines, bytes, readingMinutes };
}

export function transformText(input, mode) {
  const text = guardInput(input).replace(/\r\n?/g, "\n");
  if (mode === "trim") return text.split("\n").map(line => line.trim()).join("\n").trim();
  if (mode === "dedupe") {
    const seen = new Set();
    return text.split("\n").filter(line => {
      if (seen.has(line)) return false;
      seen.add(line); return true;
    }).join("\n");
  }
  if (mode === "compact") return text.split("\n").map(s => s.trimEnd())
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
  throw new Error("Unknown text operation");
}
