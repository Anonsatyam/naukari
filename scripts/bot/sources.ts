export interface BotSource {
  name: string;
  url: string;
  orgHint: string;
}

// Official Bihar government recruitment sources the bot checks on
// schedule. Sourced from a verified master list of official Bihar
// government department/organization websites (bihar.gov.in domains,
// not the older bih.nic.in ones some of these previously used).
//
// Not yet included: the 38 district administration portals and other
// boards/universities/PSUs mentioned in the source list, since specific
// URLs for those weren't provided — add them here the same way once
// you have the URLs.
export const SOURCES: BotSource[] = [
  {
    name: "Bihar Government Master Portal",
    url: "https://state.bihar.gov.in/main/CitizenHome.html",
    orgHint: "Government of Bihar",
  },
  {
    name: "BPSC",
    url: "https://bpsc.bihar.gov.in/",
    orgHint: "Bihar Public Service Commission (BPSC)",
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
    url: "https://state.bihar.gov.in/education/",
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
    url: "https://state.bihar.gov.in/revenue/",
    orgHint: "Revenue & Land Reforms Department",
  },
  {
    name: "Panchayati Raj Department",
    url: "https://state.bihar.gov.in/panchayati/",
    orgHint: "Panchayati Raj Department",
  },
  {
    name: "Rural Development Department",
    url: "https://state.bihar.gov.in/rural/",
    orgHint: "Rural Development Department",
  },
  {
    name: "Agriculture Department",
    url: "https://state.bihar.gov.in/agriculture/",
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
    url: "https://state.bihar.gov.in/commercialtax/",
    orgHint: "Commercial Taxes Department",
  },
  {
    name: "Mines & Geology Department",
    url: "https://state.bihar.gov.in/mines/",
    orgHint: "Mines & Geology Department",
  },
  {
    name: "Food & Consumer Protection Department",
    url: "https://state.bihar.gov.in/food/",
    orgHint: "Food & Consumer Protection Department",
  },
  {
    name: "Social Welfare Department",
    url: "https://state.bihar.gov.in/socialwelfare/",
    orgHint: "Social Welfare Department",
  },
  {
    name: "ICDS Bihar",
    url: "https://icdsbih.gov.in/",
    orgHint: "ICDS Bihar",
  },
  {
    name: "SC & ST Welfare Department",
    url: "https://state.bihar.gov.in/scstwelfare/",
    orgHint: "SC & ST Welfare Department",
  },
  {
    name: "BC & EBC Welfare Department",
    url: "https://state.bihar.gov.in/bcebcm/",
    orgHint: "BC & EBC Welfare Department",
  },
  {
    name: "Minority Welfare Department",
    url: "https://state.bihar.gov.in/minority/",
    orgHint: "Minority Welfare Department",
  },
  {
    name: "Tourism Department",
    url: "https://state.bihar.gov.in/tourism/",
    orgHint: "Tourism Department",
  },
  {
    name: "Art & Culture Department",
    url: "https://state.bihar.gov.in/artculture/",
    orgHint: "Art & Culture Department",
  },
  {
    name: "Sports Department",
    url: "https://state.bihar.gov.in/sports/",
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