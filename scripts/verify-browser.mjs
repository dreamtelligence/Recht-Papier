import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const base=process.env.DEMO_URL || 'http://127.0.0.1:3291';
const live=base.startsWith('https:');
const out=root+'/docs/portfolio';
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {}),headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
if (!live) for (const id of ['dev-01','dev-11','dev-14']) {
 await page.goto(base+'/portfolio/'+id+'-report.html');
 await page.pdf({path:root+'/apps/mobile/public/portfolio/'+id+'-report.pdf',format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;font-size:8px;text-align:center;color:#666">Fiktives Portfolio-Beispiel · keine Rechtsberatung · Seite <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
 await fs.copyFile(root+'/apps/mobile/public/portfolio/'+id+'-report.pdf',root+'/apps/mobile/dist/portfolio/'+id+'-report.pdf');
}
const errors=[],backendRequests=[],responses=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('request',r=>{if(/supabase|modal\.run|googleapis|mistral/.test(r.url()))backendRequests.push(r.url())});
page.on('response',r=>{if(r.status()>=400)responses.push({status:r.status(),url:r.url()})});
for(const width of [1440,390]) {
 await page.setViewportSize({width,height:1000});
 await page.goto(base);
 await page.evaluate(()=>localStorage.clear());await page.reload();
 await page.getByRole('heading',{name:'Ein Schreiben. Die richtigen Fragen.'}).waitFor();
 assert.equal(await page.locator('html').getAttribute('lang'),'de');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:out+`/browser-${width}-home.png`,fullPage:true});
 for(const [i,title] of ['Ein Termin, der nicht zur Frist passt','Wann kam das Schreiben an?','Zwei Belege, zwei Zugangstage'].entries()){
  await page.getByRole('button',{name:new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();
  await page.getByRole('button',{name:'Angaben prüfen →',exact:true}).click();
  const result=page.getByRole('button',{name:'Gespeicherte Prüfung ansehen →'});
  assert(await result.isDisabled());
  await page.getByRole('button',{name:'Alle sichtbaren Angaben bestätigen'}).click();
  await result.click();
  if(i===0){await page.getByText('28.02.2027',{exact:true}).waitFor();await page.getByText('01.12.2026',{exact:true}).waitFor();}
  else await page.getByRole('heading',{name:'Hier bleibt die Berechnung offen.'}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:out+`/browser-${width}-case-${i+1}.png`,fullPage:true});
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('link',{name:'Bericht als PDF herunterladen ↓'}).click();
  const download=await downloadPromise;
  assert((await download.suggestedFilename()).endsWith('.pdf'));
  await page.reload();
  await page.getByRole('heading',{name:i===0?'Termine mit Rechenweg.':'Hier bleibt die Berechnung offen.'}).waitFor();
 }
 await page.evaluate(()=>localStorage.setItem('recht-papier-public-demo-v1',JSON.stringify({selected:'dev-01',step:3,confirmed:[0,0,-1,999]})));
 await page.reload();
 await page.getByRole('heading',{name:'Welche Angaben stehen im Dokument?'}).waitFor();
 assert(await page.getByRole('button',{name:'Gespeicherte Prüfung ansehen →'}).isDisabled());
 await page.goto(base+'/portfolio/architecture.html');
 await page.getByRole('heading',{name:'Architektur und überprüfbare Beiträge',exact:true}).waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.goto(base);
 await page.getByRole('link',{name:'Impressum',exact:true}).click();
 await page.getByRole('heading',{name:'Impressum · Portfolio-Entwurf'}).waitFor();
 await page.getByRole('link',{name:'Datenschutz',exact:true}).click();
 await page.getByRole('heading',{name:'Datenschutz · Portfolio-Entwurf'}).waitFor();
 await page.getByRole('button',{name:'Demo-Fortschritt löschen'}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('recht-papier-public-demo-v1')),null);
}
assert.deepEqual(errors,[]);assert.deepEqual(backendRequests,[]);assert.deepEqual(responses,[]);
await fs.writeFile(out+(live?'/browser-live-verification.json':'/browser-verification.json'),JSON.stringify({executed_at:new Date().toISOString(),url:base,corrupt_storage_checked:true,architecture_checked:true,browser:'Brave/Chromium',viewports:[1440,390],cases_per_viewport:3,pdf_downloads:6,persistence_checked:true,private_backend_requests:backendRequests,page_errors:errors,http_errors:responses},null,2)+'\n');
await browser.close();console.log('Six case flows, PDF downloads, storage and legal panels passed; no backend calls or page errors.');
