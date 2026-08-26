import https from "https";
import http from "http";
import { URL } from "url";

export interface InsecureFetchResult {
  ok: boolean;
  status: number;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  text: () => Promise<string>;
}

/**
 * A minimal HTTPS/HTTP GET that ignores certificate errors, built on
 * Node's own core http/https modules only — deliberately not the
 * standalone `undici` npm package, which crashed with an internal
 * version-mismatch error against Node's bundled webidl internals
 * (TypeError: webidl.util.markAsUncloneable is not a function). Core
 * Node modules have a far more stable API surface across versions, so
 * this is the more robust choice for something that has to keep working
 * unattended on a schedule.
 *
 * Certificate validation is intentionally relaxed here — see the
 * comment on why in run.ts, next to where this is used.
 */
export function fetchInsecure(
  url: string,
  options: { headers?: Record<string, string>; timeoutMs?: number; maxRedirects?: number } = {}
): Promise<InsecureFetchResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    function doRequest(currentUrl: string, redirectsLeft: number) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch (err) {
        reject(err);
        return;
      }

      const lib = parsed.protocol === "https:" ? https : http;

      const req = lib.get(
        currentUrl,
        {
          headers: options.headers,
          rejectUnauthorized: false,
          timeout: timeoutMs,
        },
        (res) => {
          const status = res.statusCode ?? 0;

          if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
            res.resume(); // discard this response's body, we're following the redirect
            let nextUrl: string;
            try {
              nextUrl = new URL(res.headers.location, currentUrl).toString();
            } catch (err) {
              reject(err);
              return;
            }
            doRequest(nextUrl, redirectsLeft - 1);
            return;
          }

          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            resolve({
              ok: status >= 200 && status < 300,
              status,
              url: currentUrl,
              headers: res.headers,
              text: async () => Buffer.concat(chunks).toString("utf-8"),
            });
          });
          res.on("error", (err) => reject(err));
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });
      req.on("error", (err) => reject(err));
    }

    doRequest(url, maxRedirects);
  });
}
