"""Real synthetic Supabase → background Python worker → report integration.

Creates a temporary confirmed user without email, and cleans cases/files/user by default.
--keep-user saves only the test user's login in a mode-600 local file for Simulator capture.
Never reads or exports other users' cases. No paid model calls in controlled mode.
"""
from __future__ import annotations
import argparse
import json
import secrets
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
REF='xmbyrsfaygwdzalkwbts'
URL=f'https://{REF}.supabase.co'


def request(method,path,key,token=None,body=None,content_type='application/json',timeout=90):
    raw=body if isinstance(body,bytes) else json.dumps(body).encode() if body is not None else None
    req=urllib.request.Request(URL+path,data=raw,method=method,headers={
        'apikey':key,'Authorization':'Bearer '+(token or key),'Content-Type':content_type,'Prefer':'return=representation'})
    try:
        with urllib.request.urlopen(req,timeout=timeout) as res:
            data=res.read()
            return res.status,json.loads(data) if data else None
    except urllib.error.HTTPError as error:
        data=error.read()
        try:return error.code,json.loads(data)
        except ValueError:return error.code,None


def keys():
    result=subprocess.run(['supabase','projects','api-keys','--project-ref',REF,'--reveal','--output','json'],capture_output=True,text=True,check=True)
    values=json.loads(result.stdout)
    by_name={item['name']:item.get('api_key') for item in values}
    assert by_name.get('service_role') and by_name.get('anon'),'Legacy keys required by the existing integration'
    return by_name['anon'],by_name['service_role']


