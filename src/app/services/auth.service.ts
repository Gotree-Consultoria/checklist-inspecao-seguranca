import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}

  async login(email: string, password: string) {
    console.log('[AuthService] Iniciando login com email:', email);
    try {
      const response = await firstValueFrom(
        this.http.post<any>('/auth/login', { email, password })
      );
      console.log('[AuthService] Resposta do login:', response);
      return response;
    } catch (err) {
      console.error('[AuthService] Erro no login:', err);
      throw err;
    }
  }

  logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRole');
  }
}
