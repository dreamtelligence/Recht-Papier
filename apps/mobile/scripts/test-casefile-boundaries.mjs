/** Isolated adapters only: actual runtime modules, no network, native print/share or real files. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(path.join(root, 'apps/mobile/package.json'));
const ts = require('typescript');
function load(file, mocks, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','exports',...Object.keys(extra),code)(id=>{if(id in mocks)return mocks[id];throw Error('Unexpected dependency '+id)},exports,...Object.values(extra));
  return exports;
}
function query(result, observe = () => {}) {
  const b={};
  for(const k of ['select','eq','order','limit','maybeSingle','single','insert','update','delete']) b[k]=(...args)=>{observe(k,args);return b};
  b.then=(ok,bad)=>Promise.resolve(result).then(ok,bad);return b;
}
const apiWith = sb => load('apps/mobile/src/features/faelle/api.ts',{'@/lib/supabase':{supabase:sb},'expo-file-system':{File:class{async arrayBuffer(){return new ArrayBuffer(1)}}}});
const tests=[];
function test(name,fn){tests.push([name,fn]);}
test('all seven overview reads surface errors instead of empty sections', async()=>{
  for(const failing of ['cases','case_documents','case_facts','case_analyses','case_sources','case_deadlines','generated_documents']) {
    const sb={from:table=>query(table===failing?{data:null,error:Error('injected '+table)}:{data:table==='cases'?{id:'case'}:[],error:null})};
    await assert.rejects(()=>apiWith(sb).loadCaseOverview('case'),new RegExp('injected '+failing));
  }
});
test('historical approval and running analysis are visible as stale',async()=>{
  for(const [current,run,expected] of [[2,null,true],[1,'run',true],[1,null,false]]) {
    const sb={from:()=>query({data:{id:'doc',input_revision:1,cases:{input_revision:current,active_run:run}},error:null})};
    assert.equal((await apiWith(sb).loadSchreiben('doc')).veraltet,expected);
  }
});
test('failed upload compensation preserves the case until cleanup can succeed',async()=>{
  for(const cleanupFails of [true,false]) {
    let deleted=false;
    const sb={from:table=>query(table==='cases'?{data:{id:'case'},error:null}:{data:null,error:Error('metadata failed')}, method=>{if(method==='delete')deleted=true}),storage:{from:()=>({upload:async()=>({error:null}),remove:async()=>({error:cleanupFails?Error('cleanup'):null})})}};
    await assert.rejects(()=>apiWith(sb).createCase('owner','fictional',{name:'file.pdf',uri:'isolated',size:1,mimeType:'application/pdf'}));
    assert.equal(deleted,!cleanupFails);
  }
});
test('successful originals survive parsing failure and retries reject HTTP200 failure statuses',async()=>{
  let deleted=false;
  const sb={from:table=>query({data:{id:table==='cases'?'case':'doc'},error:null},m=>{if(m==='delete')deleted=true}),storage:{from:()=>({upload:async()=>({error:null})})},functions:{invoke:async()=>({data:{status:'kein_text'},error:null})}};
  assert.equal((await apiWith(sb).createCase('owner','fictional',{name:'scan.pdf',uri:'isolated',size:1,mimeType:'application/pdf'})).id,'case');
  assert.equal(deleted,false);
  await assert.rejects(()=>apiWith(sb).dokumentLesen('doc'),/nicht vollständig/);
  for(const status of ['gelesen','bereits_gelesen']) {
    sb.functions.invoke=async()=>({data:{status},error:null});
    await apiWith(sb).dokumentLesen('doc');
  }
});
test('native print/share is never invoked before fresh server authorization',async()=>{
  const displayed={id:'doc',approved_at:'date',body:'reviewed <script>',template_version:'1',created_at:'date',title:'Synthetic'};
  let printed=0,shared=0;
  let current=displayed, denied=true;
  const exp=load('apps/mobile/src/features/faelle/export.ts',{
    'expo-print':{printToFileAsync:async({html})=>{printed++;assert(!html.includes('<script>'));return{uri:'isolated.pdf'}}},
    'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async()=>{shared++}},
    '@/lib/format':{kurzdatum:()=> 'date'},'./api':{dokumentFuerExport:async()=>{if(denied)throw Error('server stale');return current}},
  });
  await assert.rejects(()=>exp.alsPdfTeilen(displayed),/server stale/);assert.equal(printed,0);assert.equal(shared,0);
  denied=false;current={...displayed,body:'different'};
  await assert.rejects(()=>exp.alsPdfTeilen(displayed),/Fassung/);assert.equal(printed,0);
  current=displayed;await exp.alsPdfTeilen(displayed);assert.equal(printed,1);assert.equal(shared,1);
  await assert.rejects(()=>exp.alsPdfTeilen({...displayed,veraltet:true}));assert.equal(printed,1);
});
function storageAdapter(files, removeFails=false, finalNewFile=false) {
  let removed=false;
  return {
    list:async(prefix,{limit=1000,offset=0}={})=>{
      if(finalNewFile&&removed&&limit===1) return {data:[{id:'new',name:'late.pdf'}],error:null};
      const entries=new Map();
      for(const file of files) if(file.startsWith(prefix+'/')) {
        const rest=file.slice(prefix.length+1), name=rest.split('/')[0];entries.set(name,{name,id:rest.includes('/')?null:'file'});
      }
      return {data:[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name)).slice(offset,offset+limit),error:null};
    },
    remove:async paths=>{if(removeFails)return{error:Error('remove')};for(const p of paths)files.delete(p);removed=true;return{error:null}},
  };
}
test('case deletion removes original without metadata and keeps case on storage failure',async()=>{
  for(const fails of [true,false]) {
    let deleted=false;
    const files=new Set(['owner/case/orphan.pdf']);
    const sb={from:table=>query({data:table==='cases'?{owner_id:'owner'}:[],error:null},m=>{if(m==='delete')deleted=true}),storage:{from:()=>storageAdapter(files,fails)}};
    // Keep one stateful adapter per bucket, just like supabase-js.
    const adapter=storageAdapter(files,fails);sb.storage.from=()=>adapter;
    if(fails)await assert.rejects(()=>apiWith(sb).deleteCase('case'));else await apiWith(sb).deleteCase('case');
    assert.equal(deleted,!fails);assert.equal(files.size,fails?1:0);
  }
});
test('account deletion paginates folders and files before mutations; errors stop auth deletion',async()=>{
  for(const mode of ['normal','remove-failure','late-upload']) {
    const files=new Set(Array.from({length:1001},(_,i)=>`owner/case${i}/file.pdf`));
    for(let i=0;i<2005;i++)files.add(`owner/many/file${i}.pdf`);
    const adapter=storageAdapter(files,mode==='remove-failure',mode==='late-upload');
    let authDeleted=false,handler;
    const userClient={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})}};
    const adminClient={rpc:async(name,args)=>{assert.equal(name,'begin_account_deletion');assert.deepEqual(args,{p_owner:'owner'});return{data:true,error:null}},storage:{from:()=>adapter},auth:{admin:{deleteUser:async id=>{
      assert.equal(id,'owner');assert.equal(files.size,0);authDeleted=true;return{error:null};
    }}}};
    load('supabase/functions/delete-account/index.ts',{
      'jsr:@supabase/supabase-js@2':{createClient:(_url,key)=>key==='anon'?userClient:adminClient},
    },{Deno:{env:{get:key=>({SUPABASE_URL:'isolated',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'})[key]},serve:fn=>{handler=fn}}});
    const response=await handler(new Request('https://isolated.invalid',{method:'POST',body:JSON.stringify({user_id:'foreign'})}));
    assert.equal(response.status,mode==='normal'?200:mode==='late-upload'?409:500);
    assert.equal(authDeleted,mode==='normal');
    if(mode==='normal')assert.equal((await response.json()).files_removed,3006);
  }
});
test('account deletion fences writes before cleanup and allows retry after storage failure',async()=>{
  for(const mode of ['rpc-error','rpc-false','retry']) {
    let handler,authDeleted=false,attempt=0;const calls=[];
    const userClient={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})}};
    const adminClient={
      rpc:async(name,args)=>{calls.push('fence');assert.equal(name,'begin_account_deletion');assert.deepEqual(args,{p_owner:'owner'});return{data:mode!=='rpc-false',error:mode==='rpc-error'?Error('fence'):null}},
      storage:{from:()=>({list:async()=>{calls.push('list');return{data:[],error:mode==='retry'&&attempt===0?Error('temporary'):null}},remove:async()=>{throw Error('unexpected remove')}})},
      auth:{admin:{deleteUser:async()=>{calls.push('auth-delete');authDeleted=true;return{error:null}}}},
    };
    load('supabase/functions/delete-account/index.ts',{'jsr:@supabase/supabase-js@2':{createClient:(_url,key)=>key==='anon'?userClient:adminClient}},
      {Deno:{env:{get:key=>({SUPABASE_URL:'isolated',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'})[key]},serve:fn=>{handler=fn}}});
    const request=()=>new Request('https://isolated.invalid',{method:'POST',body:JSON.stringify({owner_id:'foreign'})});
    const first=await handler(request());
    assert.equal(first.status,500);assert.equal(authDeleted,false);assert.equal(calls[0],'fence');
    if(mode!=='retry')assert.deepEqual(calls,['fence']);
    else {
      attempt++;calls.length=0;const second=await handler(request());
      assert.equal(second.status,200);assert.equal(authDeleted,true);assert.equal(calls[0],'fence');
      assert(calls.indexOf('auth-delete')>calls.indexOf('list'));
    }
  }
});
test('consumer legal client suppresses failed, unknown, incomplete and old Edge payloads',async()=>{
  const valid={answer:'released answer',released:true,release_status:'released',audit:{status:'pass',high_severity_count:0},citations:[{id:'1'}]};
  for(const data of [valid,{...valid,released:false},{...valid,release_status:'blocked'},{...valid,audit:{status:'unknown',high_severity_count:0}},{...valid,audit:{status:'fail',high_severity_count:0}},{...valid,released:undefined},{...valid,citations:[]},null]) {
    const client=load('apps/mobile/src/features/legal/client.ts',{'@/lib/supabase':{supabase:{functions:{invoke:async()=>({data,error:null})}}}});
    const result=await client.rechtNachschlagen('Synthetic question');
    assert.equal(result.released,data===valid);assert.equal(result.answer,data===valid?'released answer':'');
  }
});
test('Edge sends private questions in POST JSON and follows only same-request Modal result URLs',async()=>{
  const gate=load('supabase/functions/_shared/legal-answer.ts',{});
  const payload={answer:'Synthetic [1]',released:true,release_status:'released',citations:[{id:'[1]',text_preview:'Synthetic source'}],
    answer_audit:{status:'pass',high_severity_count:0,material_claims:1,score:100,cited_claims:1,missing_required_in_answer:[],retrieval_missing_required:[],issues:[],issue_count:0,medium_severity_count:0},
    source_audit:{accepted_count:1,missing_required:[]},retrieval_plan:{required_norms:[]}};
  for(const mode of ['direct','modal-result','foreign-origin','wrong-path','query-leak','unauthenticated']) {
    let handler;const calls=[];
    const redirected=mode!=='direct'&&mode!=='unauthenticated';
    const locations={
      'modal-result':'https://engine.invalid/api/legal/analyze?__modal_attempt_token=synthetic',
      'foreign-origin':'https://foreign.invalid/api/legal/analyze?__modal_attempt_token=synthetic',
      'wrong-path':'https://engine.invalid/other?__modal_attempt_token=synthetic',
      'query-leak':'https://engine.invalid/api/legal/analyze?__modal_attempt_token=synthetic&q=private',
    };
    load('supabase/functions/recht-nachschlagen/index.ts',{
      'jsr:@supabase/supabase-js@2':{createClient:()=>({auth:{getUser:async()=>({data:{user:mode==='unauthenticated'?null:{id:'owner'}},error:null})}})},
      '../_shared/legal-answer.ts':gate,
    },{Deno:{env:{get:key=>({SUPABASE_URL:'isolated',SUPABASE_ANON_KEY:'anon',LEGAL_ENGINE_URL:'https://engine.invalid',LEGAL_ENGINE_API_KEY:'isolated-secret'})[key]},serve:fn=>{handler=fn}},
      fetch:async(url,options)=>{
        calls.push({url:String(url),options});
        assert.equal(options.redirect,'manual');assert(!String(url).includes('Sensitive'));
        if(calls.length===1) {
          assert.equal(options.method,'POST');assert.equal(new URL(url).search,'');
          assert.deepEqual(JSON.parse(options.body),{sachverhalt:'Sensitive synthetic question',frage:'Sensitive synthetic question',top_k:5});
          if(redirected)return new Response(null,{status:303,headers:{Location:locations[mode]}});
        } else {assert.equal(options.method,'GET');assert.equal(options.body,undefined);}
        return new Response(JSON.stringify(payload),{status:200});
      },
    });
    const response=await handler(new Request('https://isolated.invalid',{method:'POST',body:JSON.stringify({frage:'Sensitive synthetic question'})}));
    const allowed=mode==='direct'||mode==='modal-result';
    assert.equal(response.status,allowed?200:mode==='unauthenticated'?401:504);
    assert.equal(calls.length,mode==='unauthenticated'?0:mode==='modal-result'?2:1);
    if(allowed)assert.equal((await response.json()).released,true);
  }
});
test('intake refresh synchronizes untouched facts, preserves edits and recovers from failed reread reload',async()=>{
  const states=[],effects=[];let cursor=0,pending=[],changed=false;
  const react={
    useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;
      return[states[i],value=>{const next=typeof value==='function'?value(states[i]):value;if(!Object.is(states[i],next)){states[i]=next;changed=true}}]},
    useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((v,n)=>!Object.is(v,effects[i][n]))){effects[i]=deps;pending.push(fn)}},
  };
  const fact={key:'receipt_on',value:'2026-08-31',confirmed:false,evidence:{document_id:'doc',page:1,quote:'Zugang am: 2026-08-31'}};
  const jsx=(type,props)=>({type,props});
  const Component=load('apps/mobile/src/features/faelle/TerminationInput.tsx',{
    react,'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Pressable:'Pressable',Text:'Text',View:'View'},
    '@portfolio/termination':{displayValue:v=>v,extractTerminationFacts:docs=>docs.some(d=>d.extracted_text)?[fact]:[],FACT_LABELS:{receipt_on:'Zugang'},FACT_OPTIONS:{}},
    '@/ui':Object.fromEntries(['Body','Field','Message','Muted','PrimaryAction','SecondaryAction'].map(v=>[v,v])),
    '@/theme':{colors:{line:'line',accentDark:'accent'}},'./api':{dokumentLesen:async()=>{throw Error('unreadable')},saveTerminationInput:async()=>{}},
  }).TerminationInput;
  const props={caseId:'case',input:null,documents:[],onSaved:async()=>{throw Error('reload failed')}};
  function render(){for(let n=0;n<10;n++){cursor=0;pending=[];changed=false;const tree=Component(props);for(const fn of pending)fn();if(!changed)return tree}throw Error('Render loop')}
  function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of [tree.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found}return null}
  let tree=render();assert.equal(find(tree,n=>n.props?.accessibilityRole==='checkbox'),null);
  props.documents=[{id:'doc',file_name:'synthetic.pdf',extracted_text:'Zugang am: 2026-08-31',extracted_pages:['Zugang am: 2026-08-31']}];
  tree=render();const checkbox=find(tree,n=>n.props?.accessibilityRole==='checkbox');assert(checkbox);assert.equal(checkbox.props.accessibilityState.checked,false);
  checkbox.props.onPress();tree=render();assert.equal(find(tree,n=>n.props?.accessibilityRole==='checkbox').props.accessibilityState.checked,true);
  props.input={version:'1.0',as_of:'2026-11-16',facts:[{...fact,confirmed:false}]};props.documents=[...props.documents];
  tree=render();assert.equal(find(tree,n=>n.props?.accessibilityRole==='checkbox').props.accessibilityState.checked,true);
  props.documents=[{...props.documents[0],processing_error:'failed'}];tree=render();
  await find(tree,n=>n.props?.label==='PDF-Texte lesen / erneut versuchen').props.onPress();
  // onPress intentionally returns void; await the async event's two microtasks.
  await new Promise(resolve=>setImmediate(resolve));tree=render();
  assert.equal(find(tree,n=>n.props?.label==='PDF-Texte lesen / erneut versuchen').props.disabled,false);
  assert(find(tree,n=>n.type==='Message'&&String(n.props.children).includes('neu geladen')));
});
let failed=0;
for(const [name,fn] of tests) {try{await fn();console.log('PASS '+name)}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack)}}
assert.equal(failed,0,`${failed} case-file boundary regression(s)`);
console.log(`${tests.length} isolated case-file boundary groups passed; no hosted network, print or share.`);
