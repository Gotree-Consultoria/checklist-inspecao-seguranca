import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private legacy: LegacyService,
    private ui: UiService,
    private router: Router,
  ) {}

  async onSubmit(ev?: Event) {
    try {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    } catch(_) {}
    if (!this.email || !this.password) {
      this.ui.showToast('Email e senha são obrigatórios', 'error');
      return;
    }
    this.loading = true;
    try {
      const resp = await this.auth.login(this.email, this.password);
      // Resp pode ser o objeto retornado pelo ApiService
      const data: any = resp || {};
      // se resp contiver token e email
      if (data.token) {
        try { localStorage.setItem('jwtToken', data.token); } catch(_) {}
      }
      if (data.email) {
        try { localStorage.setItem('loggedInUserEmail', data.email); } catch(_) {}
      } else {
        // fallback: gravar email do formulário
        try { localStorage.setItem('loggedInUserEmail', this.email); } catch(_) {}
      }

      // salvar role se backend enviou
      if (data && data.role) {
        try { localStorage.setItem('userRole', data.role); } catch(_) {}
      }

      // tenta extrair role do token
      try {
        const token = data.token || localStorage.getItem('jwtToken');
        const role = this.legacy.extractRoleFromToken(token || null) || (data && data.role) || (data && data.roles && data.roles[0]);
        if (role) try { localStorage.setItem('userRole', role); } catch(_) {}
      } catch (e) {
        console.warn('Não foi possível extrair role do token', e);
      }

      // fallback: se ainda não houver role, invoca ensureUserRole()
      if (!localStorage.getItem('userRole')) {
        try { await this.legacy.ensureUserRole(); } catch(_) {}
      }

      this.ui.showToast('Login realizado com sucesso', 'success');
      // navegar para a página principal (group) — manter comportamento do legacy
      try { this.router.navigate(['/group']); } catch(_) { window.location.href = '/'; }
    } catch (err: any) {
      const msg = (err && err.message) ? err.message : 'Erro ao efetuar login';
      this.ui.showToast(msg, 'error');
      console.error('login error', err);
    } finally {
      this.loading = false;
    }
  }
}
