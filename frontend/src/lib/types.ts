/* Response shapes of the analytics API (api/queries/*). */

export interface Count { key: string; n: number; share: number | null }

export interface Meta {
  dataset_kind: "real" | "synthetic";
  built_at: string;
  pipeline_generated_at?: string;
  totals: { postings: number };
  dimensions: Record<string, { value: string; n: number; region?: string }[]>;
  skill_categories: string[];
  date_range: { min: string; max: string };
  labels: { source: Record<string, string>; cohort: Record<string, string>; cohort_notes: Record<string, string>; dimension: Record<string, string> };
  thresholds: { min_group_postings: number; min_salary_n: number; reliable_salary_n: number };
}

export interface Kpis {
  postings: number; appearances: number; countries: number; no_country: number; employers: number;
  role_categories: number; distinct_titles: number; with_skills: number; advertised_salary: number;
  benchmark_salary: number; arab: number; remote: number; first_posted: string | null; last_posted: string | null;
  undated: number; sources: number; distinct_skills: number;
}

export interface SkillRow {
  skill: string; category: string; is_technical: boolean; postings: number; observed: number;
  added: number; share: number | null; observed_share: number | null;
}
export interface TopSkills { denominator: number; provenance: "all" | "observed"; rows: SkillRow[] }

export interface CategoryRow { category: string; is_technical: boolean; postings: number; mentions: number; skills: number; share: number | null; mention_share: number | null }

export interface Overview {
  kpis: Kpis;
  roles: Count[]; markets: Count[]; regions: Count[]; seniority: Count[]; work_mode: Count[]; job_type: Count[];
  sources: Count[]; cohorts: Count[]; countries: Count[];
  top_skills: TopSkills;
  skill_categories: { denominator: number; rows: CategoryRow[] };
  months: { cohort: string; month: string; n: number }[];
  salary_histogram: { bin: number; n: number }[];
}

export interface SkillChip { skill: string; observed: boolean; category: string }
export interface Job {
  job_id: string; title: string; company: string | null; company_is_placeholder: boolean; role_category: string;
  seniority: string; country: string | null; city: string | null; location: string | null; region: string;
  market_type: string; work_mode: string; job_type: string; language: string; salary_kind: string;
  salary_usd_annual: number | null; salary_min: number | null; salary_max: number | null;
  salary_currency: string | null; salary_period: string | null; posted_date: string | null; cohort: string;
  source_dataset: string; source_platform: string | null; duplicate_count: number; url: string | null;
  skills_count: number; skills_observed_count: number; skill_list: SkillChip[];
  description?: string | null; sources?: string | null; search_keyword?: string | null;
}
export interface JobPage { total: number; page: number; page_size: number; sort: string; rows: Job[] }

export interface MatrixGroup { key: string; denominator: number; postings: number; small_sample: boolean }
export interface Matrix { dimension: string; groups: MatrixGroup[]; skills: string[]; cells: { key: string; skill: string; n: number; share: number | null }[]; min_group: number }

export interface CoLink { a: string; b: string; together: number; jaccard: number; lift: number | null; p_b_given_a: number; p_a_given_b: number }
export interface Cooc { denominator: number; nodes: SkillRow[]; links: CoLink[] }

export interface ShareRow { key: string; denominator: number; n: number; share: number | null }
export interface SalaryStats {
  key?: string; n: number; min: number | null; max: number | null; p10: number | null; p25: number | null;
  median: number | null; p75: number | null; p90: number | null; mean: number | null; currencies: number;
  confidence: "insufficient" | "low" | "ok";
}
export interface SalarySummary { kind: string; dimension: string | null; periods: string[]; overall: SalaryStats; groups: SalaryStats[]; groups_hidden_small_n: number; min_n: number }

export interface TrendPoint { cohort: string; month: string; n: number; denominator: number; share: number | null; reliable: boolean }
export interface SkillTrend {
  months: { cohort: string; month: string; denominator: number; postings: number; reliable: boolean }[];
  series: { skill: string; points: TrendPoint[] }[];
}

export interface SkillDetail {
  skill: string; category: string; category_source: string; is_technical: boolean;
  denominator: number; postings: number; share: number | null; observed_postings: number;
  by_role: ShareRow[]; by_country: ShareRow[]; by_seniority: ShareRow[]; by_market: ShareRow[];
  co_skills: { skill: string; together: number; total: number; p_given_skill: number | null; lift: number | null }[];
  employers: { key: string; n: number }[];
  salary: { with_skill: boolean; n: number; median: number | null; p25: number | null; p75: number | null; confidence: string }[];
  trend: SkillTrend;
}

export interface CountryRow {
  country: string; region: string; n: number; remote: number; with_skills: number; employers: number;
  salary_n: number; salary_median: number | null; kaggle_2023: number; top_role: string | null;
  top_role_n: number | null; top_skill: string | null; top_skill_n: number | null; share: number | null;
  top_skill_share: number | null; top_role_share: number | null; salary_confidence: string; small_sample: boolean;
}
export interface Geo { countries: CountryRow[]; no_country: number; located: number; concentration: { top3_share: number | null; hhi: number | null } }

export interface Insight {
  id: string; kind: string; text: string; value: number | null; n: number; denominator: number;
  drill: { path: string; params: Record<string, string> }; filters: Record<string, unknown>; provenance: string;
  /** The values the sentence is built from (used to render it in Arabic). */
  args?: Record<string, unknown>;
}
