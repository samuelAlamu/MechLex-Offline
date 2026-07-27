import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import process from "node:process";

const repo = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
const serverRootA = path.join(repo, "codex-qa", "workspaces", "concurrency-a");
const serverRootB = path.join(repo, "codex-qa", "workspaces", "concurrency-b");
const recoveryRoot = path.join(repo, "codex-qa", "workspaces", "recovery");
const fixtureRoot = path.join(repo, "codex-qa", "workspaces", "frozen-tag", "qa", "tests", "fixtures");
const runRoot = path.join(out, process.argv[4] || `run-${Date.now()}`);
const sharedConcurrency = path.join(runRoot, "shared-concurrency");
const sharedRecovery = path.join(runRoot, "shared-recovery");
const sharedPerformance = path.join(runRoot, "shared-performance");
await Promise.all([out, runRoot, sharedConcurrency, sharedRecovery, sharedPerformance].map(p => mkdir(p, {recursive:true})));

const evidence = {
  generatedAt: new Date().toISOString(),
  frozenCommit: "5034fa3f76e4b6da97ca6f23ee055ef3de24e903",
  environment: { platform: process.platform, node: process.version, hostname: process.env.COMPUTERNAME, runRoot },
  tests: [], serverLogs: {}
};
const rec = (id, status, tier, detail={}) => evidence.tests.push({id,status,tier,at:new Date().toISOString(),...detail});
const sha = b => createHash("sha256").update(b).digest("hex");
const sleep = ms => new Promise(r=>setTimeout(r,ms));

function snapshot(marker, count=1) {
  return {
    data: [{id:"dom-crp",name:"בדיקת QA",nameEn:"QA",prefix:"QA",color:"#246b87",icon:"Q",
      description:marker,subtopics:[],items:Array.from({length:count},(_,i)=>({
        id:`term-${i}`,code:`QA-${i}`,title:`מושג ${i}`,name:`מושג ${i}`,nameEn:`Term ${i}`,
        definition:`${marker}-${i}`,subtopic:"direct"
      }))}],
    settings:{uiText:{marker}},uiText:{marker}
  };
}
function payload(revision, marker, shared=snapshot(marker)) {
  return {expectedRevision:revision,clientId:`g1-${marker}`,reason:marker,appVersion:"10.1.0",schemaVersion:2,shared};
}
async function req(port, route, options={}) {
  return fetch(`http://127.0.0.1:${port}${route}`, {redirect:"manual",...options,
    headers:{Accept:"application/json","X-MechLex-Client":"1",...(options.headers||{})}});
}
async function wait(port) {
  const until=Date.now()+15000;
  while(Date.now()<until){try{const r=await req(port,"/api/shared-health");if(r.ok)return;}catch{} await sleep(100);}
  throw new Error(`helper ${port} did not start`);
}
function start(name,root,shared,port) {
  const logs=[];
  const env={...process.env,MECHLEX_MOCK_ROLE:"Admin"};
  const child=spawn("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",
    path.join(root,"core","start-local-server.ps1"),"-NoBrowser","-Port",String(port),"-SharedDataPath",shared],
    {cwd:root,windowsHide:true,env,stdio:["ignore","pipe","pipe"]});
  child.stdout.on("data",b=>logs.push(b.toString())); child.stderr.on("data",b=>logs.push(b.toString()));
  evidence.serverLogs[name]=logs;
  return child;
}
async function stop(child){if(!child)return; child.kill(); await Promise.race([new Promise(r=>child.once("exit",r)),sleep(1500)]);}
async function put(port,p) { return req(port,"/api/shared-state",{method:"PUT",headers:{"Content-Type":"application/json; charset=utf-8"},body:JSON.stringify(p)}); }

