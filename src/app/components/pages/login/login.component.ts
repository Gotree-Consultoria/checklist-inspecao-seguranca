import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { PasswordResetService } from '../../../services/password-reset.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';
  
  // Password reset modal
  showResetPasswordModal = false;
  resetPasswordForm = {
    newPassword: '',
    confirmPassword: ''
  };
  resetPasswordLoading = false;
  resetPasswordError = '';
  resetPasswordToken = '';

  constructor(
    private auth: AuthService,
    private legacy: LegacyService,
    private ui: UiService,
    private router: Router,
    private passwordResetService: PasswordResetService
  ) {}

  ngOnInit(): void {
    try {
      const token = localStorage.getItem('jwtToken');
      // se já houver token, considera usuário autenticado e navega para página principal
      if (token) {
        try {
          // valida expiração do token quando disponível
          const payload: any = this.legacy.decodeJwt(token as string) || {};
          const now = Math.floor(Date.now() / 1000);
          if (payload && payload.exp && Number(payload.exp) > 0) {
            if (Number(payload.exp) > now) {
              try { this.router.navigate(['/group']); } catch (_) { window.location.href = '/'; }
              return;
            } else {
              // token expirado
              try { localStorage.removeItem('jwtToken'); } catch(_) {}
            }
          } else {
            // sem exp -> assumir válido (fallback) e navegar
            try { this.router.navigate(['/group']); } catch (_) { window.location.href = '/'; }
            return;
          }
        } catch (e) {
          // Se houver erro ao decodificar, tentar navegar por segurança
          try { this.router.navigate(['/group']); } catch (_) { window.location.href = '/'; }
          return;
        }
      }
    } catch (e) {
      // não bloquear UI em caso de erro ao acessar storage
      console.warn('[LoginComponent] erro ao verificar token no storage', e);
    }
  }

  async onSubmit(ev?: Event) {
    try {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
    } catch(_) {}
    if (!this.email || !this.password) {
      this.ui.showToast('Email e senha são obrigatórios', 'error');
      return;
    }
    this.loading = true;
  this.errorMessage = '';
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
  this.errorMessage = '';

      // Verificar se passwordResetRequired é true
      if (data && data.passwordResetRequired === true) {
        this.resetPasswordToken = data.token;
        this.showResetPasswordModal = true;
        this.passwordResetService.setPasswordResetRequired(true);
        // Navegar para o dashboard, mas com o modal de reset exibindo
        try { this.router.navigate(['/group']); } catch(_) { window.location.href = '/'; }
        return;
      }

      // navegar para a página principal (group) — manter comportamento do legacy
      try { this.router.navigate(['/group']); } catch(_) { window.location.href = '/'; }
    } catch (err: any) {
      let msg = 'Erro ao efetuar login';
      try {
        if (err && typeof err === 'object') {
          // Erro de conexão / CORS / servidor inacessível
          if (err.status === 0) msg = 'Falha de conexão com o servidor';
          else if (err.status === 401) msg = 'Credenciais inválidas';
          else if (err.error && typeof err.error === 'string') msg = err.error;
          else if (err.error && err.error.message) msg = err.error.message;
          else if (err.message) msg = err.message;
        } else if (typeof err === 'string') {
          msg = err;
        }
      } catch (_) {}
  this.errorMessage = msg;
  this.ui.showToast(msg, 'error');
      console.error('login error', err);
    } finally {
      this.loading = false;
    }
  }

  async submitResetPassword() {
    // Validar senhas
    if (!this.resetPasswordForm.newPassword || !this.resetPasswordForm.confirmPassword) {
      this.resetPasswordError = 'Nova senha e confirmação são obrigatórias';
      return;
    }

    if (this.resetPasswordForm.newPassword.length < 8) {
      this.resetPasswordError = 'A senha deve ter no mínimo 8 caracteres';
      return;
    }

    if (this.resetPasswordForm.newPassword !== this.resetPasswordForm.confirmPassword) {
      this.resetPasswordError = 'As senhas não correspondem';
      return;
    }

    this.resetPasswordLoading = true;
    this.resetPasswordError = '';

    try {
      // Usar o token JWT que foi obtido no login
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('Token não encontrado. Por favor, faça login novamente.');
      }

      // Fazer requisição PUT para /users/me/change-password
      const response = await fetch(`${this.legacy.apiBaseUrl}/users/me/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: this.resetPasswordForm.newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro ao alterar senha (status ${response.status})`);
      }

      this.ui.showToast('Senha alterada com sucesso!', 'success');
      
      // Limpar modal e formulário
      this.showResetPasswordModal = false;
      this.passwordResetService.setPasswordResetRequired(false);
      this.resetPasswordForm = { newPassword: '', confirmPassword: '' };
      this.resetPasswordToken = '';

      // Usuário pode agora navegar normalmente
    } catch (error: any) {
      this.resetPasswordError = error?.message || 'Erro ao alterar a senha. Tente novamente.';
      this.ui.showToast(this.resetPasswordError, 'error');
    } finally {
      this.resetPasswordLoading = false;
    }
  }

  closeResetPasswordModal() {
    // Não permitir fechar o modal sem mudar a senha - apenas desabilitar visualmente se quiser
    // Para segurança, não deixamos cancelar
    this.resetPasswordError = 'Você deve alterar sua senha para continuar.';
  }
}
