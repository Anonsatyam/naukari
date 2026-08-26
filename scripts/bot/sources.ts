export interface BotSource {
  name: string;
  url: string;
  orgHint: string;
}

// Official Bihar recruitment sources the bot checks on schedule.
// Add more here as needed — nothing else in the bot needs to change.
export const SOURCES: BotSource[] = [
  {
    name: "CSBC (Bihar Police)",
    url: "https://csbc.bih.nic.in",
    orgHint: "Central Selection Board of Constable (CSBC)",
  },
  {
    name: "BPSC",
    url: "https://bpsc.bih.nic.in",
    orgHint: "Bihar Public Service Commission (BPSC)",
  },
  {
    name: "BSSC",
    url: "https://bssc.bih.nic.in",
    orgHint: "Bihar Staff Selection Commission (BSSC)",
  },
  {
    name: "BTSC",
    url: "https://btsc.bih.nic.in",
    orgHint: "Bihar Technical Service Commission (BTSC)",
  },
];
