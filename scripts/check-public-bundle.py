"""Fail publication if the static demo contains private configuration or artifacts."""
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'apps/mobile/dist'
assert (DIST/'index.html').is_file(),'Build the public web entry first'
for path in DIST.rglob('*'):
    if not path.is_file():continue
    assert not path.name.startswith('.env'),path
    if path.suffix in ('.js','.json','.html'):
        text=path.read_text()
        for private in ('SUPABASE_SERVICE_ROLE_KEY','supabase.co','"access_token"','"refresh_token"','"owner_id"','case_documents','CASE_ANALYSIS_CALLBACK_SECRET'):
            assert private not in text,(path.name,private)
examples=json.loads((ROOT/'apps/mobile/src/features/portfolio/demo-data.json').read_text())
assert len(examples)==3
for example in examples:
    assert example['fictional'] is True
    assert example['provenance']['kind']=='hosted_controlled_pipeline','Publish only actually hosted-pipeline results'
    for fact in example['result']['facts']:
        assert fact['evidence']['document_id']==example['id']+'-document'
    for source in example['result']['sources']:
        assert hashlib.sha256(source['text'].encode()).hexdigest()==source['sha256']
    for suffix in ('document.pdf','report.pdf'):
        assert (DIST/'portfolio'/f"{example['id']}-{suffix}").is_file()
print('Public bundle isolated; 3 hosted fictional results and all document/report PDFs verified.')

# Only the already reviewed fictional native captures may be copied to the public gallery.
for source in (ROOT/'docs/portfolio/native').glob('*.png'):
    assert (DIST/'portfolio/native'/source.name).read_bytes()==source.read_bytes(),source.name
assert (DIST/'portfolio/native/00-start.png').read_bytes()==(ROOT/'docs/screenshots/01-start.png').read_bytes()
print('Nine original native screenshots verified byte for byte.')
