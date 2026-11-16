const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('../apps/mobile/node_modules/typescript');

async function probe({ found = true, writeError = false, type = 'text/plain' } = {}) {
  let handler, adminWrites = 0, userWrites = 0;
  const row = { id: 'doc', case_id: 'case', mime_type: type, storage_path: 'owner/case/file', byte_size: 1 };
  const query = (admin) => {
    const b = {};
    for (const key of ['select', 'eq', 'maybeSingle', 'single']) b[key] = () => b;
    b.update = () => { if (admin) adminWrites++; else userWrites++; return b; };
    b.then = (ok, bad) => Promise.resolve(admin
      ? { data: writeError ? null : { id: 'doc' }, error: writeError ? Error('write rejected') : null }
      : { data: found ? row : null, error: null }).then(ok, bad);
    return b;
  };
  const createClient = (_, key) => ({
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
    from: () => query(key === 'server-only'),
    storage: { from: () => ({ download: async () => ({ data: new Blob(['pdf']), error: null }) }) },
  });
  const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/dokument-lesen/index.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const modules = {
    'jsr:@supabase/supabase-js@2': { createClient },
    'npm:unpdf@0.12.1': { getDocumentProxy: async () => ({ numPages: 1 }), extractText: async () => ({ text: ['Originaltext'] }) },
  };
  new Function('require', 'Deno', 'exports', code)((id) => {
    assert(id in modules, `Unexpected module ${id}`); return modules[id];
  }, { serve: (fn) => handler = fn, env: { get: (key) => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'server-only' : 'test' } }, {});
  const response = await handler(new Request('https://test.invalid', {
    method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ document_id: 'doc' }),
  }));
  return { status: response.status, body: await response.json(), adminWrites, userWrites };
}

(async () => {
  const failure = await probe({ writeError: true });
  assert.equal(failure.status, 500, 'failed error-state write must not look processed');
  const success = await probe({ type: 'application/pdf' });
  assert.equal(success.status, 200);
  assert.equal(success.body.status, 'gelesen');
  assert.equal(success.adminWrites, 1, 'server writes its extraction');
  assert.equal(success.userWrites, 0, 'caller cannot write server evidence');
  const foreign = await probe({ found: false });
  assert.equal(foreign.status, 404);
  assert.equal(foreign.adminWrites, 0, 'RLS lookup must precede privileged writes');
  console.log('Document extraction: storage-state errors, privileged persistence and foreign-document boundary pass.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
