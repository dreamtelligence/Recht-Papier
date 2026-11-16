import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const baseline='2aa167d20f8f4bfa9f977850b30823b73265d109';
const files=new Set(['apps/mobile/src/features/faelle/api.ts','apps/mobile/src/features/faelle/export.ts','apps/mobile/src/features/legal/client.ts','supabase/functions/delete-account/index.ts','supabase/functions/recht-nachschlagen/index.ts']);
const read=fs.readFileSync;
fs.readFileSync=function(file,...args){
 const relative=typeof file==='string'?path.relative(root,file):'';
 if(files.has(relative))return execFileSync('git',['show',`${baseline}:${relative}`],{cwd:root,encoding:'utf8'});
 return read.call(this,file,...args);
};
await import(pathToFileURL(path.join(root,'apps/mobile/scripts/test-casefile-boundaries.mjs')).href);
