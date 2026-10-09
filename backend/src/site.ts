import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';

import { draftLeadReply, type Kit } from './ai/business.js';
import { withAiContext } from './ai/usage.js';
import { publicBaseUrl, type AppEnv } from './auth.js';
import { businessPayment, telegramBot } from './channels.js';
import { getSql } from './db/client.js';
import { sendPush } from './push.js';

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(price: number, currency: string) {
  return currency === 'GEL' ? `${price}₾` : `$${price}`;
}

function layout(title: string, lang: string, body: string) {
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:radial-gradient(120% 60% at 50% 0%,#0f1d3d 0%,#05070d 60%) fixed;color:#f5f7ff}
  main{max-width:560px;margin:0 auto;padding:28px 20px 48px}
  .brand{font-weight:900;letter-spacing:.5px;font-size:15px;color:#7aa8ff}
  h1{font-size:30px;line-height:1.15;margin:14px 0 8px}
  .sub{color:#c0cad6;font-size:16px;line-height:1.5;margin:0 0 18px}
  .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:18px;margin:14px 0}
  .price{font-size:34px;font-weight:900;color:#ffd36d}
  .unit{color:#9ca9b8;font-size:14px}
  ul{padding-left:20px;margin:10px 0;line-height:1.7}
  label{display:block;font-size:13px;font-weight:700;color:#9ca9b8;margin:12px 0 6px}
  input,textarea{width:100%;padding:13px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:#0b1020;color:#fff;font-size:16px}
  textarea{min-height:96px}
  button{margin-top:16px;width:100%;padding:15px;border:0;border-radius:999px;background:linear-gradient(135deg,#5b8cff,#3a5bff);color:#fff;box-shadow:0 8px 28px rgba(76,141,255,.45);font-size:17px;font-weight:900}
  .hp{position:absolute;left:-9999px}
  .tg{display:block;text-align:center;padding:14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);color:#fff;text-decoration:none;font-weight:800;font-size:16px;background:rgba(42,171,238,.16)}
  footer{color:#64748b;font-size:12px;text-align:center;margin-top:28px}
</style>
</head>
<body><main>${body}<footer>Made with Kisa</footer></main></body>
</html>`;
}

async function loadBySlug(slug: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, user_id, slug, kit, idea->>'currency' AS currency FROM businesses
    WHERE slug = ${slug} AND status = 'active'
  `;
  return rows[0] as { id: string; user_id: string; slug: string; kit: Kit; currency: string } | undefined;
}

/** Link previews (WhatsApp, Telegram, Facebook…) and crawlers are not people. */
const NOT_A_PERSON =
  /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|skype|curl|wget|python|node|headless|lighthouse/i;

function countVisit(businessId: string, userAgent: string | undefined) {
  if (!userAgent || NOT_A_PERSON.test(userAgent)) return;
  const sql = getSql();
  void sql`
    INSERT INTO site_visits (business_id, day, views) VALUES (${businessId}, CURRENT_DATE, 1)
    ON CONFLICT (business_id, day) DO UPDATE SET views = site_visits.views + 1
  `.catch((e) => console.error('visit count failed', e));
}

/** Push the owner right away and have the reply ready before they open it. */
async function onNewLead(
  biz: { id: string; user_id: string; slug: string; kit: Kit },
  lead: { id: string; name: string; contact: string; message: string },
) {
  await sendPush(biz.user_id, {
    title: `🛍️ New order · ${biz.kit.name}`,
    body: `${lead.name}: ${lead.message || lead.contact}`.slice(0, 140),
    data: { url: `/business/lead/${lead.id}` },
  });
  try {
    const text = await withAiContext({ source: 'site-order', userId: biz.user_id, businessId: biz.id }, async () =>
      draftLeadReply({
        kit: biz.kit,
        siteUrl: `${publicBaseUrl()}/b/${biz.slug}`,
        lead: { name: lead.name, contact: lead.contact, message: lead.message },
        payment: await businessPayment(biz.id),
      }),
    );
    const sql = getSql();
    await sql`UPDATE business_leads SET reply_draft = ${text} WHERE id = ${lead.id} AND reply_draft IS NULL`;
  } catch (e) {
    console.error('pre-draft failed', e);
  }
}

export function registerSiteRoutes(app: Hono<AppEnv>) {
  app.get('/b/:slug', async (c) => {
    const biz = await loadBySlug(c.req.param('slug'));
    if (!biz) return c.html(layout('Not found', 'en', '<h1>This page is not available.</h1>'), 404);
    countVisit(biz.id, c.req.header('User-Agent'));
    const { kit } = biz;
    const w = kit.website;
    return c.html(
      layout(
        kit.name,
        w.language,
        `<div class="brand">${esc(kit.emoji)} ${esc(kit.name)}</div>
<h1>${esc(w.headline)}</h1>
<p class="sub">${esc(w.subheadline)}</p>
<div class="card">
  <div class="price">${esc(formatPrice(kit.offer.price, biz.currency))} <span class="unit">${esc(kit.offer.unit)}</span></div>
  <strong>${esc(kit.offer.title)}</strong>
  <ul>${[...w.bullets, ...kit.offer.includes].slice(0, 7).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
</div>
<form class="card" method="post" action="/b/${esc(c.req.param('slug'))}/order">
  <strong>${esc(w.cta)}</strong>
  <label for="name">${esc(w.form.name)}</label>
  <input id="name" name="name" required maxlength="80" autocomplete="name">
  <label for="contact">${esc(w.form.contact)}</label>
  <input id="contact" name="contact" required maxlength="120" autocomplete="tel">
  <label for="message">${esc(w.form.message)}</label>
  <textarea id="message" name="message" maxlength="1000"></textarea>
  <input class="hp" name="website" tabindex="-1" autocomplete="off">
  <button type="submit">${esc(w.form.submit)}</button>
</form>${
          telegramBot()
            ? `\n<a class="tg" href="https://t.me/${esc(telegramBot())}?start=b_${esc(biz.slug)}">✈️ Telegram</a>`
            : ''
        }`,
      ),
    );
  });

  app.post('/b/:slug/order', async (c) => {
    const biz = await loadBySlug(c.req.param('slug'));
    if (!biz) return c.html(layout('Not found', 'en', '<h1>This page is not available.</h1>'), 404);
    const form = await c.req.parseBody();
    const field = (key: string, max: number) => String(form[key] ?? '').trim().slice(0, max);
    const name = field('name', 80);
    const contact = field('contact', 120);
    const message = field('message', 1000);

    if (!field('website', 10) && name && contact) {
      const sql = getSql();
      const leadId = `lead_${randomUUID().slice(0, 12)}`;
      await sql`
        INSERT INTO business_leads (id, business_id, name, contact, message)
        VALUES (${leadId}, ${biz.id}, ${name}, ${contact}, ${message})
      `;
      void onNewLead(biz, { id: leadId, name, contact, message });
    }
    const w = biz.kit.website;
    return c.html(
      layout(
        biz.kit.name,
        w.language,
        `<div class="brand">${esc(biz.kit.emoji)} ${esc(biz.kit.name)}</div>
<h1>✅</h1><p class="sub">${esc(w.form.thanks)}</p>`,
      ),
    );
  });
}
