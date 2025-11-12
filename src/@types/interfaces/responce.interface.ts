export interface ResponseData<T = unknown> {
  status_code?: number;
  data?: T;
  message?: string;
  metadata?: Record<string, unknown>;
}
