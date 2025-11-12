export interface HttpExceptionResponse {
  status_code: number;
  error: string;
  message?: string | Record<string, unknown> | any[];
}

export interface CustomHttpExceptionResponse extends HttpExceptionResponse {
  path: string;
  method: string;
  time_stamp: Date;
}
