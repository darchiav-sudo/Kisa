import type {
  Business,
  BusinessSummary,
  Gap,
  Idea,
  Intake,
  LeadMessage,
  LeadStatus,
  MoneyEntry,
  Payment,
  SavedIdea,
  TaskStatus,
} from '@/src/models/types';
import { apiFetch } from '@/src/lib/api';
import { useAppStore } from '@/src/store/useAppStore';

type BusinessResponse = { business: Business | null };

function store(res: BusinessResponse) {
  useAppStore.getState().setBusiness(res.business);
  return res.business;
}

export type IdeaMode = 'hands-on' | 'hands-off';

export async function findIdea(intake: Intake, exclude: string[], mode: IdeaMode = 'hands-on') {
  const { idea } = await apiFetch<{ idea: Idea }>('/v1/ideas/find', {
    method: 'POST',
    json: { intake, exclude, mode },
  });
  return idea;
}

export async function huntGaps(intake: Intake, refresh = false) {
  return apiFetch<{ gaps: Gap[]; huntedAt: string }>('/v1/gaps', { method: 'POST', json: { intake, refresh } });
}

export async function gapToIdea(intake: Intake, gap: Gap) {
  const { fit: _fit, whyYou: _why, demand: _d, competition: _c, ...input } = gap;
  const { idea } = await apiFetch<{ idea: Idea }>('/v1/gaps/idea', { method: 'POST', json: { intake, gap: input } });
  return idea;
}

export async function createBusiness(intake: Intake, idea: Idea) {
  return store(
    await apiFetch<BusinessResponse>('/v1/businesses', { method: 'POST', json: { intake, idea } }),
  );
}

export async function refreshBusiness() {
  return store(await apiFetch<BusinessResponse>('/v1/businesses/current'));
}

export async function setTaskStatus(businessId: string, taskId: string, status: TaskStatus) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/tasks/${taskId}`, {
      method: 'PATCH',
      json: { status },
    }),
  );
}

export async function checkIn(
  businessId: string,
  input: { events: string[]; earned?: number; spent?: number; note?: string },
) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/checkins`, {
      method: 'POST',
      json: input,
    }),
  );
}

export async function setLeadStatus(businessId: string, leadId: string, status: LeadStatus) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/leads/${leadId}`, {
      method: 'PATCH',
      json: { status },
    }),
  );
}

export async function addMoney(businessId: string, input: { kind: 'income' | 'expense'; amount: number; label?: string }) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/money`, { method: 'POST', json: input }),
  );
}

export async function moneyEntries(businessId: string) {
  const { entries } = await apiFetch<{ entries: MoneyEntry[] }>(`/v1/businesses/${businessId}/money`);
  return entries;
}

export async function updateMoney(
  businessId: string,
  entryId: string,
  patch: { kind?: MoneyEntry['kind']; amount?: number; label?: string },
) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/money/${entryId}`, { method: 'PATCH', json: patch }),
  );
}

/** Returns the deleted entry so the caller can offer Undo. */
export async function deleteMoney(businessId: string, entryId: string) {
  const res = await apiFetch<BusinessResponse & { deleted: Omit<MoneyEntry, 'id'> }>(
    `/v1/businesses/${businessId}/money/${entryId}`,
    { method: 'DELETE' },
  );
  store(res);
  return res.deleted;
}

export async function restoreMoney(businessId: string, entry: Omit<MoneyEntry, 'id'>) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/money/restore`, { method: 'POST', json: entry }),
  );
}

/** Runs Kisa's autopilot right now: scout, tune the website if needed, plan today. Returns what it did. */
export async function runKisaNow(businessId: string) {
  const res = await apiFetch<BusinessResponse & { did: string[] }>(`/v1/businesses/${businessId}/autopilot`, {
    method: 'POST',
  });
  store(res);
  return res.did;
}

export async function draftFollowUp(businessId: string, leadId: string) {
  const { text } = await apiFetch<{ text: string }>(`/v1/businesses/${businessId}/leads/${leadId}/followup`, {
    method: 'POST',
    json: {},
  });
  return text;
}

export async function draftLeadReply(businessId: string, leadId: string, fresh = false) {
  const { text } = await apiFetch<{ text: string }>(
    `/v1/businesses/${businessId}/leads/${leadId}/draft`,
    { method: 'POST', json: { fresh } },
  );
  return text;
}

export async function leadMessages(businessId: string, leadId: string) {
  const { messages } = await apiFetch<{ messages: LeadMessage[] }>(
    `/v1/businesses/${businessId}/leads/${leadId}/messages`,
  );
  return messages;
}

/** Kisa delivers the reply through the channel the customer used (Telegram). */
export async function sendReply(businessId: string, leadId: string, text: string) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/leads/${leadId}/send`, {
      method: 'POST',
      json: { text },
    }),
  );
}

export async function deleteSentMessage(businessId: string, leadId: string, messageId: string) {
  await apiFetch(`/v1/businesses/${businessId}/leads/${leadId}/messages/${messageId}`, { method: 'DELETE' });
}

export async function updateSettings(businessId: string, settings: { autoReply?: boolean; payment?: Payment | null }) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/settings`, { method: 'PATCH', json: settings }),
  );
}

export async function telegramLinkCode(businessId: string) {
  return apiFetch<{ code: string; bot: string }>(`/v1/businesses/${businessId}/telegram/code`, { method: 'POST' });
}

export async function disconnectTelegramChannel(businessId: string) {
  return store(await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/telegram/channel`, { method: 'DELETE' }));
}

export async function postToTelegram(businessId: string, text: string) {
  await apiFetch(`/v1/businesses/${businessId}/telegram/post`, { method: 'POST', json: { text } });
}

/** One line a customer can act on: the link and/or the transfer details. */
export function paymentText(payment: Payment) {
  return [payment.link, payment.details].filter(Boolean).join('\n');
}

export async function archiveBusiness(businessId: string) {
  await apiFetch(`/v1/businesses/${businessId}`, { method: 'DELETE' });
  useAppStore.getState().setBusiness(null);
}

export async function listBusinesses() {
  const { businesses } = await apiFetch<{ businesses: BusinessSummary[] }>('/v1/businesses');
  return businesses;
}

export async function activateBusiness(businessId: string) {
  return store(
    await apiFetch<BusinessResponse>(`/v1/businesses/${businessId}/activate`, { method: 'POST' }),
  );
}

export async function listSavedIdeas() {
  const { ideas } = await apiFetch<{ ideas: SavedIdea[] }>('/v1/ideas/saved');
  return ideas;
}

export async function saveIdea(intake: Intake, idea: Idea) {
  const { id } = await apiFetch<{ id: string }>('/v1/ideas/saved', {
    method: 'POST',
    json: { intake, idea },
  });
  return id;
}

export async function deleteSavedIdea(id: string) {
  await apiFetch(`/v1/ideas/saved/${id}`, { method: 'DELETE' });
}

export function formatMoney(amount: number, currency: 'GEL' | 'USD') {
  const rounded = Math.round(amount * 100) / 100;
  return currency === 'GEL' ? `${rounded}₾` : `$${rounded}`;
}
