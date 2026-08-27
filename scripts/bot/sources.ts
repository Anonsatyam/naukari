export interface BotSource {
  name: string;
  url: string;
  orgHint: string;
}

// Only BPSC is active right now, on purpose — the goal is to get one
// source working end-to-end and verified (correct discovery, correct
// table/PDF extraction, correct drafts) before expanding back out to
// the rest. Nothing else runs until it's added back to SOURCES below.
export const SOURCES: BotSource[] = [
  {
    name: "BPSC",
    url: "https://bpsc.bihar.gov.in/",
    orgHint: "Bihar Public Service Commission (BPSC)",
  },
];

// Everything previously configured and verified, kept here rather than
// deleted so no research is lost. To bring any of these back: move the
// entry into SOURCES above (or do `export const SOURCES = [...SOURCES,
// ...OTHER_SOURCES]` to re-enable all of them at once).
//
// Verified against real web search on 2026-08-27: 12 URLs that were
// returning HTTP 404 have been corrected to their actual current paths
// (departments frequently use a non-obvious short code — e.g. Education
// is /educationbihar/, not /education/ — rather than a guessable one).
// Sports is now a fully separate department (split off in Jan 2024)
// with its own domain, not a state.bihar.gov.in path.
//
// Bihar Health Department's URL was spot-checked and confirmed already
// correct — its earlier "redirect" failures aren't a wrong-URL problem.
// The remaining sources that showed redirect issues in real bot runs
// (Animal & Fisheries, Environment/Forest, Building/Road Construction,
// Water Resources, PHED, Urban Development, Industries, Labour,
// Transport, Finance, Social Welfare, SC & ST Welfare) were left
// unchanged rather than guessed at without verification — given the
// Health Department pattern, they're likely also correct URLs hitting
// some other server-side behavior (e.g. a session/cookie gate) that a
// different URL wouldn't fix. Same for the sources that only fail
// intermittently (timeouts that succeed locally but not from GitHub
// Actions) — that's IP-range-based blocking, not a URL problem.
export const OTHER_SOURCES: BotSource[] = [
  {
    name: "Bihar Government Master Portal",
    url: "https://state.bihar.gov.in/",
    orgHint: "Government of Bihar",
  },
  {
    name: "BSSC",
    url: "https://bssc.bihar.gov.in/",
    orgHint: "Bihar Staff Selection Commission (BSSC)",
  },
  {
    name: "BTSC",
    url: "https://btsc.bihar.gov.in/",
    orgHint: "Bihar Technical Service Commission (BTSC)",
  },
  {
    name: "CSBC (Bihar Police)",
    url: "https://csbc.bihar.gov.in/",
    orgHint: "Central Selection Board of Constable (CSBC)",
  },
  {
    name: "BPSSC",
    url: "https://bpssc.bihar.gov.in/",
    orgHint: "Bihar Police Subordinate Services Commission (BPSSC)",
  },
  {
    name: "Bihar Education Department",
    url: "https://state.bihar.gov.in/educationbihar/",
    orgHint: "Bihar Education Department",
  },
  {
    name: "Bihar Health Department",
    url: "https://state.bihar.gov.in/health/",
    orgHint: "Bihar Health Department",
  },
  {
    name: "State Health Society Bihar",
    url: "https://shs.bihar.gov.in/",
    orgHint: "State Health Society Bihar",
  },
  {
    name: "BSEB",
    url: "https://secondary.biharboardonline.com/",
    orgHint: "Bihar School Examination Board (BSEB)",
  },
  {
    name: "Revenue & Land Reforms Department",
    url: "https://state.bihar.gov.in/lrc/",
    orgHint: "Revenue & Land Reforms Department",
  },
  {
    name: "Panchayati Raj Department",
    url: "https://state.bihar.gov.in/biharprd/",
    orgHint: "Panchayati Raj Department",
  },
  {
    name: "Rural Development Department",
    url: "https://state.bihar.gov.in/rdd/",
    orgHint: "Rural Development Department",
  },
  {
    name: "Agriculture Department",
    url: "https://state.bihar.gov.in/krishi/CitizenHome.html",
    orgHint: "Agriculture Department",
  },
  {
    name: "Animal & Fisheries Resources Department",
    url: "https://state.bihar.gov.in/ahd/",
    orgHint: "Animal & Fisheries Resources Department",
  },
  {
    name: "Environment, Forest & Climate Change Department",
    url: "https://state.bihar.gov.in/forest/",
    orgHint: "Environment, Forest & Climate Change Department",
  },
  {
    name: "Building Construction Department",
    url: "https://state.bihar.gov.in/bcd/",
    orgHint: "Building Construction Department",
  },
  {
    name: "Road Construction Department",
    url: "https://state.bihar.gov.in/rcd/",
    orgHint: "Road Construction Department",
  },
  {
    name: "Water Resources Department",
    url: "https://state.bihar.gov.in/wrd/",
    orgHint: "Water Resources Department",
  },
  {
    name: "Public Health Engineering Department",
    url: "https://state.bihar.gov.in/phed/",
    orgHint: "Public Health Engineering Department",
  },
  {
    name: "Urban Development & Housing Department",
    url: "https://state.bihar.gov.in/urban/",
    orgHint: "Urban Development & Housing Department",
  },
  {
    name: "Industries Department",
    url: "https://state.bihar.gov.in/industries/",
    orgHint: "Industries Department",
  },
  {
    name: "Labour Resources Department",
    url: "https://state.bihar.gov.in/labour/",
    orgHint: "Labour Resources Department",
  },
  {
    name: "Transport Department",
    url: "https://state.bihar.gov.in/transport/",
    orgHint: "Transport Department",
  },
  {
    name: "Finance Department",
    url: "https://state.bihar.gov.in/finance/",
    orgHint: "Finance Department",
  },
  {
    name: "Commercial Taxes Department",
    url: "https://state.bihar.gov.in/biharcommercialtax/",
    orgHint: "Commercial Taxes Department",
  },
  {
    name: "Mines & Geology Department",
    url: "https://state.bihar.gov.in/mines/",
    orgHint: "Mines & Geology Department",
  },
  {
    name: "Food & Consumer Protection Department",
    url: "https://state.bihar.gov.in/fcp/",
    orgHint: "Food & Consumer Protection Department",
  },
  {
    name: "Social Welfare Department",
    url: "https://state.bihar.gov.in/socialwelfare/",
    orgHint: "Social Welfare Department",
  },
  {
    name: "ICDS Bihar",
    url: "http://www.icdsbih.gov.in/",
    orgHint: "ICDS Bihar",
  },
  {
    name: "SC & ST Welfare Department",
    url: "https://state.bihar.gov.in/scstwelfare/",
    orgHint: "SC & ST Welfare Department",
  },
  {
    name: "BC & EBC Welfare Department",
    url: "https://state.bihar.gov.in/bcebcwelfare/",
    orgHint: "BC & EBC Welfare Department",
  },
  {
    name: "Minority Welfare Department",
    url: "https://state.bihar.gov.in/minoritywelfare/",
    orgHint: "Minority Welfare Department",
  },
  {
    name: "Tourism Department",
    url: "https://state.bihar.gov.in/bihartourism/",
    orgHint: "Tourism Department",
  },
  {
    name: "Art & Culture Department",
    url: "https://state.bihar.gov.in/yac/",
    orgHint: "Art, Culture & Youth Department",
  },
  {
    name: "Sports Department",
    url: "https://biharsportslive.bihar.gov.in/Default.aspx",
    orgHint: "Sports Department",
  },
  {
    name: "BELTRON",
    url: "https://bsedc.bihar.gov.in/",
    orgHint: "BELTRON",
  },
  {
    name: "BUIDCo",
    url: "https://buidco.in/",
    orgHint: "BUIDCo",
  },
  {
    name: "State Election Commission Bihar",
    url: "https://sec.bihar.gov.in/",
    orgHint: "State Election Commission Bihar",
  },
  {
    name: "Patna Municipal Corporation",
    url: "https://pmc.bihar.gov.in/",
    orgHint: "Patna Municipal Corporation",
  },
  {
    name: "Bihar State Board of Technical Education",
    url: "https://sbte.bihar.gov.in/",
    orgHint: "Bihar State Board of Technical Education",
  },
  {
    name: "Bihar Rojgar Setu / DET Bihar",
    url: "https://detjob.bihar.gov.in/",
    orgHint: "Bihar Rojgar Setu / DET Bihar",
  },
];