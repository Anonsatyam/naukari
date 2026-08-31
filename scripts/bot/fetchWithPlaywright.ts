import { chromium, Browser } from "playwright";

const PLAYWRIGHT_TIMEOUT_MS = 30000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface PlaywrightFetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  html: string;
}

let sharedBrowser: Browser | null = null;

async function getSharedBrowser(): Promise<Browser> {
  if (!sharedBrowser) {
    sharedBrowser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage"],
    });
  }
  return sharedBrowser;
}

export async function closeSharedBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

export async function fetchPageWithPlaywright(url: string): Promise<PlaywrightFetchResult> {
  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PLAYWRIGHT_TIMEOUT_MS);

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: PLAYWRIGHT_TIMEOUT_MS,
    });

    if (!response) {
      throw new Error("No response received");
    }

    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

    return {
      ok: response.ok(),
      status: response.status(),
      finalUrl: page.url(),
      html: await page.content(),
    };
  } finally {
    await context.close();
  }
}