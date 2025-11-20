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

      if (response && response.token) {
                // O AuthInterceptor e o logout esperam a chave 'jwtToken'
                localStorage.setItem('jwtToken', response.token); 
                localStorage.setItem('userRole', response.role); 
            }

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
