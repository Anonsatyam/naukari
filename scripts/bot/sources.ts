export interface BotSource {
  name: string;
  url: string;
  orgHint: string;
}

// Only biharjob.co.in runs now, on purpose — every other source (BPSC,
// BSSC, BTSC, CSBC, BPSSC, and the full state.bihar.gov.in department
// list) has been removed from SOURCES per request. Nothing else is
// crawled until a new entry is added here.
//
// orgHint is deliberately generic: unlike a single-issuer site (BPSC,
// BSSC, ...), biharjob.co.in is an aggregator — each post is issued by
// a different organization (a railway zone, BSEB, CBSE, a bank, etc.).
// The real per-post organization is read straight off the page by
// extractHtmlNotificationFields() and takes priority over this
// fallback wherever it's actually found (see run.ts wiring).
export const SOURCES: BotSource[] = [
  {
    name: "Bihar Job Portal (sarkariresult.com)",
    url: "https://sarkariresult.com/",
    orgHint: "Unknown (see extracted organization)",
  },
];