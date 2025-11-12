import { Observable, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';

interface ApiServiceOptions {
  cookies?: Record<string, string>;
}

const apiService = (baseUrl: string) => {
  return {
    get: <T>(
      url: string,
      params?: Record<string, any>,
      headers?: Record<string, any>,
      options?: ApiServiceOptions,
    ): Observable<T> => {
      const config: AxiosRequestConfig = {
        params: params,
        headers: headers ? { ...headers } : {},
      };

      if (options?.cookies && config?.headers) {
        config.headers['Cookie'] = Object.entries(options.cookies)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
      }

      return from(axios.get<T>(baseUrl + url, config)).pipe(
        map((response: AxiosResponse<T>) => response.data),
        catchError((error: AxiosError) => {
          return new Observable<T>((observer) => {
            observer.error(error);
          });
        }),
      );
    },

    post: <T, D>(
      url: string,
      data: D,
      headers?: Record<string, string>,
    ): Observable<T> => {
      return from(axios.post<T>(baseUrl + url, { data }, { headers })).pipe(
        map((response: AxiosResponse<T>) => response.data),
        catchError((error: AxiosError) => {
          return new Observable<T>((observer) => {
            observer.error(error);
          });
        }),
      );
    },

    put: <T, D>(
      url: string,
      data: D,
      headers?: Record<string, string>,
    ): Observable<T> => {
      return from(axios.put<T>(baseUrl + url, { data }, { headers })).pipe(
        map((response: AxiosResponse<T>) => response.data),
        catchError((error: AxiosError) => {
          return new Observable<T>((observer) => {
            observer.error(error);
          });
        }),
      );
    },

    delete: <T>(
      url: string,
      headers?: Record<string, string>,
    ): Observable<T> => {
      return from(axios.delete<T>(baseUrl + url, { headers })).pipe(
        map((response: AxiosResponse<T>) => response.data),
        catchError((error: AxiosError) => {
          return new Observable<T>((observer) => {
            observer.error(error);
          });
        }),
      );
    },
  };
};

export default apiService;
