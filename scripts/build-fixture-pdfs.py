"""Render only the three explicitly fictional public fixture documents."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'apps/mobile/public/portfolio'
OUT.mkdir(parents=True, exist_ok=True)
styles=getSampleStyleSheet()
styles['BodyText'].fontName='Helvetica'
styles['BodyText'].fontSize=10
styles['BodyText'].leading=15
styles['BodyText'].textColor=colors.HexColor('#26322c')
for path in sorted((ROOT/'docs/portfolio/cases').glob('*.json')):
    fixture=json.loads(path.read_text())
    output=OUT/f"{fixture['id']}-document.pdf"
    doc=SimpleDocTemplate(str(output),pagesize=(210*mm,297*mm),leftMargin=20*mm,rightMargin=20*mm,topMargin=20*mm,bottomMargin=20*mm)
    content=[Paragraph('Recht &amp; Papier',styles['Title']),Paragraph('FIKTIVER BEISPIELFALL',styles['Heading2']),Spacer(1,6*mm)]
    for line in fixture['documents'][0]['extracted_text'].splitlines():
        content.extend([Paragraph(escape(line),styles['BodyText']),Spacer(1,3*mm)])
    doc.build(content)
    reader=PdfReader(output)
    assert len(reader.pages)==1, 'Evidence page references require a single-page fixture'
    text=reader.pages[0].extract_text()
    assert 'FIKTIVER' in text
    for fact in fixture['input']['facts']:
        assert ' '.join(fact['evidence']['quote'].split()) in ' '.join(text.split()),fact['key']
    print(output.relative_to(ROOT),len(reader.pages),'page')
