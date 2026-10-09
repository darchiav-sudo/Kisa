import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Hono } from 'hono';
import { z } from 'zod';

import { draftLeadReply, type ChatTurn, type Kit, type Payment } from './ai/business.js';
import { withAiContext } from './ai/usage.js';
import { logAgent } from './autopilot.js';
import { publicBaseUrl, type AppEnv } from './auth.js';
import { businessView, ownedBusiness, siteUrl } from './business.js';
import { getSql } from './db/client.js';
import { sendPush } from './push.js';

/*
 * Customer conversations outside the website. Telegram first: one shared Kisa bot serves every business.
 * Customers reach a business through t.me/<bot>?start=b_<slug>; owners can also link their own channel.
 */

const token = () => process.env.TELEGRAM_BOT_TOKEN;
let botUsername: string | null = null;

export function telegramBot() {
  return botUsername;
}

async function tg<T = unknown>(method: string, body: object): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description ?? res.status}`);
  return json.result;
}

function webhookSecret() {
  return createHash('sha256').update(`kisa-telegram|${token()}`).digest('hex').slice(0, 48);
}

export async function startTelegram() {
  if (!token()) return;
  try {
    const me = await tg<{ username: string }>('getMe', {});
    botUsername = me.username;
    await tg('setWebhook', {
      url: `${publicBaseUrl()}/telegram/webhook`,
      secret_token: webhookSecret(),
      allowed_updates: ['message', 'channel_post'],
    });
    console.log(`[telegram] @${botUsername} ready`);
  } catch (e) {
    console.error('[telegram] setup failed', (e as Error).message);
  }
}

type BizRow = {
  id: string;
  user_id: string;
  slug: string;
  kit: Kit;
  currency: string;
  payment: Payment | null;
  auto_reply: boolean;
};

async function loadBusiness(where: { id?: string; slug?: string }) {
  const sql = getSql();
  const rows = where.id
    ? await sql`SELECT id, user_id, slug, kit, idea->>'currency' AS currency, payment, auto_reply FROM businesses WHERE id = ${where.id} AND status = 'active'`
    : await sql`SELECT id, user_id, slug, kit, idea->>'currency' AS currency, payment, auto_reply FROM businesses WHERE slug = ${where.slug ?? ''} AND status = 'active'`;
  return rows[0] as BizRow | undefined;
}

export async function leadConversation(leadId: string): Promise<ChatTurn[]> {
  const sql = getSql();
  const rows = await sql`SELECT direction, text FROM lead_messages WHERE lead_id = ${leadId} ORDER BY created_at DESC LIMIT 12`;
  return rows.reverse().map((m) => ({ from: m.direction === 'in' ? ('customer' as const) : ('you' as const), text: m.text }));
}

export async function businessPayment(businessId: string) {
  const sql = getSql();
  const [row] = await sql`SELECT payment FROM businesses WHERE id = ${businessId}`;
  return (row?.payment as Payment | null) ?? null;
}

async function sendToLead(lead: { id: string; channel_ref: string }, text: string) {
  const sent = await tg<{ message_id: number }>('sendMessage', { chat_id: lead.channel_ref, text });
  const sql = getSql();
  await sql.transaction([
    sql`INSERT INTO lead_messages (lead_id, direction, text, tg_message_id) VALUES (${lead.id}, 'out', ${text}, ${sent.message_id})`,
    sql`UPDATE business_leads SET status = 'replied', status_at = NOW(), reply_draft = NULL, followup_draft = NULL WHERE id = ${lead.id}`,
  ]);
}

function price(biz: BizRow) {
  return biz.currency === 'GEL' ? `${biz.kit.offer.price}₾` : `$${biz.kit.offer.price}`;
}

/** A customer wrote to the bot: thread it into a lead, then reply or hand the owner a ready draft. */
async function onCustomerMessage(chatId: string, from: { name: string; handle?: string }, text: string) {
  const sql = getSql();
  const [chat] = await sql`SELECT business_id FROM telegram_chats WHERE chat_id = ${chatId}`;
  const biz = chat ? await loadBusiness({ id: chat.business_id }) : undefined;
  if (!biz) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: 'Hi! Open the business page you came from and tap “Message on Telegram” — then I’ll connect you to the seller.',
    });
    return;
  }

  const [open] = await sql`
    SELECT id FROM business_leads
    WHERE business_id = ${biz.id} AND channel = 'telegram' AND channel_ref = ${chatId}
      AND status IN ('new', 'replied') AND created_at > NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC LIMIT 1
  `;
  const leadId = (open?.id as string | undefined) ?? `lead_${randomUUID().slice(0, 12)}`;
  if (open) {
    await sql`UPDATE business_leads SET status = 'new', status_at = NOW(), nudged_at = NULL, followup_draft = NULL WHERE id = ${leadId}`;
  } else {
    await sql`
      INSERT INTO business_leads (id, business_id, name, contact, message, channel, channel_ref)
      VALUES (${leadId}, ${biz.id}, ${from.name.slice(0, 80)}, ${from.handle ? `Telegram ${from.handle}` : 'Telegram'},
              ${text.slice(0, 1000)}, 'telegram', ${chatId})
    `;
  }
  await sql`INSERT INTO lead_messages (lead_id, direction, text) VALUES (${leadId}, 'in', ${text.slice(0, 2000)})`;

  // A chatty or abusive customer shouldn't turn into a stream of AI calls.
  const [burst] = await sql`
    SELECT COUNT(*) AS n FROM lead_messages WHERE lead_id = ${leadId} AND direction = 'in' AND created_at > NOW() - INTERVAL '1 hour'
  `;
  let draft: string | null = null;
  if (Number(burst.n) <= 15) {
    try {
      draft = await withAiContext({ source: 'telegram', userId: biz.user_id, businessId: biz.id }, async () =>
        draftLeadReply({
          kit: biz.kit,
          siteUrl: siteUrl(biz.slug),
          lead: { name: from.name, contact: from.handle ?? 'Telegram', message: text },
          conversation: await leadConversation(leadId),
          payment: biz.payment,
        }),
      );
    } catch (e) {
      console.error('[telegram] draft failed', e);
    }
  }

  if (draft && biz.auto_reply) {
    await sendToLead({ id: leadId, channel_ref: chatId }, draft);
    await logAgent(biz.id, 'reply', `Answered ${from.name} on Telegram`, `They: ${text}\nKisa: ${draft}`);
    await sendPush(biz.user_id, {
      title: `🐾 Kisa answered ${from.name}`,
      body: draft.slice(0, 140),
      data: { url: `/business/lead/${leadId}` },
    });
    return;
  }
  if (draft) await sql`UPDATE business_leads SET reply_draft = ${draft} WHERE id = ${leadId}`;
  await sendPush(biz.user_id, {
    title: `💬 ${from.name} · ${biz.kit.name}`,
    body: `${text.slice(0, 100)}${draft ? ' — reply ready, one tap to send' : ''}`,
    data: { url: `/business/lead/${leadId}` },
  });
}

async function onStart(chatId: string, payload: string | undefined) {
  const sql = getSql();
  const slug = payload?.startsWith('b_') ? payload.slice(2) : undefined;
  const biz = slug ? await loadBusiness({ slug }) : undefined;
  if (!biz) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: 'Hi, I’m Kisa 🐾 I connect customers with small businesses. Open a business page and tap “Message on Telegram”.',
    });
    return;
  }
  await sql`
    INSERT INTO telegram_chats (chat_id, business_id) VALUES (${chatId}, ${biz.id})
    ON CONFLICT (chat_id) DO UPDATE SET business_id = EXCLUDED.business_id, updated_at = NOW()
  `;
  const { kit } = biz;
  await tg('sendMessage', {
    chat_id: chatId,
    text: `${kit.emoji} ${kit.name}\n${kit.offer.title} — ${price(biz)} ${kit.offer.unit}\n\n${kit.website.form.message}`,
  });
}

/** The owner posted their one-time code in a channel where the bot is admin: link that channel. */
async function onChannelPost(post: { chat: { id: number; title?: string; username?: string }; message_id: number; text?: string }) {
  const code = post.text?.match(/kisa-[a-z0-9]{6}/i)?.[0].toLowerCase();
  if (!code) return;
  const sql = getSql();
  const channel = { id: String(post.chat.id), title: post.chat.title ?? 'Telegram channel', username: post.chat.username };
  const [biz] = await sql`
    UPDATE businesses SET telegram_channel = ${JSON.stringify(channel)}::jsonb, telegram_code = NULL
    WHERE telegram_code = ${code} RETURNING id, user_id
  `;
  if (!biz) return;
  await tg('deleteMessage', { chat_id: post.chat.id, message_id: post.message_id }).catch(() => undefined);
  await logAgent(biz.id, 'connect', `Connected Telegram channel “${channel.title}”`);
  await sendPush(biz.user_id, {
    title: '✅ Telegram channel connected',
    body: `Kisa can now post to “${channel.title}” for you.`,
    data: { url: '/business/connections' },
  });
}

type TgUpdate = {
  message?: {
    chat: { id: number; type: string };
    from?: { first_name?: string; last_name?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: unknown;
  };
  channel_post?: { chat: { id: number; title?: string; username?: string }; message_id: number; text?: string };
};

async function handleUpdate(update: TgUpdate) {
  if (update.channel_post) return onChannelPost(update.channel_post);
  const m = update.message;
  if (!m || m.chat.type !== 'private') return;
  const chatId = String(m.chat.id);
  const text = (m.text ?? m.caption ?? (m.photo ? '[sent a photo]' : '')).trim();
  if (!text) return;
  if (text.startsWith('/start')) return onStart(chatId, text.split(/\s+/)[1]);
  const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || 'Telegram customer';
  return onCustomerMessage(chatId, { name, handle: m.from?.username ? `@${m.from.username}` : undefined }, text);
}

const PaymentInput = z
  .object({
    link: z.string().trim().max(300).url().optional().or(z.literal('').transform(() => undefined)),
    details: z.string().trim().max(500).optional(),
  })
  .nullable();

export function registerChannelRoutes(app: Hono<AppEnv>) {
  app.post('/telegram/webhook', async (c) => {
    if (!token() || c.req.header('X-Telegram-Bot-Api-Secret-Token') !== webhookSecret()) return c.text('no', 401);
    const update = (await c.req.json()) as TgUpdate;
    void handleUpdate(update).catch((e) => console.error('[telegram] update failed', e));
    return c.text('ok');
  });

  app.get('/v1/businesses/:id/leads/:leadId/messages', async (c) => {
    const biz = await ownedBusiness(c.req.param('id'), c.get('userId'));
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const sql = getSql();
    const rows = await sql`
      SELECT m.id, m.direction, m.text, m.created_at,
        (m.tg_message_id IS NOT NULL AND m.created_at > NOW() - INTERVAL '47 hours') AS can_delete
      FROM lead_messages m
      JOIN business_leads l ON l.id = m.lead_id
      WHERE m.lead_id = ${c.req.param('leadId')} AND l.business_id = ${biz.id}
      ORDER BY m.created_at ASC LIMIT 100
    `;
    return c.json({
      messages: rows.map((m) => ({
        id: String(m.id),
        direction: m.direction,
        text: m.text,
        createdAt: new Date(m.created_at).toISOString(),
        canDelete: m.can_delete,
      })),
    });
  });

  /** Telegram lets a bot delete its own messages for everyone within 48 hours. */
  app.delete('/v1/businesses/:id/leads/:leadId/messages/:messageId', async (c) => {
    const biz = await ownedBusiness(c.req.param('id'), c.get('userId'));
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    if (!/^\d+$/.test(c.req.param('messageId'))) return c.json({ error: 'Message not found' }, 404);
    const sql = getSql();
    const [m] = await sql`
      SELECT m.id, m.tg_message_id, l.channel_ref FROM lead_messages m
      JOIN business_leads l ON l.id = m.lead_id
      WHERE m.id = ${c.req.param('messageId')} AND m.lead_id = ${c.req.param('leadId')} AND l.business_id = ${biz.id}
        AND m.direction = 'out' AND m.tg_message_id IS NOT NULL AND m.created_at > NOW() - INTERVAL '47 hours'
    `;
    if (!m) return c.json({ error: 'This message can’t be deleted anymore.' }, 400);
    try {
      await tg('deleteMessage', { chat_id: m.channel_ref, message_id: Number(m.tg_message_id) });
    } catch (e) {
      return c.json({ error: `Telegram said no: ${(e as Error).message}` }, 502);
    }
    await sql`DELETE FROM lead_messages WHERE id = ${m.id}`;
    return c.json({ ok: true });
  });

  /** Owner approved a reply: Kisa delivers it through the channel the customer used. */
  app.post('/v1/businesses/:id/leads/:leadId/send', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const { text } = z.object({ text: z.string().trim().min(1).max(4000) }).parse(await c.req.json());
    const sql = getSql();
    const [lead] = await sql`
      SELECT id, channel, channel_ref FROM business_leads WHERE id = ${c.req.param('leadId')} AND business_id = ${biz.id}
    `;
    if (!lead) return c.json({ error: 'Order not found' }, 404);
    if (lead.channel !== 'telegram' || !lead.channel_ref || !token()) {
      return c.json({ error: 'This customer can only be reached from your phone.' }, 400);
    }
    await sendToLead({ id: lead.id, channel_ref: lead.channel_ref }, text);
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.patch('/v1/businesses/:id/settings', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const body = z.object({ autoReply: z.boolean().optional(), payment: PaymentInput.optional() }).parse(await c.req.json());
    const sql = getSql();
    if (body.autoReply !== undefined) await sql`UPDATE businesses SET auto_reply = ${body.autoReply} WHERE id = ${biz.id}`;
    if (body.payment !== undefined) {
      const payment = body.payment && (body.payment.link || body.payment.details) ? body.payment : null;
      await sql`UPDATE businesses SET payment = ${payment ? JSON.stringify(payment) : null}::jsonb WHERE id = ${biz.id}`;
    }
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.post('/v1/businesses/:id/telegram/code', async (c) => {
    const biz = await ownedBusiness(c.req.param('id'), c.get('userId'));
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    if (!botUsername) return c.json({ error: 'Telegram isn’t switched on yet.' }, 503);
    const code = `kisa-${randomBytes(3).toString('hex')}`;
    const sql = getSql();
    await sql`UPDATE businesses SET telegram_code = ${code} WHERE id = ${biz.id}`;
    return c.json({ code, bot: botUsername });
  });

  app.delete('/v1/businesses/:id/telegram/channel', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const sql = getSql();
    await sql`UPDATE businesses SET telegram_channel = NULL WHERE id = ${biz.id}`;
    return c.json({ business: await businessView(biz.id, uid) });
  });

  app.post('/v1/businesses/:id/telegram/post', async (c) => {
    const uid = c.get('userId');
    const biz = await ownedBusiness(c.req.param('id'), uid);
    if (!biz) return c.json({ error: 'Business not found' }, 404);
    const { text } = z.object({ text: z.string().trim().min(1).max(4000) }).parse(await c.req.json());
    const sql = getSql();
    const [row] = await sql`SELECT telegram_channel FROM businesses WHERE id = ${biz.id}`;
    const channel = row?.telegram_channel as { id: string; title: string } | null;
    if (!channel || !token()) return c.json({ error: 'Connect your Telegram channel first.' }, 400);
    try {
      await tg('sendMessage', { chat_id: channel.id, text });
    } catch (e) {
      return c.json({ error: `Telegram said no: ${(e as Error).message}. Is Kisa still an admin of the channel?` }, 502);
    }
    await logAgent(biz.id, 'post', `Posted to “${channel.title}”`, text.slice(0, 500));
    return c.json({ ok: true });
  });
}
