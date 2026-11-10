"""Build a standalone architecture page from the checked-in technical document."""
from pathlib import Path
from markdown_it import MarkdownIt
ROOT=Path(__file__).resolve().parents[1]
parser=MarkdownIt('commonmark').enable('table')
old_fence=parser.renderer.rules['fence']
def fence(tokens,index,options,env):
    if tokens[index].info.strip()=='mermaid':
        return '<div class="flow"><b>Öffentlich</b><span>Fiktive Fälle → gespeicherte Prüfung → PDF</span><b>Native App</b><span>Auth / private PDF → bestätigte Angaben → Job-UUID → Python-Quellenprüfung → authentifizierter Callback → deterministische Regeln → atomare Fallakte → PDF</span></div>'
    return old_fence(tokens,index,options,env)
parser.renderer.rules['fence']=fence
body=parser.render((ROOT/'docs/architecture.md').read_text())
html='''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Architektur · Recht &amp; Papier</title><style>body{margin:0;background:#f5f1e8;color:#27332d;font:16px/1.8 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:45px 6vw}h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.25}h1{font-size:42px}h2{margin-top:50px;font-size:29px;border-top:1px solid #c7c6b5;padding-top:25px}a{color:#6b3c2e;text-underline-offset:4px}pre,.flow{padding:22px;background:#e4e7da;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}code{overflow-wrap:anywhere;font-size:13px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border:1px solid #bfc4b7;padding:13px;text-align:left;vertical-align:top}.flow{display:grid;gap:12px}.flow b{color:#6b3c2e;font:22px Georgia,serif}li{margin-bottom:8px}@media(max-width:600px){h1{font-size:32px}main{padding:28px 5vw}table{display:block;overflow-x:auto}th,td{min-width:180px}pre{padding:15px}}</style><main><nav><a href="/">← Zur Demo</a> · <a href="https://github.com/dreamtelligence/Recht-Papier">Quellcode ↗</a></nav>'''+body+'</main></html>'
out=ROOT/'apps/mobile/public/portfolio/architecture.html';out.write_text(html)
assert '<h1>' in html and 'Vorher-/Nachher' in html and '<div class="flow">' in html
print(out.relative_to(ROOT))
