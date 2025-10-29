import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '';
  
  constructor(private http: HttpClient) {
    // Detectar se está em desenvolvimento e usar a base correta
    const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isDev) {
      // Em desenvolvimento, usar localhost:8081 como base
      this.base = 'http://localhost:8081';
    }
    // Em produção, deixar vazio (URLs relativas)
  }

  get<T>(path: string) {
    const url = this.base ? this.base + path : path;
    return firstValueFrom(this.http.get<T>(url));
  }

  post<T>(path: string, body: any) {
    const url = this.base ? this.base + path : path;
    return firstValueFrom(this.http.post<T>(url, body));
  }

  // Adicione outros helpers conforme necessário
}