def main(keep):
    anon,service=keys()
    email='portfolio-'+secrets.token_hex(6)+'@example.invalid'
    password=secrets.token_urlsafe(28)
    status,user=request('POST','/auth/v1/admin/users',service,body={'email':email,'password':password,'email_confirm':True})
    assert status in (200,201),'Synthetic test user could not be created'
    owner=user['id'];stored=[];retained=False
    try:
        status,session=request('POST','/auth/v1/token?grant_type=password',anon,body={'email':email,'password':password})
        assert status==200,'Synthetic user login failed'
        token=session['access_token'];demos=[];proof=[]
        for name in ['dev-01','dev-11','dev-14']:
            fixture=json.loads((ROOT/'docs/portfolio/cases'/f'{name}.json').read_text())
            status,created=request('POST','/rest/v1/cases',anon,token,{'owner_id':owner,'title':fixture['title'],'description':'Fiktiver Portfolio-Test: ordentliche Arbeitgeberkündigung. Keine echten Falldaten.'})
            assert status==201,('case_create',status)
            cid=created[0]['id'];pdf=(ROOT/f'apps/mobile/public/portfolio/{name}-document.pdf').read_bytes()
            path=f'{owner}/{cid}/{name}.pdf';stored.append((cid,path))
            status,_=request('POST','/storage/v1/object/case-documents/'+path,anon,token,pdf,'application/pdf')
            assert status in (200,201),('upload',status)
            status,docs=request('POST','/rest/v1/case_documents',anon,token,{'case_id':cid,'kind':'anschreiben','file_name':name+'.pdf','storage_path':path,'mime_type':'application/pdf','byte_size':len(pdf)})
            assert status==201,('document_create',status)
            did=docs[0]['id']
            status,extracted=request('POST','/functions/v1/dokument-lesen',anon,token,{'document_id':did})
            assert status==200 and extracted.get('status')=='gelesen',('extract',status,extracted.get('status'))
            status,docs=request('GET','/rest/v1/case_documents?id=eq.'+did+'&select=id,extracted_text,extracted_pages',anon,token)
            assert status==200 and len(docs[0]['extracted_pages'])==1
            typed=fixture['input']
            for fact in typed['facts']:
                fact['evidence']['document_id']=did
                assert ' '.join(fact['evidence']['quote'].split()) in ' '.join(docs[0]['extracted_pages'][0].split()),fact['key']
            status,_=request('PATCH','/rest/v1/cases?id=eq.'+cid,anon,token,{'termination_input':typed})
            assert status==200,('typed_input',status)
            started=time.monotonic()
            status,run=request('POST','/functions/v1/fall-einordnen',anon,token,{'case_id':cid})
            assert status==202,('analysis_start',status,run.get('error'))
            initial=round(time.monotonic()-started,3)
            analysis=None
            for _ in range(90):
                status,rows=request('GET',f'/rest/v1/case_analyses?case_id=eq.{cid}&select=id,released,structured_result,model&order=created_at.desc&limit=1',anon,token)
                assert status==200
                if rows:analysis=rows[0];break
                status,case=request('GET',f'/rest/v1/cases?id=eq.{cid}&select=status,analysis_error',anon,token)
                assert case[0]['status']!='fehlgeschlagen',('analysis_failed',case[0].get('analysis_error'))
                time.sleep(2)
            assert analysis and analysis['released'] and analysis['structured_result'], 'Controlled pipeline did not complete'
            result=analysis['structured_result']
            assert analysis['model']=='controlled-termination/1.0'
            expected={'dev-01':{'claim_deadline':'2026-12-01','notice_end':'2027-02-28'},'dev-11':{},'dev-14':{}}[name]
            assert {c['kind']:c['due_on'] for c in result['calculations']}==expected
            # Anonymous reads cannot export this account's private result.
            status,public_rows=request('GET',f'/rest/v1/case_analyses?id=eq.{analysis["id"]}&select=id',anon)
            assert (status==200 and public_rows==[]) or status in (401,403),'Private analysis was public'
            status,report=request('POST','/functions/v1/dokument-erstellen',anon,token,{'case_id':cid,'kind':'bericht'})
            assert status==200,('report',status,report.get('error'))
            status,approved=request('POST','/functions/v1/dokument-erstellen',anon,token,{'action':'approve','document_id':report['id']})
            assert status==200 and approved.get('approved_at'),('approve',status)
            for fact in result['facts']:fact['evidence']['document_id']=name+'-document'
            for fact in typed['facts']:fact['evidence']['document_id']=name+'-document'
            demos.append({**fixture,'result':result,'provenance':{'kind':'hosted_controlled_pipeline','generated_at':datetime.now(timezone.utc).isoformat(),'model_calls':0,'corpus_version':result['corpus_version']}})
            proof.append({'fixture':name,'start_status':202,'start_latency_seconds':initial,'analysis_latency_seconds':round(time.monotonic()-started,3),
                'released':True,'model':analysis['model'],'source_count':len(result['sources']),'calculation_count':len(result['calculations']),
                'real_pdf_text_extraction':True,'private_anonymous_read_denied':True,'report_saved_and_approved':True})
            print(proof[-1],flush=True)
        (ROOT/'apps/mobile/src/features/portfolio/demo-data.json').write_text(json.dumps(demos,ensure_ascii=False,indent=2)+'\n')
        (ROOT/'docs/portfolio/backend-e2e.json').write_text(json.dumps({'executed_at':datetime.now(timezone.utc).isoformat(),'project_region':'eu-central-1','public_data':'fictional only','cases':proof},indent=2)+'\n')
        if keep:
            state={'email':email,'password':password,'owner_id':owner,'cases':stored,'session':session}
            dest=Path('/tmp/recht-portfolio-simulator-session.json')
            dest.touch(mode=0o600,exist_ok=False);dest.write_text(json.dumps(state));dest.chmod(0o600)
            retained=True
            print('Synthetic user retained for Simulator capture; private session file mode 600. Remove using --cleanup.',flush=True)
    finally:
        if not retained:
            for cid,path in stored:
                request('DELETE','/storage/v1/object/case-documents',service,body={'prefixes':[path]})
                request('DELETE','/rest/v1/cases?id=eq.'+cid,service)
            request('DELETE','/auth/v1/admin/users/'+owner,service)


def cleanup():
    path=Path('/tmp/recht-portfolio-simulator-session.json')
    state=json.loads(path.read_text());_,service=keys()
    for cid,storage in state['cases']:
        status,_=request('DELETE','/storage/v1/object/case-documents',service,body={'prefixes':[storage]});assert status in (200,201)
        status,_=request('DELETE','/rest/v1/cases?id=eq.'+cid,service);assert status==200
    status,_=request('DELETE','/auth/v1/admin/users/'+state['owner_id'],service);assert status==200
    path.unlink()
    print('Synthetic user, cases and files removed; local session file deleted.')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--keep-user',action='store_true');parser.add_argument('--cleanup',action='store_true');args=parser.parse_args()
    cleanup() if args.cleanup else main(args.keep_user)
