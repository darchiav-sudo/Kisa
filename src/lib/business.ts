import type {
  Business,
  BusinessSummary,
  Idea,
  Intake,
  LeadStatus,
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

export async function draftLeadReply(businessId: string, leadId: string, fresh = false) {
  const { text } = await apiFetch<{ text: string }>(
    `/v1/businesses/${businessId}/leads/${leadId}/draft`,
    { method: 'POST', json: { fresh } },
  );
  return text;
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
