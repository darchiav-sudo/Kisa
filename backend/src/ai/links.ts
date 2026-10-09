import { publicBaseUrl } from '../auth.js';

/**
 * Links shown to users must open the exact place and actually work. The model only names a
 * share target; the deep link itself is built here, and every web URL is checked before use.
 */

export const SHARE_TARGETS = ['whatsapp', 'telegram', 'sms', 'email', 'facebook'] as const;
export type ShareTarget = (typeof SHARE_TARGETS)[number];

const SHARE_LABEL: Record<ShareTarget, string> = {
  whatsapp: 'Send on WhatsApp',
  telegram: 'Send on Telegram',
  sms: 'Send as SMS',
  email: 'Send by email',
  facebook: 'Share on Facebook',
};

const enc = encodeURIComponent;

/** A one-tap deep link that opens the app with the message already filled in. */
export function shareLink(target: ShareTarget, text: string, siteUrl?: string) {
  switch (target) {
    case 'whatsapp':
      return `https://wa.me/?text=${enc(text)}`;
    case 'telegram': {
      const body = siteUrl ? text.replace(siteUrl, '').trim() : text;
      return `https://t.me/share/url?url=${enc(siteUrl ?? '')}&text=${enc(body)}`;
    }
    case 'sms':
      return `sms:?&body=${enc(text)}`;
    case 'email':
      return `mailto:?body=${enc(text)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${enc(siteUrl ?? '')}`;
  }
}

export function shareLabel(target: ShareTarget) {
  return SHARE_LABEL[target];
}

export function mapsLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${enc(query)}`;
}

/** Hosts whose links we build ourselves or that always block bots; no need to fetch them. */
const TRUSTED = /^https:\/\/(wa\.me|t\.me\/share|www\.google\.com\/maps|www\.facebook\.com\/sharer|www\.facebook\.com\/marketplace)/i;

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

async function check(url: string, timeoutMs: number): Promise<boolean> {
  // Our own business sites: fetching them would count as a visit.
  if (!/^https?:\/\//i.test(url) || TRUSTED.test(url) || url.startsWith(publicBaseUrl())) return true;
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
    });
    // Login walls and anti-bot answers mean the page exists.
    if ([401, 403, 405, 429, 999].includes(res.status)) return true;
    if (!res.ok) return false;
    // t.me answers 200 even for channels that don't exist.
    if (/^https?:\/\/(t|telegram)\.me\/[^/]+\/?$/i.test(url)) {
      const html = await res.text();
      return html.includes('tgme_page_title');
    }
    return true;
  } catch {
    return false;
  }
}

/** Returns the subset of `urls` that are broken (404, dead domain, timeout, missing channel). */
export async function brokenLinks(urls: (string | undefined)[], timeoutMs = 6000) {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  const results = await Promise.all(unique.map(async (u) => [u, await check(u, timeoutMs)] as const));
  const broken = new Set(results.filter(([, ok]) => !ok).map(([u]) => u));
  if (broken.size) console.log(`[links] dropped ${broken.size}/${unique.length}:`, [...broken].join(' '));
  return broken;
}
