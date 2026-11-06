export type ErrorCode = 'CONFIGURATION' | 'TRANSPORT' | 'PROTOCOL' | 'AUTHENTICATION' |
  'SESSION_EXPIRED' | 'ROUTER_REJECTED' | 'POLICY' | 'VALIDATION' | 'VERIFICATION';

/** Deliberately excludes request bodies, credentials, headers and URLs. */
export class RouterError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = 'RouterError';
  }
}
