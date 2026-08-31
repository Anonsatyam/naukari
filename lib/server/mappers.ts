import { Job, ResultItem, AdmitCardItem, BotDraft, BotLogEntry } from "@/lib/types";


export function rowToJob(row: any): Job {
  return {
    id: row.id,
    slug: row.slug,
    state: row.state,
    title: row.title,
    shortInfo: row.short_info,
    organization: row.organization,
    department: row.department,
    category: row.category,
    totalVacancies: row.total_vacancies,
    vacancyBreakdown: row.vacancy_breakdown ?? undefined,
    postDetailsText: row.post_details_text ?? undefined,
    qualification: row.qualification,
    minAge: row.min_age,
    maxAge: row.max_age,
    ageRelaxation: row.age_relaxation ?? undefined,
    ageRelaxationBreakdown: row.age_relaxation_breakdown ?? undefined,
    ageAsOnDate: row.age_as_on_date ?? undefined,
    ageLimitByGrade: row.age_limit_by_grade ?? undefined,
    ageLimitText: row.age_limit_text ?? undefined,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    applicationFee: row.application_fee,
    applicationFeeText: row.application_fee_text ?? undefined,
    selectionProcess: row.selection_process,
    selectionProcessText: row.selection_process_text ?? undefined,
    examPattern: row.exam_pattern ?? undefined,
    examPatternNotes: row.exam_pattern_notes ?? undefined,
    documentsRequired: row.documents_required ?? undefined,
    syllabusSummary: row.syllabus_summary ?? undefined,
    eligibilityDetails: row.eligibility_details ?? undefined,
    eligibilityText: row.eligibility_text ?? undefined,
    howToApply: row.how_to_apply,
    officialNotificationUrl: row.official_notification_url,
    officialApplyUrl: row.official_apply_url,
    sourceUrl: row.source_url,
    importantLinks: row.important_links ?? undefined,
    importantDates: row.important_dates,
    importantDatesText: row.important_dates_text ?? undefined,
    eligibilityRules: row.eligibility_rules,
    faqs: row.faqs ?? undefined,
    conclusion: row.conclusion ?? undefined,
    additionalSections: row.additional_sections ?? undefined,
    sectionOrder: row.section_order ?? undefined,
    sourceOrderKey: row.source_order_key ?? undefined,
    status: row.status,
    createdByBot: row.created_by_bot,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export function jobToRow(job: Partial<Job>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (job.slug !== undefined) row.slug = job.slug;
  if (job.state !== undefined) row.state = job.state;
  if (job.title !== undefined) row.title = job.title;
  if (job.shortInfo !== undefined) row.short_info = job.shortInfo;
  if (job.organization !== undefined) row.organization = job.organization;
  if (job.department !== undefined) row.department = job.department;
  if (job.category !== undefined) row.category = job.category;
  if (job.totalVacancies !== undefined) row.total_vacancies = job.totalVacancies;
  if (job.vacancyBreakdown !== undefined) row.vacancy_breakdown = job.vacancyBreakdown;
  if (job.postDetailsText !== undefined) row.post_details_text = job.postDetailsText;
  if (job.qualification !== undefined) row.qualification = job.qualification;
  if (job.minAge !== undefined) row.min_age = job.minAge;
  if (job.maxAge !== undefined) row.max_age = job.maxAge;
  if (job.ageRelaxation !== undefined) row.age_relaxation = job.ageRelaxation;
  if (job.ageRelaxationBreakdown !== undefined) row.age_relaxation_breakdown = job.ageRelaxationBreakdown;
  if (job.ageAsOnDate !== undefined) row.age_as_on_date = job.ageAsOnDate;
  if (job.ageLimitByGrade !== undefined) row.age_limit_by_grade = job.ageLimitByGrade;
  if (job.ageLimitText !== undefined) row.age_limit_text = job.ageLimitText;
  if (job.salaryMin !== undefined) row.salary_min = job.salaryMin;
  if (job.salaryMax !== undefined) row.salary_max = job.salaryMax;
  if (job.applicationFee !== undefined) row.application_fee = job.applicationFee;
  if (job.applicationFeeText !== undefined) row.application_fee_text = job.applicationFeeText;
  if (job.selectionProcess !== undefined) row.selection_process = job.selectionProcess;
  if (job.selectionProcessText !== undefined) row.selection_process_text = job.selectionProcessText;
  if (job.examPattern !== undefined) row.exam_pattern = job.examPattern;
  if (job.examPatternNotes !== undefined) row.exam_pattern_notes = job.examPatternNotes;
  if (job.documentsRequired !== undefined) row.documents_required = job.documentsRequired;
  if (job.syllabusSummary !== undefined) row.syllabus_summary = job.syllabusSummary;
  if (job.eligibilityDetails !== undefined) row.eligibility_details = job.eligibilityDetails;
  if (job.eligibilityText !== undefined) row.eligibility_text = job.eligibilityText;
  if (job.howToApply !== undefined) row.how_to_apply = job.howToApply;
  if (job.officialNotificationUrl !== undefined) row.official_notification_url = job.officialNotificationUrl;
  if (job.officialApplyUrl !== undefined) row.official_apply_url = job.officialApplyUrl;
  if (job.sourceUrl !== undefined) row.source_url = job.sourceUrl;
  if (job.importantLinks !== undefined) row.important_links = job.importantLinks;
  if (job.importantDates !== undefined) row.important_dates = job.importantDates;
  if (job.importantDatesText !== undefined) row.important_dates_text = job.importantDatesText;
  if (job.eligibilityRules !== undefined) row.eligibility_rules = job.eligibilityRules;
  if (job.faqs !== undefined) row.faqs = job.faqs;
  if (job.conclusion !== undefined) row.conclusion = job.conclusion;
  if (job.additionalSections !== undefined) row.additional_sections = job.additionalSections;
  if (job.sectionOrder !== undefined) row.section_order = job.sectionOrder;
  if (job.sourceOrderKey !== undefined) row.source_order_key = job.sourceOrderKey;
  if (job.status !== undefined) row.status = job.status;
  if (job.createdByBot !== undefined) row.created_by_bot = job.createdByBot;
  if (job.publishedAt !== undefined) row.published_at = job.publishedAt;
  if (job.updatedAt !== undefined) row.updated_at = job.updatedAt;
  return row;
}


export function rowToResult(row: any): ResultItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    organization: row.organization,
    category: row.category,
    resultDate: row.result_date,
    officialLink: row.official_link,
    sourceUrl: row.source_url,
    summary: row.summary,
    importantDatesText: row.important_dates_text ?? undefined,
    howToCheck: row.how_to_check ?? undefined,
    cutoffText: row.cutoff_text ?? undefined,
    totalVacancies: row.total_vacancies ?? undefined,
    vacancyBreakdown: row.vacancy_breakdown ?? undefined,
    postDetailsText: row.post_details_text ?? undefined,
    ageLimitByGrade: row.age_limit_by_grade ?? undefined,
    ageRelaxationBreakdown: row.age_relaxation_breakdown ?? undefined,
    ageLimitText: row.age_limit_text ?? undefined,
    applicationFee: row.application_fee ?? undefined,
    applicationFeeText: row.application_fee_text ?? undefined,
    selectionProcess: row.selection_process ?? undefined,
    selectionProcessText: row.selection_process_text ?? undefined,
    examPattern: row.exam_pattern ?? undefined,
    examPatternNotes: row.exam_pattern_notes ?? undefined,
    documentsRequired: row.documents_required ?? undefined,
    eligibilityText: row.eligibility_text ?? undefined,
    importantLinks: row.important_links ?? undefined,
    faqs: row.faqs ?? undefined,
    conclusion: row.conclusion ?? undefined,
    additionalSections: row.additional_sections ?? undefined,
    sectionOrder: row.section_order ?? undefined,
    sourceOrderKey: row.source_order_key ?? undefined,
  };
}

