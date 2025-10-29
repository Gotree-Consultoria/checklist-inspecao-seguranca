import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private api: ApiService) {}

  async login(email: string, password: string) {
    return this.api.post('/auth/login', { email, password });
  }

  logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRole');
  }
}
