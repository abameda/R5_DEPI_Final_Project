"""Pure roadmap helpers: stage assignment and within-market pay premium."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from api.queries.roadmap import assign_stages, market_premium  # noqa: E402


def row(skill, share, wl=None):
    return {"skill": skill, "share": share, "wilson_lower": wl if wl is not None else share}


def names(rows):
    return [r["skill"] for r in rows]


def test_roadmap_stages_partition_and_fallback():
    s = assign_stages([row("A", .6), row("B", .3), row("C", .2), row("D", .1), row("E", .04)])
    assert names(s["foundations"]) == ["A", "B", "C"]  # only two reach 25%, so the top 3 are taken
    assert names(s["core"]) == ["D"] and names(s["niche"]) == ["E"]
    small = assign_stages([row(x, .04 - i * .001) for i, x in enumerate("ABCDE")])
    assert names(small["foundations"]) == ["A", "B", "C"] and small["core"] == []
    assert names(small["niche"]) == ["D", "E"]


def test_core_is_capped_and_overflow_dropped():
    rows = [row("F", .5), row("G", .4), row("H", .3)] \
        + [row(f"c{i}", .2 - i * .01, wl=.2 - i * .01) for i in range(10)] + [row("n", .03)]
    s = assign_stages(rows)
    assert len(s["core"]) == 8
    assert names(s["niche"]) == ["n"]


def cell(m, rm, rn, sm, sn):
    return {"market": m, "role_median": rm, "role_n": rn, "skill_median": sm, "skill_n": sn}


def test_market_premium_ignores_market_mix():
    # pays exactly the role median inside each market, but sits mostly in the richer one
    assert market_premium([cell("Arab", 30000, 200, 30000, 15), cell("International", 100000, 500, 100000, 40)]) is None


def test_market_premium_weights_by_skill_salaries():
    p = market_premium([cell("Arab", 30000, 200, 33000, 10), cell("International", 100000, 500, 120000, 30)])
    assert p["premium"] == pytest.approx((0.1 * 10 + 0.2 * 30) / 40)
    assert p["salary_n"] == 40 and p["markets"] == ["Arab", "International"]


def test_market_premium_skips_thin_markets():
    assert market_premium([cell("Arab", 30000, 9, 90000, 40)]) is None
    assert market_premium([cell("Arab", 30000, 200, 33000, 25), cell("Remote", 50000, 200, 99000, 5)]) is None  # 25 < 30


def test_excluded_noise_respects_role_exceptions():
    from api.queries.roadmap import excluded
    assert {"Go", "CAN", "Flow"} <= excluded("Product & Project")
    assert "Go" in excluded("Mobile") and "Go" not in excluded("Backend")
    assert "CAN" not in excluded("Embedded & Hardware")