export function resultToRow(result: Partial<ResultItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (result.slug !== undefined) row.slug = result.slug;
  if (result.title !== undefined) row.title = result.title;
  if (result.organization !== undefined) row.organization = result.organization;
  if (result.category !== undefined) row.category = result.category;
  if (result.resultDate !== undefined) row.result_date = result.resultDate;
  if (result.officialLink !== undefined) row.official_link = result.officialLink;
  if (result.sourceUrl !== undefined) row.source_url = result.sourceUrl;
  if (result.summary !== undefined) row.summary = result.summary;
  if (result.importantDatesText !== undefined) row.important_dates_text = result.importantDatesText;
  if (result.howToCheck !== undefined) row.how_to_check = result.howToCheck;
  if (result.cutoffText !== undefined) row.cutoff_text = result.cutoffText;
  if (result.totalVacancies !== undefined) row.total_vacancies = result.totalVacancies;
  if (result.vacancyBreakdown !== undefined) row.vacancy_breakdown = result.vacancyBreakdown;
  if (result.postDetailsText !== undefined) row.post_details_text = result.postDetailsText;
  if (result.ageLimitByGrade !== undefined) row.age_limit_by_grade = result.ageLimitByGrade;
  if (result.ageRelaxationBreakdown !== undefined) row.age_relaxation_breakdown = result.ageRelaxationBreakdown;
  if (result.ageLimitText !== undefined) row.age_limit_text = result.ageLimitText;
  if (result.applicationFee !== undefined) row.application_fee = result.applicationFee;
  if (result.applicationFeeText !== undefined) row.application_fee_text = result.applicationFeeText;
  if (result.selectionProcess !== undefined) row.selection_process = result.selectionProcess;
  if (result.selectionProcessText !== undefined) row.selection_process_text = result.selectionProcessText;
  if (result.examPattern !== undefined) row.exam_pattern = result.examPattern;
  if (result.examPatternNotes !== undefined) row.exam_pattern_notes = result.examPatternNotes;
  if (result.documentsRequired !== undefined) row.documents_required = result.documentsRequired;
  if (result.eligibilityText !== undefined) row.eligibility_text = result.eligibilityText;
  if (result.importantLinks !== undefined) row.important_links = result.importantLinks;
  if (result.faqs !== undefined) row.faqs = result.faqs;
  if (result.conclusion !== undefined) row.conclusion = result.conclusion;
  if (result.additionalSections !== undefined) row.additional_sections = result.additionalSections;
  if (result.sectionOrder !== undefined) row.section_order = result.sectionOrder;
  if (result.sourceOrderKey !== undefined) row.source_order_key = result.sourceOrderKey;
  return row;
}


