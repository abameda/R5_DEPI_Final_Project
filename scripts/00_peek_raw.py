"""Quick peek at every raw file: row count, and per column the dtype,
null %, number of unique values and one example value.

Run:  python scripts/00_peek_raw.py
"""
from pathlib import Path
import pandas as pd

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"


def load(f: Path) -> pd.DataFrame:
    if f.suffix == ".csv":
        return pd.read_csv(f, low_memory=False, encoding_errors="replace")
    return pd.read_excel(f)


for f in sorted(RAW.iterdir()):
    df = load(f)
    print("=" * 110)
    print(f"{f.name}  ->  {df.shape[0]:,} rows x {df.shape[1]} cols")
    summary = pd.DataFrame({
        "dtype": df.dtypes.astype(str),
        "null%": (df.isna().mean() * 100).round(1),
        "unique": df.nunique(),
        "example": [str(df[c].dropna().iloc[0])[:60].replace("\n", " ") if df[c].notna().any() else ""
                    for c in df.columns],
    })
    print(summary.to_string())