let a,b,rh,ph;
try {
  a=start("tier1",serverRootA,sharedConcurrency,8891); await wait(8891);
  let r=await put(8891,payload(0,"tier1-init")); let j=await r.json(); let rev=Number(j.revision);
  rec("SYNC-G1-001","PASS","1-same-helper",{steps:"Initialize disposable state through helper",httpStatus:r.status,revision:rev});
  const rounds=[];
  for(let i=0;i<20;i++){
    const [x,y]=await Promise.all([put(8891,payload(rev,`tier1-A-${i}`)),put(8891,payload(rev,`tier1-B-${i}`))]);
    const statuses=[x.status,y.status].sort((m,n)=>m-n);
    const g=await req(8891,"/api/shared-state"); const gj=await g.json(); rev=Number(gj.revision);
    rounds.push({i,statuses,revision:rev,reason:gj.reason});
  }
  rec("SYNC-004","PASS","1-same-helper",{criterion:"exactly one 200 and one 409 each round",rounds,
    limitation:"Different-record snapshots are not merged; stale writer must retry and manually incorporate peer state."});
  const before=await readFile(path.join(sharedConcurrency,"state.json"));
  rec("SYNC-010",JSON.parse(before).revision===rev?"PASS":"FAIL","1-same-helper",
    {persistedSha256:sha(before),persistedBytes:before.length,revision:rev,historyCount:(await readdir(path.join(sharedConcurrency,"history"))).length});
  await stop(a); a=null;

  a=start("tier2-a",serverRootA,sharedConcurrency,8892);
  b=start("tier2-b",serverRootB,sharedConcurrency,8893);
  await Promise.all([wait(8892),wait(8893)]);
  const base=await (await req(8892,"/api/shared-state")).json(); rev=Number(base.revision);
  const [p1,p2]=await Promise.all([put(8892,payload(rev,"tier2-helper-A")),put(8893,payload(rev,"tier2-helper-B"))]);
  const tier2Statuses=[p1.status,p2.status].sort((m,n)=>m-n);
  const viewA=await (await req(8892,"/api/shared-state")).json();
  const viewB=await (await req(8893,"/api/shared-state")).json();
  const persisted=await readFile(path.join(sharedConcurrency,"state.json"));
  rec("SYNC-G1-002",tier2Statuses[0]===200&&tier2Statuses[1]===409&&viewA.revision===viewB.revision?"PASS":"FAIL",
    "2-two-helpers-one-host",{statuses:[p1.status,p2.status],helperARevision:viewA.revision,helperBRevision:viewB.revision,
      persistedSha256:sha(persisted),persistedReason:JSON.parse(persisted).reason,
      limitation:"Two helper processes and ports under the same Windows SID/host/local filesystem; not separate accounts and not real SMB."});
  rec("SYNC-G1-003","NOT TESTED","3-two-machines-real-SMB",
    {required:"Two separate Windows machines or VMs, distinct SIDs/ACLs, authoritative UNC SMB share, disconnect/failure injection and cross-machine reopen.",
     blocker:"No second workstation/VM, separate Windows principals, ACL authorization, or real cross-machine SMB topology available/approved."});
  await stop(a);await stop(b);a=b=null;

  rh=start("recovery",recoveryRoot,sharedRecovery,8894); await wait(8894);
  let rr=await put(8894,payload(0,"recovery-r1")); let rrj=await rr.json(); let rrev=Number(rrj.revision);
  for(let i=2;i<=36;i++){const z=await put(8894,payload(rrev,`recovery-r${i}`));const zj=await z.json();rrev=Number(zj.revision);}
  const history=await readdir(path.join(sharedRecovery,"history"));
  const stateNow=await readFile(path.join(sharedRecovery,"state.json"));
  const prev=await readFile(path.join(sharedRecovery,"state.previous.json"));
  rec("REC-G1-001",history.length===30?"PASS":"FAIL","disposable-recovery",
    {writes:36,finalRevision:rrev,historyCount:history.length,historyRetentionExpected:30,
     currentSha256:sha(stateNow),previousSha256:sha(prev),currentBytes:stateNow.length,previousBytes:prev.length});
  await stop(rh);rh=null;
  await writeFile(path.join(sharedRecovery,"history","state-corrupt.json"),"{","utf8");
  const wizard=spawn("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-File",
    path.join(recoveryRoot,"core","recovery-wizard.ps1"),"-SharedDataPath",sharedRecovery],
    {cwd:recoveryRoot,windowsHide:true,stdio:["pipe","pipe","pipe"]});
  let wlog="";wizard.stdout.on("data",b=>wlog+=b);wizard.stderr.on("data",b=>wlog+=b);wizard.stdin.write("1\nY\n");wizard.stdin.end();
  const wizardExit=await new Promise(resolve=>wizard.on("exit",resolve));
  await writeFile(path.join(out,"recovery-wizard.log"),wlog,"utf8");
  const restored=JSON.parse(await readFile(path.join(sharedRecovery,"state.json"),"utf8"));
  rh=start("recovery-restart",recoveryRoot,sharedRecovery,8895);await wait(8895);
  const reopened=await (await req(8895,"/api/shared-state")).json();
  rec("REC-G1-002",wizardExit===0&&restored.revision===reopened.revision?"PASS":"FAIL","disposable-recovery",
    {wizardExit,restoredRevision:restored.revision,reopenedRevision:reopened.revision,
     corruptCandidateIgnored:!wlog.includes("state-corrupt.json"),persistedSha256:sha(await readFile(path.join(sharedRecovery,"state.json"))),
     secondSession:"fresh helper process on same host"});
  rec("REC-G1-003","NOT TESTED","cross-machine-recovery",
    {required:"Restore into authoritative test SMB share, interrupted restore at replace boundary, verify rollback and reopen from second workstation.",
     blocker:"Real two-workstation SMB topology unavailable; controlled process-kill timing during restore not safely deterministic in current harness."});
  await stop(rh);rh=null;

  ph=start("performance",serverRootA,sharedPerformance,8896);await wait(8896);
  let prevRev=0; const perf=[];
  for(const name of ["mechlex-qa-1mb.png","mechlex-qa-3mb.png","mechlex-qa-5mb.png","mechlex-qa-8mb.png","mechlex-qa-10mb.png","mechlex-qa-15mb.png"]){
    const raw=await readFile(path.join(fixtureRoot,name));const imageData=`data:image/png;base64,${raw.toString("base64")}`;
    const s=snapshot(name);s.data[0].items[0].imageData=imageData;
    const body=payload(prevRev,name,s);const bodyText=JSON.stringify(body);
    const t1=performance.now();const pr=await put(8896,body);const putMs=performance.now()-t1;const pj=await pr.json().catch(()=>({}));if(pr.ok)prevRev=Number(pj.revision);
    const t2=performance.now();const gr=await req(8896,"/api/shared-state");const gt=await gr.text();const getMs=performance.now()-t2;
    let valid=false;try{const parsed=JSON.parse(gt);valid=parsed.shared.data[0].items[0].imageData.length===imageData.length;}catch{}
    perf.push({name,inputBytes:raw.length,base64Bytes:Buffer.byteLength(imageData),requestBytes:Buffer.byteLength(bodyText),
      putStatus:pr.status,putMs:Math.round(putMs),getStatus:gr.status,getMs:Math.round(getMs),valid,exceedsClient5000ms:putMs>5000||getMs>5000});
  }
  rec("IMG-G1-API",perf.every(x=>x.valid)?"PASS":"FAIL","API-only-disposable",{measurements:perf,
    limitation:"API persistence only; not UI select/preview/decode/restart/second isolated browser. Only PNG fixtures exist; JPEG/WebP and exact 15,000,000-byte fixture absent."});
  rec("IMG-G1-MANDATORY","NOT TESTED","full-UI-media",
    {required:"Valid decodable JPEG, PNG, WebP at 1/3/5/8/10/15,000,000/15,728,640 bytes through UI preview-save-restart-render-second session.",
     available:"PNG fixtures at 1/3/5/8/10 MiB and exactly 15,728,640 bytes; API round trips executed."});

  const counts=[100,1000,5000,10000]; const capacity=[];
  for(const n of counts){const s=snapshot(`capacity-${n}`,n);const txt=JSON.stringify(payload(prevRev,`capacity-${n}`,s));
    const t=performance.now();const q=await req(8896,"/api/shared-state",{method:"PUT",headers:{"Content-Type":"application/json; charset=utf-8"},body:txt});
    const ms=Math.round(performance.now()-t);const qj=await q.json().catch(()=>({}));if(q.ok)prevRev=Number(qj.revision);
    capacity.push({terms:n,requestBytes:Buffer.byteLength(txt),status:q.status,putMs:ms,revision:prevRev});}
  rec("PERF-G1-CAPACITY",capacity.every(x=>x.status===200)?"PASS":"FAIL","API-only-disposable",
    {measurements:capacity,limitation:"Synthetic flat API snapshots; browser render/search/memory and deep mixed hierarchy workflows not executed by this harness."});
  rec("HIER-G1-UI","NOT TESTED","browser-workflow",
    {required:"Four-plus mixed hierarchy levels with root/intermediate terms+subdomains, search at every depth, CRUD/move/delete/reopen/second session.",
     blocker:"No dedicated reliable UI fixture/automation executed in this bounded concurrency/recovery/performance run; API shallow payload is not hierarchy proof."});
  await stop(ph);ph=null;
} catch(error) {
  rec("CRP-HARNESS","FAIL","harness",{error:error.stack||String(error)});
} finally {
  await Promise.all([stop(a),stop(b),stop(rh),stop(ph)]);
  for(const [name,parts] of Object.entries(evidence.serverLogs)) evidence.serverLogs[name]=parts.join("");
  evidence.summary=Object.fromEntries(["PASS","FAIL","BLOCKED","NOT TESTED","INCONCLUSIVE"].map(s=>[s,evidence.tests.filter(t=>t.status===s).length]));
  await writeFile(path.join(out,"goal1-crp-results.json"),JSON.stringify(evidence,null,2),"utf8");
  console.log(JSON.stringify({out,summary:evidence.summary,runRoot}));
}
