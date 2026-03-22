/**
 * Canonical list of problem statements for profile selection.
 * Used by seed and profile setup UI.
 */
export const PROBLEM_STATEMENT_CATEGORIES = [
  { name: 'Literacy & ELA', slug: 'literacy-ela', sort_order: 1 },
  { name: 'Math Achievement', slug: 'math-achievement', sort_order: 2 },
  { name: 'Staffing & Teacher Support', slug: 'staffing-teacher-support', sort_order: 3 },
  { name: 'Student Support & Outcomes', slug: 'student-support-outcomes', sort_order: 4 },
  { name: 'Operations, Technology & Systems', slug: 'operations-technology-systems', sort_order: 5 },
  { name: 'Strategy, Funding & Community', slug: 'strategy-funding-community', sort_order: 6 },
] as const;

export const PROBLEM_STATEMENTS = [
  // Literacy & ELA (10)
  { category_slug: 'literacy-ela', code: 'lit-early', label: 'Improving early literacy (K–3 reading proficiency)', sort_order: 1 },
  { category_slug: 'literacy-ela', code: 'lit-middle-gaps', label: 'Addressing middle school reading gaps', sort_order: 2 },
  { category_slug: 'literacy-ela', code: 'lit-hs-comprehension', label: 'Increasing high school reading comprehension', sort_order: 3 },
  { category_slug: 'literacy-ela', code: 'lit-struggling-readers', label: 'Supporting struggling readers with effective interventions', sort_order: 4 },
  { category_slug: 'literacy-ela', code: 'lit-curriculum-align', label: 'Aligning literacy curriculum across grade levels', sort_order: 5 },
  { category_slug: 'literacy-ela', code: 'lit-writing-skills', label: 'Improving writing skills across subjects', sort_order: 6 },
  { category_slug: 'literacy-ela', code: 'lit-english-learners', label: 'Supporting English learners in literacy development', sort_order: 7 },
  { category_slug: 'literacy-ela', code: 'lit-structured-literacy', label: 'Implementing structured literacy / science of reading', sort_order: 8 },
  { category_slug: 'literacy-ela', code: 'lit-disparities', label: 'Reducing disparities in literacy outcomes across student groups', sort_order: 9 },
  { category_slug: 'literacy-ela', code: 'lit-assessment', label: 'Monitoring and improving literacy assessment outcomes', sort_order: 10 },
  // Math Achievement (8)
  { category_slug: 'math-achievement', code: 'math-foundational', label: 'Improving foundational math skills (K–5)', sort_order: 1 },
  { category_slug: 'math-achievement', code: 'math-middle-loss', label: 'Addressing middle school math learning loss', sort_order: 2 },
  { category_slug: 'math-achievement', code: 'math-algebra-readiness', label: 'Increasing algebra readiness', sort_order: 3 },
  { category_slug: 'math-achievement', code: 'math-hs-pass-rates', label: 'Improving high school math course pass rates', sort_order: 4 },
  { category_slug: 'math-achievement', code: 'math-intervention', label: 'Supporting math intervention programs', sort_order: 5 },
  { category_slug: 'math-achievement', code: 'math-curriculum-pacing', label: 'Aligning math curriculum and pacing', sort_order: 6 },
  { category_slug: 'math-achievement', code: 'math-anxiety-engagement', label: 'Reducing math anxiety and increasing engagement', sort_order: 7 },
  { category_slug: 'math-achievement', code: 'math-achievement-gaps', label: 'Closing achievement gaps in math performance', sort_order: 8 },
  // Staffing & Teacher Support (8)
  { category_slug: 'staffing-teacher-support', code: 'staff-recruiting', label: 'Recruiting qualified teachers in hard-to-fill roles', sort_order: 1 },
  { category_slug: 'staffing-teacher-support', code: 'staff-retaining', label: 'Retaining high-performing teachers', sort_order: 2 },
  { category_slug: 'staffing-teacher-support', code: 'staff-burnout', label: 'Addressing teacher burnout and workload', sort_order: 3 },
  { category_slug: 'staffing-teacher-support', code: 'staff-substitute', label: 'Improving substitute teacher availability', sort_order: 4 },
  { category_slug: 'staffing-teacher-support', code: 'staff-onboarding', label: 'Supporting new teacher onboarding and mentoring', sort_order: 5 },
  { category_slug: 'staffing-teacher-support', code: 'staff-professional-dev', label: 'Providing effective professional development', sort_order: 6 },
  { category_slug: 'staffing-teacher-support', code: 'staff-leadership', label: 'Building leadership pipelines (principals, admin)', sort_order: 7 },
  { category_slug: 'staffing-teacher-support', code: 'staff-rural-shortages', label: 'Managing staffing shortages in rural or high-need areas', sort_order: 8 },
  // Student Support & Outcomes (9)
  { category_slug: 'student-support-outcomes', code: 'student-attendance', label: 'Improving student attendance and reducing chronic absenteeism', sort_order: 1 },
  { category_slug: 'student-support-outcomes', code: 'student-behavior', label: 'Addressing student behavior and discipline challenges', sort_order: 2 },
  { category_slug: 'student-support-outcomes', code: 'student-mental-health', label: 'Expanding mental health support for students', sort_order: 3 },
  { category_slug: 'student-support-outcomes', code: 'student-sped', label: 'Supporting students with disabilities (SPED services)', sort_order: 4 },
  { category_slug: 'student-support-outcomes', code: 'student-dropout', label: 'Reducing dropout rates', sort_order: 5 },
  { category_slug: 'student-support-outcomes', code: 'student-graduation', label: 'Increasing graduation rates', sort_order: 6 },
  { category_slug: 'student-support-outcomes', code: 'student-college-career', label: 'Improving college and career readiness', sort_order: 7 },
  { category_slug: 'student-support-outcomes', code: 'student-multilingual', label: 'Supporting multilingual / ESL student success', sort_order: 8 },
  { category_slug: 'student-support-outcomes', code: 'student-inequities', label: 'Addressing inequities in student outcomes', sort_order: 9 },
  // Operations, Technology & Systems (7)
  { category_slug: 'operations-technology-systems', code: 'ops-edtech', label: 'Implementing and integrating new edtech tools', sort_order: 1 },
  { category_slug: 'operations-technology-systems', code: 'ops-tech-eval', label: 'Evaluating effectiveness of existing technology investments', sort_order: 2 },
  { category_slug: 'operations-technology-systems', code: 'ops-data-systems', label: 'Managing data systems and interoperability', sort_order: 3 },
  { category_slug: 'operations-technology-systems', code: 'ops-devices-connectivity', label: 'Improving access to devices and internet connectivity', sort_order: 4 },
  { category_slug: 'operations-technology-systems', code: 'ops-workflows', label: 'Streamlining administrative workflows and processes', sort_order: 5 },
  { category_slug: 'operations-technology-systems', code: 'ops-data-informed', label: 'Using data to inform instructional decisions', sort_order: 6 },
  { category_slug: 'operations-technology-systems', code: 'ops-cybersecurity', label: 'Ensuring cybersecurity and student data privacy', sort_order: 7 },
  // Strategy, Funding & Community (8)
  { category_slug: 'strategy-funding-community', code: 'strategy-budget', label: 'Allocating budgets effectively across priorities', sort_order: 1 },
  { category_slug: 'strategy-funding-community', code: 'strategy-esser', label: 'Managing ESSER or grant funding impact', sort_order: 2 },
  { category_slug: 'strategy-funding-community', code: 'strategy-family-engage', label: 'Engaging families and communities in student learning', sort_order: 3 },
  { category_slug: 'strategy-funding-community', code: 'strategy-communication', label: 'Improving communication with stakeholders (parents, staff)', sort_order: 4 },
  { category_slug: 'strategy-funding-community', code: 'strategy-policy', label: 'Navigating policy changes and compliance requirements', sort_order: 5 },
  { category_slug: 'strategy-funding-community', code: 'strategy-curriculum-initiatives', label: 'Implementing new curriculum or district-wide initiatives', sort_order: 6 },
  { category_slug: 'strategy-funding-community', code: 'strategy-roi', label: 'Measuring ROI of district programs and interventions', sort_order: 7 },
  { category_slug: 'strategy-funding-community', code: 'strategy-partnerships', label: 'Building partnerships with external organizations', sort_order: 8 },
] as const;
