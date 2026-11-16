node <<'JS'
const fs=require('fs'); const assert=require('assert/strict'); const ts=require('/Users/ozi/Recht-Papier/apps/mobile/node_modules/typescript');
const root='/Users/ozi/Recht-Papier/';
function load(file,mocks={}){const out={}; const code=ts.transpileModule(fs.readFileSync(root+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText; new Function('require','exports',code)((id)=>{if(id in mocks)return mocks[id];throw Error('Unexpected module '+id);},out);return out;}
const builder=(result)=>{const b={};for(const k of ['select','eq','order','limit','maybeSingle','single','insert','update','delete'])b[k]=()=>b;b.then=(ok,bad)=>Promise.resolve(result).then(ok,bad);return b;};
(async()=>{
 const api=load('apps/mobile/src/features/faelle/api.ts',{'@/lib/supabase':{supabase:{from:table=>builder(table==='cases'?{data:{id:'case',input_revision:1},error:null}:{data:null,error:{message:'simulated network failure'}})}},'expo-file-system':{File:class{}}});
 const overview=await api.loadCaseOverview('case');assert.equal(overview.dokumente.length,0);assert.equal(overview.analyse,null);console.log('REPRO A: 6 failed child reads => loadCaseOverview resolves empty sections, no error');
 let deleted=false, cleanupFailed=false;
 const sb={from(table){if(table==='case_documents')return builder({data:null,error:Error('metadata insert rejected')}); const b=builder({data:{id:'new-case'},error:null});b.delete=()=>{deleted=true;return b};return b;},storage:{from(){return{upload:async()=>({error:null}),remove:async()=>{cleanupFailed=true;return{error:Error('storage removal rejected')}}}}}};
 const create=load('apps/mobile/src/features/faelle/api.ts',{'@/lib/supabase':{supabase:sb},'expo-file-system':{File:class{async arrayBuffer(){return new ArrayBuffer(1)}}}});
 await assert.rejects(()=>create.createCase('owner','fictional case',{uri:'file:///fixture',name:'fixture.pdf',mimeType:'application/pdf',size:1}));assert(cleanupFailed&&deleted);console.log('REPRO B: uploaded object cleanup fails => case row deletion still attempted');
 let printed=false,shared=false;
 const exp=load('apps/mobile/src/features/faelle/export.ts',{'expo-print':{printToFileAsync:async()=>{printed=true;return{uri:'file:///synthetic.pdf'}}},'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async()=>{shared=true}},'@/lib/format':{kurzdatum:()=> '16.11.2026'}});
 await exp.alsPdfTeilen({id:'old-document',kind:'bericht',title:'Historical',body:'synthetic old revision',input_revision:1,template_version:'1',created_at:'2026-11-10',approved_at:'2026-11-10'});assert(printed&&shared);console.log('REPRO C: approved document from old revision reaches print/share without current-case revision check (mocked print/share, no actual file/transmission)');
 const term=load('packages/shared/termination.ts');const fixture=JSON.parse(fs.readFileSync(root+'evals/development/dev-01.json'));const corpus=JSON.parse(fs.readFileSync(root+'packages/shared/corpus/termination-2026-11-10/corpus.json'));
 const baseline=term.analyzeTermination(fixture.input,fixture.documents,corpus);const receipt=fixture.input.facts.find(f=>f.key==='receipt_on');const originalValue=receipt.value;receipt.value='2026-09-01';const modified=term.analyzeTermination(fixture.input,fixture.documents,corpus);
 assert.notDeepEqual(modified.calculations.map(c=>c.due_on),baseline.calculations.map(c=>c.due_on));console.log('REPRO D: changed confirmed receipt '+originalValue+' -> '+receipt.value+' with unchanged original quote accepted; dates '+baseline.calculations.map(c=>c.due_on).join(',')+' -> '+modified.calculations.map(c=>c.due_on).join(','));console.log('Evidence quote unchanged: '+receipt.evidence.quote);
})().catch(e=>{console.error(e);process.exitCode=1});
JS
