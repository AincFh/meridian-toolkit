import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  MAX_INPUT_CHARS, MAX_DIFF_LINES, guardInput,
  formatJson, getJsonPath, parseCsv, csvAsJson, serializeCsv,
  diffLines, transformEncoding, sha256, timeInfo,
  parseHexColor, colorContrast, textStatistics, transformText,
} from "../src/engines.js";

test("rejects non-string and oversized input before expensive processing", () => {
  assert.throws(() => guardInput(null), TypeError);
  assert.equal(guardInput("hello"), "hello");
  assert.throws(() => guardInput("x".repeat(MAX_INPUT_CHARS + 1)), RangeError);
});

test("JSON pretty/compact retain values and are roundtrip equivalent", () => {
  const original='{"ok":true,"count":0,"nested":{"items":[null,"中文",4]}}';
  const pretty=formatJson(original);
  assert.ok(pretty.includes("\n  "));
  assert.deepEqual(JSON.parse(pretty),JSON.parse(original));
  assert.equal(formatJson(pretty,"compact"),original);
  assert.throws(()=>formatJson(original,"indent"),/Unknown/);
});

test("JSON parser rejects malformed objects and never uses eval", () => {
  assert.throws(()=>formatJson("{__proto__:1}"),SyntaxError);
  assert.throws(()=>formatJson("(()=>42)()"),SyntaxError);
});

test("JSON path supports object, arrays and escaped bracket keys", () => {
  const body='{"foo":{"bar":[{"value":12}]},"a.b":"works","nullish":null}';
  assert.equal(getJsonPath(body,"$.foo.bar[0].value"),"12");
  assert.equal(getJsonPath(body,'$["a.b"]'),'"works"');
  assert.equal(getJsonPath(body,"$.nullish"),"null");
  assert.equal(JSON.parse(getJsonPath(body,"$")).foo.bar[0].value,12);
});

test("JSON path blocks prototype access and untrusted syntax", () => {
  const data='{"safe":1}';
  for(const path of ["safe","$.constructor","$.__proto__","$.prototype","$.safe()","$[foo]"])
    assert.throws(()=>getJsonPath(data,path));
  assert.throws(()=>getJsonPath(data,"$.missing"),/not found/);
  let nested={leaf:1};
  for(let i=0;i<40;i++)nested={next:nested};
  assert.throws(()=>getJsonPath(JSON.stringify(nested),"$"+".next".repeat(40)),RangeError);
});

test("CSV parses UTF-8 BOM, commas, CRLF and quoted multiline fields", () => {
  const input='\uFEFFname,description\r\n"Meridian","Hello, ""world""\n第二行"\r\n';
  const {rows,delimiter}=parseCsv(input);
  assert.equal(delimiter,",");
  assert.deepEqual(rows,[
    ["name","description"],["Meridian",'Hello, "world"\n第二行'],
  ]);
});

test("CSV autodetects tab and semicolon rather than splitting quoted commas", () => {
  assert.deepEqual(parseCsv('name;price\n"tea,green";12').rows,[
    ["name","price"],["tea,green","12"],
  ]);
  assert.deepEqual(parseCsv("a\tb\n1\t2").rows,[["a","b"],["1","2"]]);
  assert.equal(parseCsv("a\tb").delimiter,"\t");
});

test("CSV detects unclosed and misplaced quote syntax", () => {
  assert.throws(()=>parseCsv('a,b\n"oops,hello'),/Unclosed/);
  assert.throws(()=>parseCsv('a,b\nbad"quote",hi'),/Unexpected quote/);
  assert.throws(()=>parseCsv('"good"x,other'),/Unexpected character/);
});

test("CSV preserves empty fields, trailing comma and no trailing newline", () => {
  assert.deepEqual(parseCsv("a,b,\n1,,3").rows,[["a","b",""],["1","","3"]]);
  assert.deepEqual(parseCsv('""').rows,[[""]]);
  assert.deepEqual(parseCsv("").rows,[]);
});

test("CSV row/column limits prevent malicious large preview allocations", () => {
  assert.throws(()=>parseCsv("x\n".repeat(2001)),RangeError);
  assert.throws(()=>parseCsv("a,".repeat(121)),RangeError);
});

test("CSV to JSON preserves duplicate headers with stable suffixes", () => {
  const rows=JSON.parse(csvAsJson("id,id,\n1,2,hello\n3,4,world"));
  assert.deepEqual(rows,[
    {id:"1",id_2:"2",column_3:"hello"},
    {id:"3",id_2:"4",column_3:"world"},
  ]);
  assert.equal(csvAsJson(""),"[]");
});

test("CSV serializer quotes every value and protects spreadsheet formula injection", () => {
  const csv=serializeCsv([["title","value"],["=1+1","-2"],["+SUM(A1)","@x"],["safe","comma, quote \" test"]]);
  assert.ok(csv.includes('"\'=1+1"'));
  assert.ok(csv.includes('"\'-2"'));
  assert.ok(csv.includes('"\'@x"'));
  assert.ok(csv.includes('"comma, quote "" test"'));
  assert.equal(parseCsv(csv).rows[1][0],"'=1+1");
});

