/**
 * Role -> roadmap.sh pages. roadmap.sh's license allows linking only (no copying or framing its
 * content), so the Roadmap page links out here. Roles without a clear match get no link.
 */
const BASE = "https://roadmap.sh/";

const MAP: Record<string, [slug: string, label: string][]> = {
  "Data Analysis & BI": [["data-analyst", "Data Analyst"], ["bi-analyst", "BI Analyst"]],
  "Data Engineering": [["data-engineer", "Data Engineer"]],
  "Data Science & AI": [["ai-data-scientist", "AI & Data Scientist"], ["machine-learning", "Machine Learning"]],
  "DevOps & Cloud": [["devops", "DevOps"]],
  Backend: [["backend", "Backend"]],
  Frontend: [["frontend", "Frontend"]],
  "Full Stack": [["full-stack", "Full Stack"]],
  Cybersecurity: [["cyber-security", "Cyber Security"]],
  "QA & Testing": [["qa", "QA"]],
  "Product & Project": [["product-manager", "Product Manager"]],
  "Design & UX": [["ux-design", "UX Design"]],
  Mobile: [["android", "Android"], ["ios", "iOS"]],
};

export function roadmapLinks(role: string): { label: string; href: string }[] {
  return (MAP[role] ?? []).map(([slug, label]) => ({ label, href: BASE + slug }));
}
