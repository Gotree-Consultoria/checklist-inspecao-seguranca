import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * ApiService wraps HttpClient to provide convenient methods for API calls.
 * All URLs are relative and will be automatically prefixed with /api by the ApiPrefixInterceptor.
 * 
 * Em desenvolvimento: /users → interceptor → /api/users → proxy.conf.json → http://localhost:8081/users
 * Em produção: /users → interceptor → /api/users → seu-dominio.com/api/users
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(path: string) {
    return firstValueFrom(this.http.get<T>(path));
  }

  post<T>(path: string, body: any) {
    return firstValueFrom(this.http.post<T>(path, body));
  }

  put<T>(path: string, body: any) {
    return firstValueFrom(this.http.put<T>(path, body));
  }

  delete<T>(path: string) {
    return firstValueFrom(this.http.delete<T>(path));
  }
}
