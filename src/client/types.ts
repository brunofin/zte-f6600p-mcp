export type Fields = Record<string, string>;
export type Query = Record<string, string>;
export interface RouterInstance { [field: string]: string }
export interface RouterResponse {
  objects: Record<string, RouterInstance[]>;
  encodedFields: string[];
  data?: unknown;
}
export interface FieldSchema {
  name: string;
  controlType: string;
  sensitive: boolean;
  encryption: string;
  maxLength?: number;
  enum?: string[];
}
export interface Operation {
  method: string;
  effect: string;
  verified: boolean;
  evidence: string;
  action?: { parameter: string; value: string };
  parameters?: Record<string, string>;
  verificationScope?: string;
  supportsCreateCandidate?: boolean;
}
export interface Endpoint {
  tag: string;
  type: string;
  pages: string[];
  readVerified: boolean;
  observedFields: string[];
  encodedFields: string[];
  bindings: { page: string; section: string; query: Query; fields: FieldSchema[]; hooks: string[] }[];
  operations: Operation[];
}
export interface ReadOptions { page?: string; query?: Query }
export interface ActionRequest extends ReadOptions {
  handler: string;
  action: string;
  parameters?: Fields;
  confirm: boolean;
}
export interface ActionResult { response: RouterResponse; readBack?: RouterResponse; verification: string }
export interface Change { object: string; instance: string; field: string; before?: string; after?: string }
export interface VerifiedUpdate { changes: Change[]; settings: RouterResponse }
export interface ClientOptions {
  baseUrl: string;
  username: string;
  password: string;
  certificateSha256?: string;
  allowWrites?: boolean;
  allowDangerousActions?: boolean;
  timeoutMs?: number;
  upnpBaseUrl?: string;
}
