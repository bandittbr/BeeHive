/**
 * Shared utility: find a Chromium executable path.
 * Priority: PUPPETEER_EXECUTABLE_PATH env → Playwright chromium → puppeteer bundled
 */

import { execSync } from 'node:child_process';

let _cachedPath: string | null = null;

/**
 * Resolve a Chrome/Chromium executable path.
 * Caches the result after first successful lookup.
 */
export async function resolveChromiumPath(): Promise<string | null> {
  if (_cachedPath) return _cachedPath;

  // 1) Environment variable override
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    _cachedPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    console.log(`[chromium] Using PUPPETEER_EXECUTABLE_PATH: ${_cachedPath}`);
    return _cachedPath;
  }

  // 2) Try Playwright's chromium (most reliable on Railway)
  try {
    const pw = await import('playwright');
    const path = pw.chromium.executablePath();
    if (path) {
      _cachedPath = path;
      console.log(`[chromium] Using Playwright chromium path: ${_cachedPath}`);
      return _cachedPath;
    }
  } catch {
    // Playwright not installed
  }

  // 3) Try to find Puppeteer's bundled Chrome
  try {
    const puppeteer = await import('puppeteer');
    if (typeof (puppeteer as any).executablePath === 'function') {
      const path = (puppeteer as any).executablePath();
      if (path) {
        _cachedPath = path;
        console.log(`[chromium] Using Puppeteer bundled Chrome: ${_cachedPath}`);
        return _cachedPath;
      }
    }
  } catch {
    // Puppeteer not available
  }

  // 4) Try common Linux paths
  const commonPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];

  for (const p of commonPaths) {
    try {
      execSync(`test -f ${p}`, { stdio: 'ignore' });
      _cachedPath = p;
      console.log(`[chromium] Found system Chrome: ${_cachedPath}`);
      return _cachedPath;
    } catch {
      // not found
    }
  }

  console.warn('[chromium] No Chromium executable found!');
  return null;
}
