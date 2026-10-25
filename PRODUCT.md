# Product

<!-- impeccable:product-schema 1 -->

> Written from the project documentation (`Project Documentation33_final.pdf`) and the
> dashboard brief. The user delegated product and design decisions ("make strong,
> evidence-based choices without asking"); facts marked *(inferred)* were not confirmed
> in an interview.

## Platform

web

## Stack

delegated: FastAPI + DuckDB analytics API, React + TypeScript + Vite front end, Tailwind CSS,
Apache ECharts. Chosen over the Streamlit app planned in the project document because the brief
asks for server-side filtering of ~590k postings, URL-shareable state, drilldowns and a
product-grade UI that Streamlit cannot deliver.

## Users

- Egyptian and Arab engineers and fresh graduates looking for work in Egypt, other Arab
  countries, abroad, or remotely (primary, SH-01 / SH-02).
- Students planning careers; career advisors, university career offices and educators who
  need evidence of demand (SH-03).
- Recruiters and data analysts researching skill demand *(inferred from brief)*.
- DEPI lecturers and evaluators checking accuracy and methodology (SH-04).

## Product Purpose

Consolidate job postings collected from many sources into one searchable view that shows where
tech opportunities are (Arab, international, remote), which skills they ask for, what pay is
actually advertised, and what a person should learn next. Success: a job seeker can answer
"where is demand for my role and what should I learn?" in minutes, and an evaluator can verify
every figure against the methodology.

## Positioning

Every number is computed live from the team's own unified, deduplicated posting dataset and shows
its population, sample size and provenance: skills written in postings versus skills the team
added, advertised salaries versus market benchmarks, the 2023 Kaggle archive versus the 2024–26
collection. It describes the collected sample, never the whole labour market.

## Operating Context

DEPI graduation project (IBM Data Scientist track, Team 1), demonstrated on a standard laptop and
in a final presentation; used by students and advisors at a desk. Arabic and English content
coexists in postings (titles and descriptions may be Arabic, right-to-left).

## Capabilities and Constraints

- 588,545 unique postings, 159 countries, 1,475 skills, 8 sources; ~97% of postings come from
  the Kaggle "data jobs 2023" archive, so data roles dominate.
- Advertised salary on ~33.6k postings; benchmark figures on ~14.9k, kept separate.
- Two collection cohorts that are not a longitudinal sample.
- Raw third-party data must not be redistributed (NFR-08): exports are aggregates only.
- Out of scope: CV matching, applying for jobs, guaranteeing placement, conclusions about the
  whole job market.
- Role classifier (ML, WP7) is owned by other team members and not part of this dashboard.

## Brand Commitments

Project name: "Job Market Intelligence". No logo or visual identity exists *(inferred: none found
in the repository)*.

## Evidence on Hand

Real processed dataset (`data/processed/`), pipeline statistics (`reports/pipeline_stats.json`),
data-quality report (`reports/data_quality_report.md`). No user testimonials, usage numbers or
partner logos exist; none may be invented.

## Product Principles

1. Every figure states its population, denominator and provenance.
2. Uncertain data is shown with its limits, not hidden or smoothed over.
3. From any chart, one click reaches the postings behind it.
4. Useful to a student first: plain language, practical next steps.
5. Fast on a laptop: the browser never holds the dataset.

## Accessibility & Inclusion

WCAG 2.1 AA target; charts never rely on colour alone and carry titles, labelled axes and sample
sizes (NFR-11, NFR-12); Arabic text renders right-to-left correctly (NFR-10); keyboard operable;
reduced-motion respected.
