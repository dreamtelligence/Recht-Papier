"""Controlled result fixture for privilege/revision tests; not an extraction test."""
from copy import deepcopy
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def controlled_result(statements=()):
    result=deepcopy(json.loads((ROOT/'apps/mobile/src/features/portfolio/demo-data.json').read_text())[0]['result'])
    if statements:
        result['facts'][0]['evidence']['quote']='; '.join(statements)
    return result
