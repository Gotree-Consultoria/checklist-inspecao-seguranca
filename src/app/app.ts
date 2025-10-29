import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { HeaderComponent } from './components/shared/header/header.component';
import { NavbarComponent } from './components/shared/navbar/navbar.component';
import { FooterComponent } from './components/shared/footer/footer.component';
import { LegacyService } from './services/legacy.service';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [CommonModule, NgIf, RouterOutlet, HeaderComponent, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('frontend');
  private router = inject(Router);
  private legacy = inject(LegacyService);
  
  ngOnInit() {
    // observar rota para aplicar comportamento do footer (fixo apenas na página de login)
    try {
      this.router.events.subscribe(() => this.updateFooterClass());
      // aplicar no carregamento inicial
      this.updateFooterClass();
    } catch (_) {}
  }

  private updateFooterClass() {
    try {
      const isLoginRoute = window.location.pathname.includes('/login') || (window.location.hash||'').includes('login');
      const shouldFixFooter = isLoginRoute && !this.isAuthenticated();
      if (shouldFixFooter) document.body.classList.add('login-footer-fixed'); else document.body.classList.remove('login-footer-fixed');
    } catch (_) {}
  }

  constructor() {
    // ouvinte que integra navegação legacy via evento customizado
    if (typeof window !== 'undefined') {
      window.addEventListener('legacy:navigate', async (ev: any) => {
        try {
          const key = ev && ev.detail ? ev.detail : ev;
          // mapear keys para rotas Angular
          const map: any = { group: ['/group'], dashboard: ['/dashboard'], documents: ['/documents'], admin: ['/admin'], profile: ['/profile'], login: ['/login'] };
          const route = map[key] || ['/' + key];
          let navigated = false;
          try { navigated = await this.router.navigate(route); } catch(_) { navigated = false; }
          if (!navigated) {
            if (typeof (window as any).loadComponent === 'function') {
              try { (window as any).loadComponent('mainContent', key + 'Page'); } catch(_) {}
            } else {
              try { window.location.hash = key; } catch(_) {}
            }
          }
        } catch (_) {}
      });
    }

    // se não autenticado, garanta que navegue para login
    try {
      const token = localStorage.getItem('jwtToken');
      const current = window.location.pathname || window.location.hash || '';
      if (!token) {
        // se não estiver já na rota de login, redireciona
        if (!current.includes('/login') && !(window.location.hash||'').includes('login')) {
          try { this.router.navigate(['/login']); } catch(_) { window.location.href = '/#/login'; }
        }
      }
    } catch(_) {}
  }

  isAuthenticated(): boolean {
    try { return !!localStorage.getItem('jwtToken'); } catch(_) { return false; }
  }
}
