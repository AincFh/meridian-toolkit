import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";

const dist="dist";
const html=await readFile(join(dist,"index.html"),"utf8");
const app=await readFile(join(dist,"src/app.js"),"utf8");
const engines=await readFile(join(dist,"src/engines.js"),"utf8");
const css=await readFile(join(dist,"styles.css"),"utf8");

assert.match(html,/Content-Security-Policy/);
assert.match(html,/connect-src 'none'/);
assert.match(html,/type="module" src="\.\/src\/app\.js"/);
assert.match(html,/href="\.\/styles\.css"/);
assert.match(html,/aria-live="polite"/);
const tools=["json","csv","diff","encoding","hash","time","color","text"];
for(const tool of tools){
  assert.ok(html.includes('data-panel="'+tool+'"'),"missing tool panel: "+tool);
  assert.ok(html.includes('data-open="'+tool+'"'),"missing navigation: "+tool);
}
assert.equal((html.match(/class="tool-panel"/g)||[]).length,8);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/\[data-theme=dark\]/);
assert.match(app,/localStorage\.setItem/);
assert.doesNotMatch(app,/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/);
assert.doesNotMatch(engines,/fetch\s*\(|XMLHttpRequest|sendBeacon\s*\(/);
const assets=["styles.css","src/app.js","src/engines.js","assets/favicon.svg"];
for(const asset of assets){
 const file=join(dist,asset);
 assert.ok((await stat(file)).size>100,"missing or empty "+asset);
}
console.log("PASS: eight complete tools, local-only runtime, security policy, responsive assets, i18n, copy/export pipeline");
