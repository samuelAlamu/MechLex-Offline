const fs=require("fs"),path=require("path"),cp=require("child_process");
const {chromium}=require("../../../../qa/automation/node_modules/playwright");
const root=path.resolve(__dirname,"../../../..");
const workspace=path.join(root,"codex-qa","workspaces","normal");
const share=path.join(workspace,"shared-data"), port=8913, marker=`G1_FAIL_${Date.now()}`;
cp.execFileSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",path.join(root,"codex-qa/scripts/real-shared-path-guard.ps1"),"-ProjectRoot",root,"-TestPath",share,"-OutputPath",path.join(__dirname,"guard-browser.json")]);
const manifest=()=>Object.fromEntries(fs.readdirSync(share,{recursive:true}).filter(x=>fs.statSync(path.join(share,x)).isFile()).map(x=>[x,require("crypto").createHash("sha256").update(fs.readFileSync(path.join(share,x))).digest("hex")]));
const beforeFiles=manifest();
const helper=cp.spawn("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",path.join(workspace,"core/start-local-server.ps1"),"-Port",String(port),"-NoBrowser","-SharedDataPath",share],{env:{...process.env,MECHLEX_MOCK_ROLE:"Viewer"},stdio:["ignore",fs.openSync(path.join(__dirname,"browser-helper.stdout.log"),"w"),fs.openSync(path.join(__dirname,"browser-helper.stderr.log"),"w")]});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await wait(1200);
 const context=await chromium.launchPersistentContext(path.join(__dirname,"profile-localhost"),{channel:"msedge",headless:true});
 const page=context.pages()[0]||await context.newPage();
 await page.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:"load"});await wait(2200);
 const initial=await page.evaluate(async()=>{const c=await fetch("/api/can-write").then(r=>r.json());return{source:meta.dataSource,domains:data.length,serverRole:c.role,serverCanWrite:c.canWrite,first:data[0].name}});
 const authority=await page.evaluate(async()=>{
   state.adminRole="super"; const s=window.MechLexCore?.sharedSync;if(window.MechLexCore)window.MechLexCore.sharedSync=null;
   await openAdmin("super",settings.superPin);if(window.MechLexCore)window.MechLexCore.sharedSync=s;
   const opened=document.querySelector("#adminOverlay")?.getAttribute("aria-hidden")==="false";
   const rec=await fetch("/api/shared-state").then(r=>r.json());
   const put=await fetch("/api/shared-state",{method:"PUT",headers:{"Content-Type":"application/json","X-MechLex-Client":"1"},body:JSON.stringify({schemaVersion:rec.schemaVersion,expectedRevision:rec.revision,shared:rec.shared})});
   return{clientSuperAdminOpened:opened,directPutStatus:put.status};
 });
 helper.kill();await wait(3000);
 const failure=await page.evaluate(async value=>{
   let healthUnavailable=false;try{await fetch("/api/shared-health")}catch{healthUnavailable=true}
   const before=data[0].name;data[0].name=value;const returned=saveAll("Goal1 helper failure",{backupRelevant:true});await new Promise(r=>setTimeout(r,1200));
   const ls=JSON.parse(localStorage.getItem("mechlex_v6_data"))[0].name;
   const idb=await new Promise(resolve=>{const o=indexedDB.open("mechlex_offline_v95",1);o.onerror=()=>resolve(null);o.onsuccess=()=>{const q=o.result.transaction("state","readonly").objectStore("state").get("main");q.onerror=()=>resolve(null);q.onsuccess=()=>resolve(q.result?.data?.[0]?.name||null)}});
   return{healthUnavailable,before,inMemory:data[0].name,localStorage:ls,indexedDb:idb,saveReturnedTrue:returned===true,rolledBack:data[0].name===before&&ls===before};
 },marker);
 await context.close();
 const result={timestampUtc:new Date().toISOString(),environment:"same host, Viewer mock, disposable shared copy/profile",initial,authority,failure,persistedFileResult:{sharedManifestUnchanged:JSON.stringify(beforeFiles)===JSON.stringify(manifest())},restartAndOtherSession:{notRunReason:"helper intentionally stopped; marker absent from durable browser stores and shared files, so no durable cross-session observation is possible"},realSharedDataUsed:false};
 fs.writeFileSync(path.join(__dirname,"G1-SEC-02-05-07-authority-failure.json"),JSON.stringify(result,null,2));
})().catch(e=>{try{helper.kill()}catch{};process.stderr.write(String(e.stack||e));process.exit(1)});
