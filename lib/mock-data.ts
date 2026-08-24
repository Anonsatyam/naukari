import { AdmitCardItem, BotDraft, Job, ResultItem, VacancyBreakdown, AgeRelaxationRow, ImportantLink, HotUpdateItem } from "./types";

export const categories = [
  "All",
  "Police",
  "Teaching",
  "Banking",
  "Engineering",
  "Healthcare",
  "Administrative",
  "Judiciary",
];

export const departments = [
  "All",
  "Bihar Police",
  "Bihar Education Department",
  "BPSC",
  "BSSC",
  "Bihar Health Department",
  "Bihar PWD",
  "Patna High Court",
];

export const qualifications = [
  "All",
  "10th Pass",
  "12th Pass",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "B.Tech / B.E.",
  "B.Ed",
];

// ---- Reusable mock-data helpers (kept DRY instead of hand-typing tables per job) ----

function distributeVacancies(total: number): VacancyBreakdown[] {
  if (!total) return [];
  const shares: { category: string; pct: number }[] = [
    { category: "Unreserved (UR)", pct: 0.4 },
    { category: "EWS", pct: 0.1 },
    { category: "BC", pct: 0.12 },
    { category: "EBC", pct: 0.18 },
    { category: "SC", pct: 0.16 },
    { category: "ST", pct: 0.04 },
  ];
  let allocated = 0;
  return shares.map((s, i) => {
    const count = i === shares.length - 1 ? total - allocated : Math.round(total * s.pct);
    allocated += count;
    return { category: s.category, count };
  });
}

function defaultAgeRelaxationBreakdown(): AgeRelaxationRow[] {
  return [
    { category: "SC / ST", relaxation: "+5 years" },
    { category: "BC / EBC", relaxation: "+3 years" },
    { category: "Female (Bihar domicile)", relaxation: "+3 years" },
    { category: "PwD", relaxation: "+10 years" },
  ];
}

function buildImportantLinks(job: {
  officialApplyUrl: string;
  officialNotificationUrl: string;
  sourceUrl: string;
}): ImportantLink[] {
  return [
    { label: "Apply Online", url: job.officialApplyUrl },
    { label: "Download Notification (PDF)", url: job.officialNotificationUrl },
    { label: "Official Website", url: job.sourceUrl },
  ];
}

type JobSeed = Omit<Job, "vacancyBreakdown" | "ageRelaxationBreakdown" | "importantLinks">;

