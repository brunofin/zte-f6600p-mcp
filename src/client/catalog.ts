import data from '../data/endpoints.json' with { type: 'json' };
import type { Endpoint, Operation } from './types.js';
import { RouterError } from './errors.js';

export const catalog = data;
export const endpoints = data.httpHandlers as Endpoint[];
export const passiveEffects = new Set(['read', 'filesystem_read']);
export const dangerousEffects = new Set([
  'reboot', 'factory_reset', 'connectivity_disrupting', 'security_state_change',
  'device_state_change', 'counter_reset', 'active_radio_scan',
]);
export function endpointFor(tag: string): Endpoint {
  const endpoint = endpoints.find(e => e.tag === tag);
  if (!endpoint) throw new RouterError('VALIDATION', 'Unknown catalog handler.');
  return endpoint;
}
export function readable(endpoint: Endpoint): boolean {
  return endpoint.operations.some(o => o.method === 'GET' && passiveEffects.has(o.effect));
}
export function actionFor(endpoint: Endpoint, action: string): Operation {
  const operation = endpoint.operations.find(o => o.action?.value === action);
  if (!operation || operation.effect === 'read_reload_via_post') {
    throw new RouterError('VALIDATION', 'Action is not an executable catalog operation.');
  }
  return operation;
}