export function rowToAdmitCard(row: any): AdmitCardItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    organization: row.organization,
    category: row.category,
    examDate: row.exam_date,
    releaseDate: row.release_date,
    officialLink: row.official_link,
    sourceUrl: row.source_url,
    importantDatesText: row.important_dates_text ?? undefined,
    howToDownload: row.how_to_download ?? undefined,
    examDayInstructionsText: row.exam_day_instructions_text ?? undefined,
    examPattern: row.exam_pattern ?? undefined,
    examPatternNotes: row.exam_pattern_notes ?? undefined,
    totalVacancies: row.total_vacancies ?? undefined,
    vacancyBreakdown: row.vacancy_breakdown ?? undefined,
    postDetailsText: row.post_details_text ?? undefined,
    ageLimitByGrade: row.age_limit_by_grade ?? undefined,
    ageRelaxationBreakdown: row.age_relaxation_breakdown ?? undefined,
    ageLimitText: row.age_limit_text ?? undefined,
    applicationFee: row.application_fee ?? undefined,
    applicationFeeText: row.application_fee_text ?? undefined,
    selectionProcess: row.selection_process ?? undefined,
    selectionProcessText: row.selection_process_text ?? undefined,
    eligibilityText: row.eligibility_text ?? undefined,
    importantLinks: row.important_links ?? undefined,
    faqs: row.faqs ?? undefined,
    conclusion: row.conclusion ?? undefined,
    additionalSections: row.additional_sections ?? undefined,
    sectionOrder: row.section_order ?? undefined,
    sourceOrderKey: row.source_order_key ?? undefined,
  };
}