const jobSeeds: JobSeed[] = [
  {
    id: "1",
    slug: "bihar-police-constable-recruitment-2026",
    state: "Bihar",
    title: "Bihar Police Constable Recruitment 2026",
    shortInfo:
      "CSBC has released 21,391 Constable vacancies across Bihar Police. 12th pass candidates aged 18–25 can apply online from 15 July to 30 August 2026.",
    organization: "Central Selection Board of Constable (CSBC)",
    department: "Bihar Police",
    category: "Police",
    totalVacancies: 21391,
    qualification: "12th Pass",
    minAge: 18,
    maxAge: 25,
    ageRelaxation: "3 years for OBC, 5 years for SC/ST, as per Bihar govt norms",
    salaryMin: 21700,
    salaryMax: 69100,
    applicationFee: { general: 675, reserved: 180, note: "SC/ST/PwD/Female candidates of Bihar get fee concession" },
    selectionProcess: ["Written Examination", "Physical Efficiency Test (PET)", "Physical Standard Test (PST)", "Document Verification", "Medical Examination"],
    examPattern: "100 objective questions, 100 marks, 2 hours, negative marking of 0.25 per wrong answer",
    syllabusSummary: "General Knowledge, General Hindi, Elementary Mathematics, Reasoning — 10th standard level",
    howToApply: [
      "Visit the official CSBC website",
      "Register with a valid mobile number and email",
      "Fill the application form with personal and educational details",
      "Upload photo, signature and required documents",
      "Pay the application fee online",
      "Submit and download the confirmation page",
    ],
    officialNotificationUrl: "https://csbc.bih.nic.in/notification/constable-2026.pdf",
    officialApplyUrl: "https://csbc.bih.nic.in/apply",
    sourceUrl: "https://csbc.bih.nic.in",
    importantDates: [
      { label: "Notification Released", date: "2026-07-10" },
      { label: "Application Start", date: "2026-07-15" },
      { label: "Application End", date: "2026-08-30" },
      { label: "Admit Card Release", date: "2026-09-20" },
      { label: "Exam Date", date: "2026-10-05" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "Must have passed 12th (Intermediate) from a recognized board" },
      { id: "e2", label: "Age Limit", type: "age", description: "18 to 25 years as on application closing date" },
      { id: "e3", label: "Domicile", type: "other", description: "Must be a resident of Bihar as per category-specific rules" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-07-11T09:00:00Z",
    updatedAt: "2026-08-20T09:00:00Z",
  },
  {
    id: "2",
    slug: "bpsc-combined-competitive-exam-70th",
    state: "Bihar",
    title: "BPSC 70th Combined Competitive Examination",
    shortInfo:
      "BPSC invites applications for 1,957 posts across various administrative services through the 70th Combined Competitive Examination. Graduates aged 20–37 can apply.",
    organization: "Bihar Public Service Commission (BPSC)",
    department: "BPSC",
    category: "Administrative",
    totalVacancies: 1957,
    qualification: "Graduate",
    minAge: 20,
    maxAge: 37,
    ageRelaxation: "3 years for OBC, 5 years for SC/ST/Women",
    salaryMin: 44900,
    salaryMax: 142400,
    applicationFee: { general: 750, reserved: 200 },
    selectionProcess: ["Preliminary Examination", "Main Examination", "Interview"],
    examPattern: "Prelims: 150 objective questions, General Studies, 2 hours",
    syllabusSummary: "General Studies, Optional Subject, Bihar-specific General Knowledge, Essay",
    howToApply: [
      "Register on the BPSC Online Application Portal (OAP)",
      "Fill personal, educational and category details",
      "Upload photograph and signature as per specification",
      "Pay examination fee online",
      "Print the final submitted application for records",
    ],
    officialNotificationUrl: "https://bpsc.bih.nic.in/notification/70th-cce.pdf",
    officialApplyUrl: "https://onlinebpsc.bihar.gov.in",
    sourceUrl: "https://bpsc.bih.nic.in",
    importantDates: [
      { label: "Notification Released", date: "2026-06-18" },
      { label: "Application Start", date: "2026-06-20" },
      { label: "Application End", date: "2026-07-20" },
      { label: "Prelims Exam Date", date: "2026-09-14" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "Bachelor's degree in any discipline from a recognized university" },
      { id: "e2", label: "Age Limit", type: "age", description: "20 to 37 years as on 1 August 2026" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-06-19T09:00:00Z",
    updatedAt: "2026-08-18T09:00:00Z",
  },
  {
    id: "3",
    slug: "bihar-stet-2026-secondary-teacher",
    state: "Bihar",
    title: "Bihar STET 2026 — Secondary Teacher Eligibility Test",
    shortInfo:
      "BSEB has released the STET 2026 notification for Paper I (secondary) and Paper II (senior secondary) teacher eligibility. Applications open 5–28 August 2026.",
    organization: "Bihar School Examination Board (BSEB)",
    department: "Bihar Education Department",
    category: "Teaching",
    totalVacancies: 0,
    qualification: "Graduate",
    minAge: 21,
    maxAge: 40,
    ageRelaxation: "5 years for reserved categories",
    salaryMin: 0,
    salaryMax: 0,
    applicationFee: { general: 960, reserved: 760, note: "This is an eligibility test, not a direct-recruitment exam" },
    selectionProcess: ["Written Test (Paper I / Paper II)", "Certificate valid for lifetime eligibility"],
    examPattern: "150 objective questions per paper, 2.5 hours, no negative marking",
    syllabusSummary: "Subject-specific content knowledge + teaching aptitude and pedagogy",
    howToApply: [
      "Visit the BSEB official website",
      "Register and choose Paper I (Class 9–10) or Paper II (Class 11–12)",
      "Upload documents and pay the fee",
      "Download the confirmation page after submission",
    ],
    officialNotificationUrl: "https://bsebstet2026.com/notification.pdf",
    officialApplyUrl: "https://bsebstet2026.com/apply",
    sourceUrl: "https://biharboardonline.bihar.gov.in",
    importantDates: [
      { label: "Notification Released", date: "2026-08-01" },
      { label: "Application Start", date: "2026-08-05" },
      { label: "Application End", date: "2026-08-28" },
      { label: "Exam Date", date: "2026-10-12" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "Graduate with B.Ed, or equivalent as per NCTE norms" },
      { id: "e2", label: "B.Ed Requirement", type: "education", description: "B.Ed degree is mandatory for Paper II applicants" },
      { id: "e3", label: "Age Limit", type: "age", description: "21 to 40 years as on 1 January 2026" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-08-02T09:00:00Z",
    updatedAt: "2026-08-22T09:00:00Z",
  },
  {
    id: "4",
    slug: "bssc-inter-level-combined-competitive-exam",
    state: "Bihar",
    title: "BSSC Inter Level Combined Competitive Examination",
    shortInfo:
      "BSSC has announced 3,689 vacancies for Inter-level posts across departments. 12th pass candidates aged 18–37 can apply from 1–31 August 2026.",
    organization: "Bihar Staff Selection Commission (BSSC)",
    department: "BSSC",
    category: "Administrative",
    totalVacancies: 3689,
    qualification: "12th Pass",
    minAge: 18,
    maxAge: 37,
    salaryMin: 21700,
    salaryMax: 69100,
    applicationFee: { general: 540, reserved: 135 },
    selectionProcess: ["Preliminary Exam", "Mains Exam", "Document Verification"],
    examPattern: "100 objective questions, 1 hour, General Knowledge + Reasoning + Basic Maths",
    howToApply: [
      "Visit the BSSC official portal",
      "Complete OTR (One Time Registration) if not already done",
      "Fill the application and upload documents",
      "Pay fee and submit",
    ],
    officialNotificationUrl: "https://bssc.bih.nic.in/notification/inter-level-2026.pdf",
    officialApplyUrl: "https://bssc.bih.nic.in/apply",
    sourceUrl: "https://bssc.bih.nic.in",
    importantDates: [
      { label: "Notification Released", date: "2026-07-28" },
      { label: "Application Start", date: "2026-08-01" },
      { label: "Application End", date: "2026-08-31" },
      { label: "Prelims Exam Date", date: "2026-11-08" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "12th pass from a recognized board" },
      { id: "e2", label: "Age Limit", type: "age", description: "18 to 37 years as on 1 August 2026" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-07-29T09:00:00Z",
    updatedAt: "2026-08-21T09:00:00Z",
  },
  {
    id: "5",
    slug: "bihar-anm-nursing-recruitment-2026",
    state: "Bihar",
    title: "Bihar ANM (Auxiliary Nurse Midwife) Recruitment 2026",
    shortInfo:
      "BTSC has released 4,936 ANM vacancies in the Bihar Health Department. Diploma holders aged 18–37 can apply from 12–27 August 2026.",
    organization: "Bihar Technical Service Commission (BTSC)",
    department: "Bihar Health Department",
    category: "Healthcare",
    totalVacancies: 4936,
    qualification: "Diploma",
    minAge: 18,
    maxAge: 37,
    salaryMin: 25500,
    salaryMax: 81100,
    applicationFee: { general: 600, reserved: 150 },
    selectionProcess: ["Merit List based on academic scores", "Document Verification"],
    howToApply: [
      "Visit the BTSC official website",
      "Register and fill the ANM application form",
      "Upload ANM diploma certificate and other documents",
      "Pay fee and submit application",
    ],
    officialNotificationUrl: "https://btsc.bih.nic.in/notification/anm-2026.pdf",
    officialApplyUrl: "https://btsc.bih.nic.in/apply",
    sourceUrl: "https://btsc.bih.nic.in",
    importantDates: [
      { label: "Notification Released", date: "2026-08-10" },
      { label: "Application Start", date: "2026-08-12" },
      { label: "Application End", date: "2026-08-27" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "ANM Diploma recognized by Bihar Nursing Council" },
      { id: "e2", label: "Age Limit", type: "age", description: "18 to 37 years as on 1 August 2026" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-08-11T09:00:00Z",
    updatedAt: "2026-08-23T09:00:00Z",
  },
  {
    id: "6",
    slug: "bihar-junior-engineer-pwd-recruitment",
    state: "Bihar",
    title: "Bihar Junior Engineer (Civil) Recruitment — PWD",
    shortInfo:
      "BTSC has released 1,245 Junior Engineer (Civil) vacancies in the PWD. B.Tech/B.E. holders aged 21–37 can apply from 8–29 August 2026.",
    organization: "Bihar Technical Service Commission (BTSC)",
    department: "Bihar PWD",
    category: "Engineering",
    totalVacancies: 1245,
    qualification: "B.Tech / B.E.",
    minAge: 21,
    maxAge: 37,
    salaryMin: 35400,
    salaryMax: 112400,
    applicationFee: { general: 600, reserved: 150 },
    selectionProcess: ["Computer Based Test", "Document Verification", "Certificate Verification"],
    examPattern: "150 objective questions, technical + general studies, 2.5 hours",
    howToApply: [
      "Visit the BTSC official website",
      "Register with engineering degree details",
      "Upload documents and mark sheets",
      "Pay fee and submit application",
    ],
    officialNotificationUrl: "https://btsc.bih.nic.in/notification/je-civil-2026.pdf",
    officialApplyUrl: "https://btsc.bih.nic.in/apply",
    sourceUrl: "https://btsc.bih.nic.in",
    importantDates: [
      { label: "Notification Released", date: "2026-08-05" },
      { label: "Application Start", date: "2026-08-08" },
      { label: "Application End", date: "2026-08-29" },
      { label: "Exam Date", date: "2026-10-25" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "B.Tech / B.E. in Civil Engineering from a recognized university" },
      { id: "e2", label: "Age Limit", type: "age", description: "21 to 37 years as on 1 August 2026" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-08-06T09:00:00Z",
    updatedAt: "2026-08-19T09:00:00Z",
  },
  {
    id: "7",
    slug: "patna-high-court-stenographer-recruitment",
    state: "Bihar",
    title: "Patna High Court Stenographer Recruitment 2026",
    shortInfo:
      "Patna High Court has released 62 Stenographer vacancies. Graduates aged 21–37 can apply from 16–31 August 2026.",
    organization: "Patna High Court",
    department: "Patna High Court",
    category: "Judiciary",
    totalVacancies: 62,
    qualification: "Graduate",
    minAge: 21,
    maxAge: 37,
    salaryMin: 29200,
    salaryMax: 92300,
    applicationFee: { general: 800, reserved: 200 },
    selectionProcess: ["Written Exam", "Stenography Skill Test", "Interview"],
    howToApply: [
      "Visit the Patna High Court official website",
      "Register and fill the application form",
      "Upload documents including shorthand speed certificate if available",
      "Pay fee and submit",
    ],
    officialNotificationUrl: "https://patnahighcourt.gov.in/notification/steno-2026.pdf",
    officialApplyUrl: "https://patnahighcourt.gov.in/apply",
    sourceUrl: "https://patnahighcourt.gov.in",
    importantDates: [
      { label: "Notification Released", date: "2026-08-14" },
      { label: "Application Start", date: "2026-08-16" },
      { label: "Application End", date: "2026-08-31" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "Bachelor's degree from a recognized university" },
      { id: "e2", label: "Age Limit", type: "age", description: "21 to 37 years as on 1 August 2026" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-08-15T09:00:00Z",
    updatedAt: "2026-08-23T09:00:00Z",
  },
  {
    id: "8",
    slug: "bihar-gramin-bank-office-assistant",
    state: "Bihar",
    title: "Bihar Gramin Bank Office Assistant Recruitment",
    shortInfo:
      "Bihar Gramin Bank has released 315 Office Assistant vacancies. Graduates aged 20–28 can apply from 20 August to 5 September 2026.",
    organization: "Bihar Gramin Bank",
    department: "BPSC",
    category: "Banking",
    totalVacancies: 315,
    qualification: "Graduate",
    minAge: 20,
    maxAge: 28,
    salaryMin: 26000,
    salaryMax: 55000,
    applicationFee: { general: 850, reserved: 175 },
    selectionProcess: ["Online Preliminary Exam", "Online Main Exam", "Interview"],
    examPattern: "Reasoning, Quant, English, General Awareness, Computer Knowledge",
    howToApply: [
      "Visit the Bihar Gramin Bank careers page",
      "Register with valid IBPS RRB score if applicable",
      "Fill personal and academic details",
      "Pay fee and submit application",
    ],
    officialNotificationUrl: "https://biharginbank.co.in/notification/office-assistant-2026.pdf",
    officialApplyUrl: "https://biharginbank.co.in/apply",
    sourceUrl: "https://biharginbank.co.in",
    importantDates: [
      { label: "Notification Released", date: "2026-08-18" },
      { label: "Application Start", date: "2026-08-20" },
      { label: "Application End", date: "2026-09-05" },
    ],
    eligibilityRules: [
      { id: "e1", label: "Qualification", type: "education", description: "Bachelor's degree from a recognized university" },
      { id: "e2", label: "Age Limit", type: "age", description: "20 to 28 years as on 1 August 2026" },
      { id: "e3", label: "Language", type: "other", description: "Proficiency in Hindi and knowledge of the local language of Bihar is preferred" },
    ],
    status: "published",
    createdByBot: true,
    publishedAt: "2026-08-19T09:00:00Z",
    updatedAt: "2026-08-23T09:00:00Z",
  },
];

export const jobs: Job[] = jobSeeds.map((job) => ({
  ...job,
  vacancyBreakdown: distributeVacancies(job.totalVacancies),
  ageRelaxationBreakdown: defaultAgeRelaxationBreakdown(),
  importantLinks: buildImportantLinks(job),
}));

export const results: ResultItem[] = [
  {
    id: "r1",
    slug: "bihar-police-si-result-2026",
    title: "Bihar Police Sub Inspector (SI) Final Result 2026",
    organization: "Bihar Police Subordinate Services Commission (BPSSC)",
    category: "Police",
    resultDate: "2026-08-19",
    officialLink: "https://bpssc.bih.nic.in/result/si-final-2026.pdf",
    sourceUrl: "https://bpssc.bih.nic.in",
    summary: "Final result declared after document verification and physical test rounds.",
  },
  {
    id: "r2",
    slug: "bpsc-69th-mains-result",
    title: "BPSC 69th Combined Competitive Exam — Mains Result",
    organization: "Bihar Public Service Commission (BPSC)",
    category: "Administrative",
    resultDate: "2026-08-10",
    officialLink: "https://bpsc.bih.nic.in/result/69th-mains.pdf",
    sourceUrl: "https://bpsc.bih.nic.in",
    summary: "Mains result declared; shortlisted candidates called for interview round.",
  },
  {
    id: "r3",
    slug: "bihar-bed-cet-2026-result",
    title: "Bihar B.Ed CET 2026 Result",
    organization: "Lalit Narayan Mithila University (LNMU)",
    category: "Teaching",
    resultDate: "2026-07-30",
    officialLink: "https://biharcetbed-lnmu.in/result-2026.pdf",
    sourceUrl: "https://biharcetbed-lnmu.in",
    summary: "Entrance test result declared for admission into two-year B.Ed programs across Bihar.",
  },
];

export const admitCards: AdmitCardItem[] = [
  {
    id: "a1",
    slug: "bihar-police-constable-admit-card-2026",
    title: "Bihar Police Constable Written Exam Admit Card",
    organization: "Central Selection Board of Constable (CSBC)",
    category: "Police",
    examDate: "2026-10-05",
    releaseDate: "2026-08-22",
    officialLink: "https://csbc.bih.nic.in/admit-card/constable-2026",
    sourceUrl: "https://csbc.bih.nic.in",
  },
  {
    id: "a2",
    slug: "bssc-inter-level-admit-card",
    title: "BSSC Inter Level Prelims Admit Card",
    organization: "Bihar Staff Selection Commission (BSSC)",
    category: "Administrative",
    examDate: "2026-11-08",
    releaseDate: "2026-08-14",
    officialLink: "https://bssc.bih.nic.in/admit-card/inter-level-2026",
    sourceUrl: "https://bssc.bih.nic.in",
  },
  {
    id: "a3",
    slug: "bpsc-70th-prelims-admit-card",
    title: "BPSC 70th CCE Prelims Admit Card",
    organization: "Bihar Public Service Commission (BPSC)",
    category: "Administrative",
    examDate: "2026-09-14",
    releaseDate: "2026-08-05",
    officialLink: "https://bpsc.bih.nic.in/admit-card/70th-prelims",
    sourceUrl: "https://bpsc.bih.nic.in",
  },
];

export const botDrafts: BotDraft[] = [
  {
    id: "d1",
    jobTitle: "Bihar Cooperative Bank Manager Recruitment 2026",
    organization: "Bihar State Cooperative Bank",
    sourceUrl: "https://biharscb.co.in/notification/manager-2026.pdf",
    detectedAt: "2026-08-23T14:12:00Z",
    status: "pending",
    confidence: "high",
    extractedFields: {
      title: "Bihar Cooperative Bank Manager Recruitment 2026",
      organization: "Bihar State Cooperative Bank",
      totalVacancies: 84,
      qualification: "Graduate",
      minAge: 21,
      maxAge: 35,
    },
  },
  {
    id: "d2",
    jobTitle: "Bihar Forest Guard Recruitment 2026",
    organization: "Bihar Forest Department",
    sourceUrl: "https://forest.bihar.gov.in/notification/guard-2026.pdf",
    detectedAt: "2026-08-23T09:45:00Z",
    status: "pending",
    confidence: "medium",
    extractedFields: {
      title: "Bihar Forest Guard Recruitment 2026",
      organization: "Bihar Forest Department",
      totalVacancies: 512,
      qualification: "12th Pass",
    },
  },
  {
    id: "d3",
    jobTitle: "Bihar Agriculture Department Field Assistant",
    organization: "Bihar Agriculture Department",
    sourceUrl: "https://agriculture.bihar.gov.in/notification/field-assistant-2026.pdf",
    detectedAt: "2026-08-22T18:30:00Z",
    status: "pending",
    confidence: "low",
    extractedFields: {
      title: "Bihar Agriculture Department Field Assistant",
      organization: "Bihar Agriculture Department",
    },
  },
];

export function isClosingSoon(job: Job): boolean {
  const endDateEntry = job.importantDates.find((d) => d.label === "Application End");
  if (!endDateEntry) return false;
  const end = new Date(endDateEntry.date).getTime();
  const now = new Date("2026-08-24").getTime();
  const diffDays = (end - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

// Generic "was this posted/declared/released recently" check, reused for the
// "New" badge on jobs, results and admit cards alike instead of one-off logic per type.
export function isRecent(dateIso: string, withinDays: number = 5, from: string = "2026-08-24"): boolean {
  const date = new Date(dateIso).getTime();
  const start = new Date(from).getTime();
  const diffDays = (start - date) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= withinDays;
}

export function getApplicationEndDate(job: Job): string | undefined {
  return job.importantDates.find((d) => d.label === "Application End")?.date;
}

export function getJobBySlug(slug: string): Job | undefined {
  return jobs.find((j) => j.slug === slug);
}

export function getResultBySlug(slug: string): ResultItem | undefined {
  return results.find((r) => r.slug === slug);
}

export function getAdmitCardBySlug(slug: string): AdmitCardItem | undefined {
  return admitCards.find((a) => a.slug === slug);
}

export function getRelatedJobs(job: Job, limit: number = 3): Job[] {
  const sameCategory = jobs.filter((j) => j.id !== job.id && j.category === job.category);
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  const sameDepartment = jobs.filter(
    (j) => j.id !== job.id && j.department === job.department && !sameCategory.includes(j)
  );
  const combined = [...sameCategory, ...sameDepartment];
  if (combined.length >= limit) return combined.slice(0, limit);
  const rest = jobs.filter((j) => j.id !== job.id && !combined.includes(j));
  return [...combined, ...rest].slice(0, limit);
}

// Merges jobs, results and admit cards into one recency-sorted feed —
// the "Hot Right Now" mixed feed on the home page.
export function getHotUpdates(limit: number = 8): HotUpdateItem[] {
  const jobItems: HotUpdateItem[] = jobs.map((j) => ({
    type: "Job",
    href: `/jobs/${j.slug}`,
    title: j.title,
    organization: j.organization,
    category: j.category,
    date: j.publishedAt,
    isNew: isRecent(j.publishedAt),
  }));

  const resultItems: HotUpdateItem[] = results.map((r) => ({
    type: "Result",
    href: `/results/${r.slug}`,
    title: r.title,
    organization: r.organization,
    category: r.category,
    date: r.resultDate,
    isNew: isRecent(r.resultDate),
  }));

  const admitCardItems: HotUpdateItem[] = admitCards.map((a) => ({
    type: "Admit Card",
    href: `/admit-cards/${a.slug}`,
    title: a.title,
    organization: a.organization,
    category: a.category,
    date: a.releaseDate,
    isNew: isRecent(a.releaseDate),
  }));

  return [...jobItems, ...resultItems, ...admitCardItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