test("CSV reserializes safe multi-line roundtrip without losing the content", () => {
  const rows=[["name","note"],["中文","line\nanother"],["0","a,b"]];
  assert.deepEqual(parseCsv(serializeCsv(rows)).rows,rows);
});

test("diff identifies same, inserted and deleted lines", () => {
  const result=diffLines("alpha\nbeta\ncharlie","alpha\ndelta\ncharlie");
  assert.equal(result.added,1);
  assert.equal(result.removed,1);
  assert.equal(result.unchanged,2);
  assert.ok(result.lines.some(x=>x.type==="add"&&x.text==="delta"));
  assert.ok(result.lines.some(x=>x.type==="remove"&&x.text==="beta"));
});

test("diff handles empty and identical inputs", () => {
  assert.deepEqual(diffLines("",""),{lines:[],added:0,removed:0,unchanged:0});
  const same=diffLines("one\ntwo","one\ntwo");
  assert.equal(same.unchanged,2);
  assert.equal(same.added+same.removed,0);
});

test("diff enforces linear-view bounds instead of freezing the browser", () => {
  assert.throws(()=>diffLines("a\n".repeat(MAX_DIFF_LINES+1),"b"),RangeError);
});

test("UTF-8 Base64, URL and hexadecimal roundtrip Chinese Unicode", () => {
  const source="Hello, 世界 🌿";
  for(const format of ["url","base64","hex"]){
    const encoded=transformEncoding(source,format);
    assert.equal(transformEncoding(encoded,format,"decode"),source);
  }
});

test("encoding validates invalid bytes and rejects unknown formats", () => {
  assert.throws(()=>transformEncoding("*","base64","decode"),/Base64/);
  assert.throws(()=>transformEncoding("ff","hex","decode"));
  assert.throws(()=>transformEncoding("0","hex","decode"),/hexadecimal/);
  assert.throws(()=>transformEncoding("%GG","url","decode"));
  assert.throws(()=>transformEncoding("x","rot13"),/Unknown/);
});

test("SHA-256 matches well-known empty and ASCII test vectors", async()=>{
  assert.equal(await sha256("",webcrypto),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(await sha256("abc",webcrypto),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("SHA-256 refuses unavailable insecure context instead of inventing a result",async()=>{
  await assert.rejects(()=>sha256("hello",{}),/Secure context/);
});

test("time interprets UTC, Unix seconds and Unix milliseconds",()=>{
  assert.equal(timeInfo("0",0).iso,"1970-01-01T00:00:00.000Z");
  assert.equal(timeInfo("1700000000").unixMilliseconds,1700000000000);
  assert.equal(timeInfo("1700000000000").unixSeconds,1700000000);
  assert.equal(timeInfo("2026-11-06T00:00:00Z").iso,"2026-11-06T00:00:00.000Z");
});

test("time rejects invalid and oversized timestamps",()=>{
  for(const input of ["","not a date","9999999999999999","2026-13-60","NaN"]){
    assert.throws(()=>timeInfo(input));
  }
});

test("WCAG sRGB contrast correctly calculates black/white 21:1",()=>{
  const result=colorContrast("#000000","#ffffff");
  assert.ok(Math.abs(result.ratio-21)<1e-9);
  assert.equal(result.aaText,true);
  assert.equal(result.aaaText,true);
  assert.equal(result.foreground,"#000000");
});

test("WCAG contrast is symmetric and rejects illegible identical colors",()=>{
  const a=colorContrast("#369","#fff"),b=colorContrast("#fff","#369");
  assert.ok(Math.abs(a.ratio-b.ratio)<1e-12);
  const same=colorContrast("#333","#333");
  assert.equal(same.ratio,1);
  assert.equal(same.aaLarge,false);
  assert.deepEqual(parseHexColor("#abc"),[170,187,204]);
  assert.throws(()=>parseHexColor("#12345"),/Use/);
});

test("text stats count Chinese, Latin words, bytes and multiline consistently",()=>{
  const result=textStatistics("你好, Hello world!\n测试");
  assert.equal(result.han,4);
  assert.equal(result.englishWords,2);
  assert.equal(result.lines,2);
  assert.ok(result.bytes>result.chars);
  assert.equal(result.readingMinutes,1);
  assert.equal(textStatistics("").lines,0);
});

test("text cleanup preserves unique order and normalizes Windows line endings",()=>{
  assert.equal(transformText(" a  \r\n b \r\n","trim"),"a\nb");
  assert.equal(transformText("x\r\nx\r\nz","dedupe"),"x\nz");
  assert.equal(transformText("a  \n\n\n\nb \n","compact"),"a\n\nb");
  assert.throws(()=>transformText("text","eval"),/Unknown/);
});
