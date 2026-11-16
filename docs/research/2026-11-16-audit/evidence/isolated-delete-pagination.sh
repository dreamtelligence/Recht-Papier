node <<'JS'
const fs=require('fs'), assert=require('assert/strict'), ts=require('/Users/ozi/Recht-Papier/apps/mobile/node_modules/typescript');
let handler, removed=0, deleted=false, listCalls=0;const files=Array.from({length:1001},(_,i)=>({id:String(i),name:'file-'+i+'.pdf'}));
const admin={storage:{from:()=>({list:async(_prefix,{limit})=>{listCalls++;return{data:files.slice(0,limit),error:null}},remove:async(paths)=>{removed+=paths.length;return{error:null}}})},auth:{admin:{deleteUser:async()=>{deleted=true;return{error:null}}}}};
let clientCalls=0;const createClient=()=>++clientCalls===1?{auth:{getUser:async()=>({data:{user:{id:'synthetic-owner'}},error:null})}}:admin;
const code=ts.transpileModule(fs.readFileSync('supabase/functions/delete-account/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','exports','Deno',code)(()=>({createClient}),{}, {env:{get:()=> 'synthetic'},serve:h=>handler=h});
(async()=>{const res=await handler(new Request('https://test.invalid',{method:'POST'}));const body=await res.json();assert.equal(res.status,200);assert(body.deleted&&deleted);assert.equal(removed,1000);assert.equal(listCalls,1);console.log(JSON.stringify({status:res.status,reported:body,synthetic_files:files.length,unvisited_files:files.length-removed,list_calls:listCalls,user_deleted:deleted}));})();
JS
