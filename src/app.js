import {
  MAX_INPUT_CHARS, formatJson, getJsonPath, parseCsv, csvAsJson, serializeCsv,
  diffLines, transformEncoding, sha256, timeInfo, colorContrast, textStatistics,
  transformText, guardInput,
} from "./engines.js";

const $ = id => document.getElementById(id);
const TOOL_ORDER = ["json","csv","diff","encoding","hash","time","color","text"];
const OUTPUT_IDS = {
  json:"jsonOutput",csv:"csvOutput",diff:null,encoding:"encodingOutput",
  hash:"hashOutput",time:"timeOutput",color:null,text:"textOutput",
};
const INPUT_IDS = {
  json:"jsonInput",csv:"csvInput",diff:"diffLeft",encoding:"encodingInput",
  hash:"hashInput",time:"timeInput",color:null,text:"textInput",
};
const TITLES = {
  zh:{ json:"JSON 工作台",csv:"CSV 数据表",diff:"文本差异",encoding:"编码转换",
    hash:"SHA-256 摘要",time:"时间转换",color:"颜色对比度",text:"文字整理" },
  en:{ json:"JSON Studio",csv:"CSV Inspector",diff:"Text Diff",encoding:"Encodings",
    hash:"SHA-256 Digest",time:"Time Converter",color:"Color Contrast",text:"Text Lab" },
};
const DESCRIPTIONS = {
  zh:{
    json:"检查、格式化与精确定位 JSON 数据，不需要上传到任何服务。",
    csv:"读取、预览和转换 CSV / TSV 文件，正确处理复杂引用和多行字段。",
    diff:"以清晰的逐行对比查看文本修改，无需远程仓库或上传。",
    encoding:"本机处理 Unicode、URL、Base64 与十六进制编码。",
    hash:"使用浏览器原生加密能力，为任意文本生成 SHA-256 摘要。",
    time:"将 Unix 秒、毫秒与 ISO 日期转换为可核实的时间格式。",
    color:"校验文字与背景色是否符合 WCAG AA / AAA 对比度标准。",
    text:"统计、清洗与去重文字，适用于教程、记录和源码说明。",
  },
  en:{
    json:"Validate, format and inspect structured JSON without uploading a byte.",
    csv:"Parse, preview and convert CSV / TSV, including quoted multiline fields.",
    diff:"Review line-by-line additions and removals without a remote service.",
    encoding:"Convert UTF-8, URL, Base64 and hexadecimal text locally.",
    hash:"Compute SHA-256 digests with your browser's native Web Crypto.",
    time:"Convert Unix seconds, milliseconds and ISO timestamps reliably.",
    color:"Check foreground/background contrast against WCAG AA and AAA.",
    text:"Inspect, clean and deduplicate text without remote processing.",
  },
};
const I18N = {
  zh:{
    skip:"跳转到工具工作区",sideIntro:"一个工作空间，完成日常开发中的精确操作。",
    navStructure:"结构与数据",navTransform:"转换与验证",navExplore:"内容与设计",
    navJson:"JSON 工作台",navCsv:"CSV 数据表",navDiff:"文本差异",navEncoding:"编码转换",
    navHash:"SHA-256 摘要",navTime:"时间转换",navColor:"颜色对比度",navText:"文字整理",
    localOnly:"所有计算均在本机运行",noUpload:"无上传 · 无账号 · 无追踪",findTool:"搜索工具",
    loadFile:"导入本地文件",clear:"清空内容",copy:"复制结果",download:"导出结果",
    source:"输入数据",result:"处理结果",jsonHeading:"结构化数据校验",
    jsonHint:"安全解析 JSON、紧凑化，或用简化路径读取嵌套字段。",
    jsonPretty:"格式化 JSON",jsonCompact:"压缩",validate:"校验",path:"字段路径",
    extract:"提取字段",csvHeading:"CSV 表格读取与转换",
    csvHint:"支持逗号、分号、制表符、BOM、引号与多行字段；本机预览、转换 JSON。",
    preview:"预览表格",csvNormalize:"规范化 CSV",diffHeading:"逐行文本差异检查",
    diffHint:"比较两份文本的插入、删除与未修改行；单侧最多 260 行，防止浏览器卡顿。",
    original:"原始文本",revised:"修改后文本",compare:"执行比较",
    encodingHeading:"文字与字节编码转换",encodingHint:"UTF-8 Base64、URL 与 Hex 的双向转换，支持中文和 emoji。",
    encodingType:"编码方式",encode:"编码",decode:"解码",
    hashHeading:"SHA-256 校验摘要",hashHint:"使用浏览器 Web Crypto 原生 API 计算文本摘要；不会发送数据或保存输入。",
    computeHash:"计算 SHA-256",hashNote:"安全上下文（HTTPS 或 localhost）可用",
    timeHeading:"Unix 时间与 ISO 格式",timeHint:"秒、毫秒、ISO 8601 双向识别，显示 UTC 和本地时间。",
    timeInputLabel:"时间文本",convert:"转换时间",useNow:"使用当前设备时间",
    colorHeading:"文字与背景色对比度",colorHint:"计算 WCAG 对比度与 AA / AAA 可读性，不依赖截图和外部 API。",
    foreground:"文字颜色",background:"背景颜色",checkContrast:"检测对比度",
    swapColors:"交换颜色",colorExample:"清晰优先，兼顾舒适阅读。",
    textHeading:"文字统计与清洗",
    textHint:"统计中英文、字符、行和字节，自动清理行尾空格、重复行与多余空行。",
    analyze:"分析文本",trim:"去除首尾空格",dedupe:"行去重",compact:"整理空行",
    footer:"输入数据只停留在当前浏览器页面 · 不自动保存 · 不发往网络",
  },
  en:{
    skip:"Skip to workspace",sideIntro:"One focused space for precise everyday engineering work.",
    navStructure:"DATA & STRUCTURE",navTransform:"TRANSFORMS",navExplore:"CONTENT & DESIGN",
    navJson:"JSON Studio",navCsv:"CSV Inspector",navDiff:"Text Diff",navEncoding:"Encodings",
    navHash:"SHA-256 Digest",navTime:"Time Converter",navColor:"Color Contrast",navText:"Text Lab",
    localOnly:"Runs entirely on this device",noUpload:"No uploads · No account · No tracking",findTool:"Find tools",
    loadFile:"Open local file",clear:"Clear input",copy:"Copy result",download:"Export result",
    source:"Input",result:"Output",jsonHeading:"Structured data validation",
    jsonHint:"Safely parse and compact JSON, or access nested values through simple paths.",
    jsonPretty:"Format JSON",jsonCompact:"Minify",validate:"Validate",path:"JSON path",
    extract:"Get value",csvHeading:"CSV parsing and conversion",
    csvHint:"Commas, tabs, semicolons, BOM, quotes and multiline cells supported.",
    preview:"Preview table",csvNormalize:"Normalize CSV",diffHeading:"Line-by-line comparison",
    diffHint:"Track additions, removals and unchanged lines; max 260 per side.",
    original:"Original",revised:"Modified",compare:"Compare",
    encodingHeading:"Text / byte encodings",encodingHint:"Bidirectional UTF-8 Base64, URL and hex conversion.",
    encodingType:"Encoding",encode:"Encode",decode:"Decode",
    hashHeading:"SHA-256 checksum",hashHint:"Compute digests locally using the native Web Crypto API.",
    computeHash:"Compute SHA-256",hashNote:"Secure context (HTTPS or localhost) required",
    timeHeading:"Unix / ISO time",timeHint:"Recognize seconds, milliseconds and ISO 8601 timestamps.",
    timeInputLabel:"Time or timestamp",convert:"Convert",useNow:"Use device time",
    colorHeading:"Accessible color contrast",colorHint:"Calculate WCAG AA / AAA readability of text on backgrounds.",
    foreground:"Text color",background:"Background",checkContrast:"Check contrast",
    swapColors:"Swap colors",colorExample:"Designed for clarity and comfortable reading.",
    textHeading:"Text statistics and cleanup",
    textHint:"Count letters, characters, lines and bytes; trim and deduplicate text.",
    analyze:"Analyze text",trim:"Trim lines",dedupe:"Deduplicate lines",compact:"Compact whitespace",
    footer:"Your data stays in this browser tab · Never automatically saved or sent over the network",
  }
};
const state={tool:"json",language:"zh",theme:"light",outputs:new Map(),extensions:new Map(),toastTimer:null};
const safeStore={
  get(key){try{return localStorage.getItem(key)}catch{return null}},
  set(key,value){try{localStorage.setItem(key,value)}catch{}},
};
function make(tag,text,className){
  const item=document.createElement(tag);
  if(text!==undefined&&text!==null)item.textContent=String(text);
  if(className)item.className=className;
  return item;
}
const isEn=()=>state.language==="en";
function label(zh,en){return isEn()?en:zh}
function status(message,tone="neutral") {
  const el=$("status");el.textContent=message;el.dataset.tone=tone;
}
function toast(message){
  const el=$("toast");el.textContent=message;el.hidden=false;
  clearTimeout(state.toastTimer);
  state.toastTimer=setTimeout(()=>el.hidden=true,3200);
}
function keepResult(tool,value,extension="txt"){
  const output=String(value??"");
  state.outputs.set(tool,output);
  state.extensions.set(tool,extension);
  const target=OUTPUT_IDS[tool];
  if(target)$(target).value=output;
}
function updateLocale(){
  document.documentElement.lang=isEn()?"en":"zh-CN";
  for(const node of document.querySelectorAll("[data-key]")){
    const value=I18N[state.language][node.dataset.key];
    if(value!==undefined)node.textContent=value;
  }
  $("languageToggle").textContent=isEn()?"EN / 中":"中 / EN";
  $("toolSearch").placeholder=label("查找工具 · Ctrl K","Find tools · Ctrl K");
  $("colorPreview").querySelector("strong").textContent=label("清晰的文字。清晰的决定。","Clear text. Clear decisions.");
  $("jsonInput").placeholder='{"name": "Meridian", "active": true}';
  $("toolTitle").textContent=TITLES[state.language][state.tool]+".";
  $("toolDescription").textContent=DESCRIPTIONS[state.language][state.tool];
  $("breadcrumb").textContent=TITLES[state.language][state.tool];
  document.title="Meridian · "+TITLES[state.language][state.tool];
}
function applyTheme(){
  document.documentElement.dataset.theme=state.theme;
  $("themeToggle").title=label("切换明暗主题","Toggle light/dark theme");
  $("themeToggle").setAttribute("aria-pressed",String(state.theme==="dark"));
  document.querySelector('meta[name="theme-color"]').content=state.theme==="dark"?"#101b18":"#f5f7f6";
}
function navigate(tool){
  if(!TOOL_ORDER.includes(tool))tool="json";
  state.tool=tool;
  for(const node of document.querySelectorAll("[data-panel]"))
    node.hidden=node.dataset.panel!==tool;
  for(const nav of document.querySelectorAll("[data-open]")){
    if(nav.dataset.open===tool)nav.setAttribute("aria-current","page");
    else nav.removeAttribute("aria-current");
  }
  $("toolNumber").textContent="ENGINE / "+String(TOOL_ORDER.indexOf(tool)+1).padStart(2,"0");
  $("toolTitle").textContent=TITLES[state.language][tool]+".";
  $("toolDescription").textContent=DESCRIPTIONS[state.language][tool];
  $("breadcrumb").textContent=TITLES[state.language][tool];
  document.title="Meridian · "+TITLES[state.language][tool];
  $("copyOutput").disabled=!state.outputs.has(tool);
  $("downloadOutput").disabled=!state.outputs.has(tool);
  status(label("工具已就绪，数据仅在当前页面处理。","Ready. Inputs remain on this page."));
}
function bytesInfo(id,outputId){
  const input=$(id);if(!input)return;
  const byteLength=new TextEncoder().encode(input.value).length;
  $(outputId).textContent=byteLength.toLocaleString()+" B";
}
function buildStats(target,entries){
  const root=$(target);root.replaceChildren();
  for(const [name,value] of entries){
    const card=make("div",null,"metric-card");
    card.append(make("small",name),make("strong",value));
    root.append(card);
  }
}
function renderCsv(rows){
  const target=$("csvPreview");target.replaceChildren();
  if(!rows.length)return;
  const table=make("table");
  const thead=make("thead"),tr=make("tr");
  const headings=rows[0];
  for(const text of headings)tr.append(make("th",text));thead.append(tr);table.append(thead);
  const tbody=make("tbody");
  for(const row of rows.slice(1,41)){
    const tr=make("tr");
    for(let i=0;i<headings.length;i++)tr.append(make("td",row[i]??""));
    tbody.append(tr);
  }
  table.append(tbody);target.append(table);
}
function renderDiff(diff){
  const target=$("diffPreview");target.replaceChildren();
  const fragment=document.createDocumentFragment();
  for(const line of diff.lines){
    const row=make("div",null,"diff-line "+line.type);
    row.append(make("span",line.type==="add"?"+":line.type==="remove"?"−":" ","diff-sign"),
      make("span",line.text||" ","diff-value"));
    fragment.append(row);
  }
  target.append(fragment);
  $("diffMeta").textContent=label(
    "新增 "+diff.added+" / 删除 "+diff.removed+" / 不变 "+diff.unchanged,
    "Added "+diff.added+" / Removed "+diff.removed+" / Same "+diff.unchanged);
}
function renderTime(data){
  buildStats("timePreview",[
    ["ISO 8601 / UTC",data.iso],
    ["UNIX / SECONDS",data.unixSeconds],
    ["UNIX / MILLISECONDS",data.unixMilliseconds],
    [label("本地时区","LOCAL TIME"),data.local],
    [label("相对当前设备时间（秒）","FROM DEVICE NOW (SEC)"),data.relativeSeconds],
  ]);
  keepResult("time",[
    "ISO UTC: "+data.iso, "Unix seconds: "+data.unixSeconds,
    "Unix milliseconds: "+data.unixMilliseconds,
    "Local time: "+data.local,
    "Relative seconds from device now: "+data.relativeSeconds
  ].join("\n"),"txt");
}
function renderColor(){
  const fg=$("colorForegroundText").value.trim();
  const bg=$("colorBackgroundText").value.trim();
  const data=colorContrast(fg,bg);
  $("colorForeground").value=data.foreground;
  $("colorBackground").value=data.background;
  $("colorForegroundText").value=data.foreground;
  $("colorBackgroundText").value=data.background;
  const preview=$("colorPreview");
  preview.style.backgroundColor=data.background;
  preview.style.color=data.foreground;
  const target=$("colorStats");target.replaceChildren();
  const cards=[
    [label("对比度","Contrast ratio"),data.ratio.toFixed(2)+":1",true],
    ["WCAG AA",label("普通文字","Body text"),data.aaText],
    ["WCAG AA",label("大字号","Large text"),data.aaLarge],
    ["WCAG AAA",label("普通文字","Body text"),data.aaaText],
    ["WCAG AAA",label("大字号","Large text"),data.aaaLarge],
  ];
  for(const [title,value,pass] of cards){
    const card=make("div",null,"contrast-check");
    card.dataset.pass=pass?"yes":"no";
    card.append(make("small",title),make("strong",typeof value==="string"?value:
      pass?label("通过","Pass"):label("未通过","Fail")));
    if(typeof value!=="string")card.append(make("small",value));
    target.append(card);
  }
  keepResult("color",[
    "Foreground: "+data.foreground,"Background: "+data.background,
    "WCAG contrast: "+data.ratio.toFixed(3)+":1",
    "AA body: "+data.aaText,"AA large: "+data.aaLarge,
    "AAA body: "+data.aaaText,"AAA large: "+data.aaaLarge
  ].join("\n"),"txt");
  status(label("已完成颜色对比度计算。","Color accessibility checked."),"success");
}
function runText(mode){
  const input=$("textInput").value;
  const text=mode==="stats"?input:transformText(input,mode);
  const metrics=textStatistics(text);
  buildStats("textStats",[
    [label("字符","Characters"),metrics.chars],
    [label("非空格字符","Non-space"),metrics.nonWhitespace],
    [label("汉字","Han characters"),metrics.han],
    [label("英文单词","Latin words"),metrics.englishWords],
    [label("行数","Lines"),metrics.lines],
    ["UTF-8 bytes",metrics.bytes],
    [label("预计阅读（分钟）","Reading (minutes)"),metrics.readingMinutes],
  ]);
  if(mode==="stats"){
    keepResult("text",Object.entries(metrics).map(([k,v])=>k+": "+v).join("\n"));
  }else keepResult("text",text);
}
function validateCommandText(input){return guardInput(input)}
async function execute(command){
  let output, extension="txt";
  if(command.startsWith("json-")){
    const input=validateCommandText($("jsonInput").value);
    if(command==="json-format")output=formatJson(input);
    if(command==="json-compact")output=formatJson(input,"compact");
    if(command==="json-validate"){JSON.parse(input);output=label("JSON 格式有效","Valid JSON");}
    if(command==="json-path")output=getJsonPath(input,$("jsonPath").value);
    extension="json";keepResult("json",output,extension);
    $("jsonMeta").textContent=String(new TextEncoder().encode(output).length)+" B";
  }else if(command.startsWith("csv-")){
    const input=validateCommandText($("csvInput").value);
    const {rows,delimiter}=parseCsv(input);
    if(command==="csv-preview") {
      renderCsv(rows);
      output=label("共 "+Math.max(0,rows.length-1)+" 行数据，"+(rows[0]?.length||0)+" 列。预览前 40 行。",
        Math.max(0,rows.length-1)+" rows · "+(rows[0]?.length||0)+" columns. Previewing 40.");
    }else if(command==="csv-json"){output=csvAsJson(input);extension="json";renderCsv(rows);}
    else if(command==="csv-normalize"){output=serializeCsv(rows);extension="csv";renderCsv(rows);}
    $("csvMeta").textContent=label("分隔符：","Separator: ")+(delimiter==="\t"?"TAB":delimiter);
    keepResult("csv",output,extension);
  }else if(command==="diff"){
    const diff=diffLines($("diffLeft").value,$("diffRight").value);
    renderDiff(diff);
    keepResult("diff",diff.lines.map(line=>(line.type==="add"?"+":line.type==="remove"?"-":" ")+line.text).join("\n"),"diff");
  }else if(command==="encode"||command==="decode"){
    output=transformEncoding($("encodingInput").value,$("encodingFormat").value,command);
    keepResult("encoding",output);
  }else if(command==="hash"){
    output=await sha256($("hashInput").value);
    keepResult("hash",output,"sha256");
  }else if(command==="time"||command==="time-now"){
    if(command==="time-now")$("timeInput").value=new Date().toISOString();
    renderTime(timeInfo($("timeInput").value));
  }else if(command==="color"||command==="color-swap"){
    if(command==="color-swap"){
      const previous=$("colorForegroundText").value;
      $("colorForegroundText").value=$("colorBackgroundText").value;
      $("colorBackgroundText").value=previous;
    }
    renderColor();
  }else if(command.startsWith("text-")){
    runText(command==="text-stats"?"stats":command.slice(5));
  }else throw new Error("Unsupported tool operation");
  $("copyOutput").disabled=false;$("downloadOutput").disabled=false;
  if(command!=="color"&&command!=="color-swap")
    status(label("本地操作完成。","Completed locally."),"success");
}
async function run(command,button){
  if(button?.disabled)return;
  if(button)button.disabled=true;
  try{await execute(command)}
  catch(error){
    const message=error instanceof Error?error.message:String(error);
    status(label("处理失败：","Operation failed: ")+message,"error");
    toast(label("请检查输入内容或格式。","Please check the input and format."));
  }finally{if(button)button.disabled=false}
}
function clearCurrent(){
  const panel=document.querySelector('[data-panel="'+state.tool+'"]');
  if(!panel)return;
  for(const el of panel.querySelectorAll("textarea:not([readonly])"))el.value="";
  for(const el of panel.querySelectorAll("textarea[readonly]"))el.value="";
  if(state.tool==="time")$("timeInput").value="";
  if(state.tool==="color"){
    $("colorForegroundText").value="#164f46";$("colorBackgroundText").value="#ffffff";
    renderColor();
  }else{
    state.outputs.delete(state.tool);state.extensions.delete(state.tool);
    $("copyOutput").disabled=true;$("downloadOutput").disabled=true;
  }
  for(const id of ["csvPreview","diffPreview","timePreview","textStats"]){
    if(panel.contains($(id)))$(id).replaceChildren();
  }
  for(const id of ["jsonMeta","csvMeta","diffMeta"]){
    if(panel.contains($(id)))$(id).textContent="—";
  }
  bytesInfo("jsonInput","jsonBytes");bytesInfo("csvInput","csvBytes");
  status(label("当前输入和结果已清空。","Input and result cleared."));
}
async function copyCurrent(){
  const output=state.outputs.get(state.tool);
  if(output===undefined){toast(label("先运行工具生成结果。","Run a tool to generate output first."));return}
  try{
    await navigator.clipboard.writeText(output);
    toast(label("结果已复制到剪贴板。","Result copied to clipboard."));
  }catch{toast(label("剪贴板不可用；可使用导出结果。","Clipboard unavailable. Use Export instead."))}
}
function downloadCurrent(){
  const output=state.outputs.get(state.tool);
  if(output===undefined){toast(label("没有可导出的结果。","Nothing to export."));return}
  const ext=state.extensions.get(state.tool)||"txt";
  const blob=new Blob([output],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const anchor=make("a");anchor.href=url;anchor.download="meridian-"+state.tool+"."+ext;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  toast(label("文件已通过浏览器保存。","File downloaded by your browser."));
}
async function importFile(file){
  if(!file)return;
  if(file.size>MAX_INPUT_CHARS*4){
    status(label("导入失败：文件超出安全限制。","File is too large."),"error");return;
  }
  const id=INPUT_IDS[state.tool];
  if(!id){status(label("当前工具不支持文件输入。","This tool does not accept files."),"error");return}
  try{
    const content=guardInput(await file.text());
    $(id).value=content;
    $(id).dispatchEvent(new Event("input",{bubbles:true}));
    status(label("已导入本地文件：","Loaded local file: ")+file.name,"success");
  }catch(error){status(label("导入失败：","Import failed: ")+error.message,"error")}
}
function init(){
  state.language=safeStore.get("meridian-language")==="en"?"en":
    safeStore.get("meridian-language")==="zh"?"zh":
    (navigator.language||"").toLowerCase().startsWith("zh")?"zh":"en";
  state.theme=safeStore.get("meridian-theme")==="dark"?"dark":
    safeStore.get("meridian-theme")==="light"?"light":
    window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light";
  applyTheme();updateLocale();
  window.addEventListener("hashchange",()=>navigate(decodeURIComponent(location.hash.slice(1))));
  navigate(decodeURIComponent(location.hash.slice(1)));
  document.addEventListener("click",event=>{
    const button=event.target.closest("button[data-command]");
    if(button)run(button.dataset.command,button);
  });
  $("languageToggle").addEventListener("click",()=>{
    state.language=state.language==="zh"?"en":"zh";
    safeStore.set("meridian-language",state.language);
    updateLocale();
  });
  $("themeToggle").addEventListener("click",()=>{
    state.theme=state.theme==="light"?"dark":"light";
    safeStore.set("meridian-theme",state.theme);applyTheme();
  });
  $("loadFile").addEventListener("click",()=>$("fileInput").click());
  $("fileInput").addEventListener("change",async event=>{
    await importFile(event.target.files?.[0]);
    event.target.value="";
  });
  $("clearTool").addEventListener("click",clearCurrent);
  $("copyOutput").addEventListener("click",copyCurrent);
  $("downloadOutput").addEventListener("click",downloadCurrent);
  $("jsonInput").addEventListener("input",()=>bytesInfo("jsonInput","jsonBytes"));
  $("csvInput").addEventListener("input",()=>bytesInfo("csvInput","csvBytes"));
  for(const [picker,text] of [["colorForeground","colorForegroundText"],["colorBackground","colorBackgroundText"]]){
    $(picker).addEventListener("input",()=>{$(text).value=$(picker).value;renderColor()});
  }
  $("toolSearch").addEventListener("input",event=>{
    const q=event.target.value.toLocaleLowerCase().trim();
    for(const link of document.querySelectorAll("[data-open]")){
      const id=link.dataset.open;
      link.hidden=!!q&&!TITLES[state.language][id].toLocaleLowerCase().includes(q)&&!id.includes(q);
    }
  });
  $("toolSearch").addEventListener("keydown",event=>{
    if(event.key==="Enter"){
      const found=[...document.querySelectorAll("[data-open]")].find(n=>!n.hidden);
      if(found){location.hash=found.getAttribute("href");$("toolSearch").value="";
        for(const n of document.querySelectorAll("[data-open]"))n.hidden=false;}
    }
  });
  document.addEventListener("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
      event.preventDefault();$("toolSearch").focus();
    }
    if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){
      event.preventDefault();
      const first=document.querySelector('[data-panel="'+state.tool+'"] [data-command]');
      if(first)run(first.dataset.command,first);
    }
  });
  bytesInfo("jsonInput","jsonBytes");bytesInfo("csvInput","csvBytes");
  try{renderColor()}catch{}
  $("copyOutput").disabled=true;$("downloadOutput").disabled=true;
}
init();
