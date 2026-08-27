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

/**
 * One shared Chromium instance for the whole bot run, reused across
 * every Playwright-fetched page rather than launching a fresh browser
 * per page — that would be far slower and heavier than it needs to be.
 * Lazily launched: if no source in this run needs Playwright, this
 * never gets called at all.
 */
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

/**
 * Fetches a page using a real headless browser instead of a raw HTTP
 * request. This exists specifically for the hypothesis that certain
 * sources' redirect loops are caused by cookie/session handling a
 * plain HTTP client doesn't do — see the "shouldUsePlaywright" check
 * in run.ts for exactly which sources this applies to. It's
 * meaningfully slower and heavier than the normal fetch path, so it's
 * deliberately not the default for every source.
 */
export async function fetchPageWithPlaywright(url: string): Promise<PlaywrightFetchResult> {
  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    // Same certificate tolerance as fetchInsecure.ts, and for the same
    // reason — several of these government sites have known broken
    // TLS chains. See the comment there for the full reasoning.
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

    // Give any post-load redirects/scripts a moment to settle, but
    // don't fail the whole fetch if the page never goes fully idle —
    // some sites keep background polling running indefinitely.
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