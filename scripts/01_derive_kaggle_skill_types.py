"""Regenerate `KAGGLE_SKILL_TYPES` in src/skill_taxonomy.py.

The Kaggle 'data jobs 2023' file has a `job_type_skills` column that groups the
skills of each posting, e.g. {'cloud': ['aws'], 'programming': ['python']}.
For every canonical skill key we keep the group it is filed under most often.

    python scripts/01_derive_kaggle_skill_types.py   # prints the dict
"""
import ast
import collections
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from clean_utils import parse_skill_list  # noqa: E402

raw = pd.read_csv(ROOT / "data" / "raw" / "International_Tech_Jobs_Filtered.csv", usecols=["job_type_skills"])
counts = collections.defaultdict(collections.Counter)
for value, n in raw["job_type_skills"].dropna().value_counts().items():
    for group, skills in ast.literal_eval(value).items():
        for skill in skills:
            for key in parse_skill_list(skill):
                counts[key][group] += n

types = {key: c.most_common(1)[0][0] for key, c in sorted(counts.items())}
print("KAGGLE_SKILL_TYPES = {")
for key, group in types.items():
    print(f"    {key!r}: {group!r},")
print("}")
