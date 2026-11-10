"""Score observable contracts and dates; never label a source ID as legal validation."""
import json
import statistics
import sys
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
rows=[json.loads(line) for line in source.read_text().splitlines()]
corpus=json.loads((ROOT/'packages/shared/corpus/termination-2026-11-10/corpus.json').read_text())
norms={s['id'] for s in corpus['sources']}
latest={}
for row in rows:latest[(row['id'],row['provider'],row['repetition'])]=row
scores=[]
for key,row in latest.items():
    score={k:row.get(k) for k in ['id','provider','repetition','latency_seconds','error']}
    score.update(date_mismatches=[],unknown_source_ids=[],uncited_calculations=0,uncited_claims=0,uncertainty_recognized=None)
    parsed=row.get('parsed')
    if not row.get('error') and isinstance(parsed,dict):
        calculations=parsed.get('calculations',[])
        claims=parsed.get('claims',[])
        uncertainties=parsed.get('uncertainties',[])
        valid=isinstance(calculations,list) and isinstance(claims,list) and isinstance(uncertainties,list) and all(isinstance(c,dict) and c.get('kind') in ('notice_end','claim_deadline') and isinstance(c.get('source_ids'),list) for c in calculations) and all(isinstance(c,dict) and isinstance(c.get('text'),str) and isinstance(c.get('source_ids'),list) for c in claims)
        if not valid:score['error']='invalid_result_contract'
        else:
            allowed=norms|{row['id']+'-document'}
            expected=row['expected']
            observed={c['kind']:c.get('due_on') for c in calculations}
            for kind in ('notice_end','claim_deadline'):
                if observed.get(kind)!=expected[kind]:score['date_mismatches'].append({'kind':kind,'expected':expected[kind],'actual':observed.get(kind)})
            if expected.get('invalid') and calculations:score['date_mismatches'].append({'kind':'invalid_input','expected':None,'actual':'calculated'})
            score['unknown_source_ids']=sorted({str(s) for c in calculations+claims for s in c.get('source_ids',[]) if s not in allowed})
            score['uncited_calculations']=sum(not bool(set(c['source_ids'])&norms) for c in calculations)
            score['uncited_claims']=sum(not bool(set(c['source_ids'])&norms) for c in claims)
            if any(expected[k] is None for k in ('notice_end','claim_deadline')):
                score['uncertainty_recognized']=bool(uncertainties) and all(kind not in observed for kind in ('notice_end','claim_deadline') if expected[kind] is None)
    scores.append(score)
summary={}
for provider in ('qwen','gemini'):
    group=[r for r in scores if r['provider']==provider]
    returned=[r for r in group if not r.get('error')]
    elapsed=[r['latency_seconds'] for r in group if r.get('error')!='provider_circuit_open']
    summary[provider]={'planned_runs':len(group),'returned_valid_contract':len(returned),'transport_or_format_or_blocked':dict(Counter(r.get('error') for r in group if r.get('error'))),
        'runs_with_date_mismatch':sum(bool(r['date_mismatches']) for r in returned) if returned else None,'date_mismatches':sum(len(r['date_mismatches']) for r in returned) if returned else None,
        'runs_with_undefined_source_ids':sum(bool(r['unknown_source_ids']) for r in returned) if returned else None,'calculations_without_norm_source':sum(r['uncited_calculations'] for r in returned) if returned else None,
        'claims_without_norm_source':sum(r['uncited_claims'] for r in returned) if returned else None,'uncertainty_correctly_preserved':sum(r['uncertainty_recognized'] is True for r in returned) if returned else None,
        'uncertainty_not_preserved':sum(r['uncertainty_recognized'] is False for r in returned) if returned else None,'p50_request_seconds':statistics.median(elapsed) if elapsed else None,
        'free_legal_conclusions_approved':False}
report={'corpus_version':corpus['version'],'planned_logical_runs':80,'recorded_logical_runs':len(latest),'transport_attempts_including_replaced_bad_poll':len(rows),
    'complete_model_comparison':False,'comparison_limit':'Qwen EU L40S capacity unavailable within three request limits; existing Gemini quota exhausted. No model ranking or successful full acceptance benchmark claimed.',
    'scoring_limit':'Date/reference and citation-ID checks only; legal entailment is not established by an existing ID. No professional validation.',
    'manual_source_review_findings':[
        {'case':'dev-10/dev-11/acc-01','finding':'Gemini reverses § 1 KSchG in the wording unwirksam, wenn sie nicht sozial ungerechtfertigt ist. This is a material legal error.'},
        {'case':'dev-15','finding':'Gemini invents an immediate rejection and an omitted works-council hearing; neither follows from the confirmed facts.'},
        {'case':'dev-14','finding':'Gemini chooses a later receipt date despite contradictory confirmed evidence and emits dates instead of preserving the uncertainty.'},
        {'case':'dev-03','finding':'Gemini says written form is unknown although written_notice=yes was confirmed.'}],
    'summary':summary,'scores':scores}
assert len(latest)==80
(ROOT/'docs/portfolio/model-evaluation-summary.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False,indent=2))
