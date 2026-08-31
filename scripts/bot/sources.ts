export interface BotSource {
  name: string;
  url: string;
  orgHint: string;
}

export const SOURCES: BotSource[] = [
  {
    name: "Bihar Job Portal (biharjob.co.in)",
    url: "https://biharjob.co.in/",
    orgHint: "Unknown (see extracted organization)",
  },
];