import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

const files=["index.html","styles.css","src/app.js","src/engines.js","assets/favicon.svg"];
await rm("dist",{recursive:true,force:true});
for(const file of files){
  const target=join("dist",file);
  await mkdir(dirname(target),{recursive:true});
  await copyFile(file,target);
}
console.log("Meridian build:",files.length,"static assets, 0 runtime dependencies");
