import { mockServices } from './mocks';
import type { AppServices } from './types';

/** Swap this binding when real integrations land. */
export const services: AppServices = mockServices;

export type { AppServices } from './types';