export function admitCardToRow(card: Partial<AdmitCardItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (card.slug !== undefined) row.slug = card.slug;
  if (card.title !== undefined) row.title = card.title;
  if (card.organization !== undefined) row.organization = card.organization;
  if (card.category !== undefined) row.category = card.category;
  if (card.examDate !== undefined) row.exam_date = card.examDate;
  if (card.releaseDate !== undefined) row.release_date = card.releaseDate;
  if (card.officialLink !== undefined) row.official_link = card.officialLink;
  if (card.sourceUrl !== undefined) row.source_url = card.sourceUrl;
  if (card.importantDatesText !== undefined) row.important_dates_text = card.importantDatesText;
  if (card.howToDownload !== undefined) row.how_to_download = card.howToDownload;
  if (card.examDayInstructionsText !== undefined) row.exam_day_instructions_text = card.examDayInstructionsText;
  if (card.examPattern !== undefined) row.exam_pattern = card.examPattern;
  if (card.examPatternNotes !== undefined) row.exam_pattern_notes = card.examPatternNotes;
  if (card.totalVacancies !== undefined) row.total_vacancies = card.totalVacancies;
  if (card.vacancyBreakdown !== undefined) row.vacancy_breakdown = card.vacancyBreakdown;
  if (card.postDetailsText !== undefined) row.post_details_text = card.postDetailsText;
  if (card.ageLimitByGrade !== undefined) row.age_limit_by_grade = card.ageLimitByGrade;
  if (card.ageRelaxationBreakdown !== undefined) row.age_relaxation_breakdown = card.ageRelaxationBreakdown;
  if (card.ageLimitText !== undefined) row.age_limit_text = card.ageLimitText;
  if (card.applicationFee !== undefined) row.application_fee = card.applicationFee;
  if (card.applicationFeeText !== undefined) row.application_fee_text = card.applicationFeeText;
  if (card.selectionProcess !== undefined) row.selection_process = card.selectionProcess;
  if (card.selectionProcessText !== undefined) row.selection_process_text = card.selectionProcessText;
  if (card.eligibilityText !== undefined) row.eligibility_text = card.eligibilityText;
  if (card.importantLinks !== undefined) row.important_links = card.importantLinks;
  if (card.faqs !== undefined) row.faqs = card.faqs;
  if (card.conclusion !== undefined) row.conclusion = card.conclusion;
  if (card.additionalSections !== undefined) row.additional_sections = card.additionalSections;
  if (card.sectionOrder !== undefined) row.section_order = card.sectionOrder;
  if (card.sourceOrderKey !== undefined) row.source_order_key = card.sourceOrderKey;
  return row;
}


export function rowToDraft(row: any): BotDraft {
  return {
    id: row.id,
    jobTitle: row.job_title,
    organization: row.organization,
    sourceUrl: row.source_url,
    detectedAt: row.detected_at,
    status: row.status,
    confidence: row.confidence,
    draftType: row.draft_type ?? "job",
    sourceOrderKey: row.source_order_key ?? undefined,
    extractedFields: row.extracted_fields ?? {},
  };
}

export function draftToRow(draft: Partial<BotDraft>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (draft.jobTitle !== undefined) row.job_title = draft.jobTitle;
  if (draft.organization !== undefined) row.organization = draft.organization;
  if (draft.sourceUrl !== undefined) row.source_url = draft.sourceUrl;
  if (draft.detectedAt !== undefined) row.detected_at = draft.detectedAt;
  if (draft.status !== undefined) row.status = draft.status;
  if (draft.confidence !== undefined) row.confidence = draft.confidence;
  if (draft.draftType !== undefined) row.draft_type = draft.draftType;
  if (draft.sourceOrderKey !== undefined) row.source_order_key = draft.sourceOrderKey;
  if (draft.extractedFields !== undefined) row.extracted_fields = draft.extractedFields;
  return row;
}


export function rowToLogEntry(row: any): BotLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    status: row.status,
    message: row.message,
  };
}