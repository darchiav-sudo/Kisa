import { createServices } from './http';
import type { AppServices } from './types';

/** Uses HTTP API when EXPO_PUBLIC_API_URL is set; otherwise local mocks. */
export const services: AppServices = createServices();

export type { AppServices } from './types';
