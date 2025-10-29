import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LegacyService } from '../../../services/legacy.service';

@Component({
  standalone: true,
  selector: 'app-navbar',
  imports: [CommonModule],
  template: `
  <nav class="top-nav" [class.open]="navOpen">
    <div class="nav-left">
  <div class="brand" aria-label="Aplicação"></div>

      <!-- hamburger visível em mobile -->
      <button class="hamburger" aria-label="Abrir menu" (click)="toggleNav($event)">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>

      <ul class="nav-links">
        <li><a href="#" (click)="navigate('group', $event)" data-nav="group">Início</a></li>
        <li><a href="#" (click)="navigate('dashboard', $event)" data-nav="dashboard">Dashboard</a></li>
        <li><a href="#" (click)="navigate('documents', $event)" data-nav="documents">Documentos</a></li>
        <li class="admin-only" *ngIf="isAdmin"><a href="#" (click)="navigate('admin', $event)" data-nav="admin">Administrador</a></li>
      </ul>
    </div>
    <div class="nav-right">
      <div class="user-dropdown" id="userDropdown">
        <button class="user-trigger" id="userTrigger" aria-haspopup="true" [attr.aria-expanded]="userMenuOpen" (click)="toggleUserMenu($event)">
          <span class="mini-initials">{{ initials }}</span>
          <div class="mini-info">
            <span class="mini-name">{{ name }}</span>
            <span class="mini-role">{{ role }}</span>
          </div>
          <span class="chevron">▾</span>
        </button>
        <div class="user-menu" role="menu" [attr.aria-hidden]="!userMenuOpen">
          <button class="user-menu-item" (click)="goto('profile')">Meu Perfil</button>
          <button class="user-menu-item" (click)="logout()">Sair</button>
        </div>
      </div>
    </div>
  </nav>
  <div class="nav-backdrop" [class.show]="navOpen" (click)="toggleNav($event)"></div>
  `,
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  name = '--';
  role = '--';
  initials = '--';
  isAdmin = false;
  userMenuOpen = false;
  navOpen = false;

  constructor(private legacy: LegacyService, private router: Router) {}

  async ngOnInit() {
    const me = await this.legacy.fetchUserProfile().catch(()=>null);
    if (me) {
      this.name = me.name || '';
      this.role = me.especialidade || me.role || '';
      this.initials = (me.name || '?').split(/\s+/).slice(0,2).map((p:any)=>p[0]?.toUpperCase()||'').join('');
      this.isAdmin = String(me.role || '').toUpperCase() === 'ADMIN';
    } else {
      const r = this.legacy.getUserRole() || localStorage.getItem('userRole') || '';
      this.role = r || '';
      const candidate = localStorage.getItem('loggedInUserEmail') || '';
      this.name = candidate || '--';
      this.initials = (this.name || '?').split(/\s+/).slice(0,2).map((p:any)=>p[0]?.toUpperCase()||'').join('');
      this.isAdmin = String(r).toUpperCase() === 'ADMIN';
    }
  }

  async navigate(key: string, ev?: Event) {
    try { if (ev && typeof ev.preventDefault === 'function') ev.preventDefault(); } catch(_) {}

    const map: any = {
      group: ['/group'],
      dashboard: ['/dashboard'],
      documents: ['/documents'],
      admin: ['/admin'],
      profile: ['/profile'],
      login: ['/login']
    };
    const route = map[key] || ['/' + key];
    let navigated = false;
    try {
      // tenta navegar via Router padrão do Angular
      navigated = await this.router.navigate(route);
    } catch (e) {
      navigated = false;
    }

    // Se a navegação via Router não ocorreu, tentar fallback: se houver loadComponent (legacy), usá-lo,
    // caso contrário usar window.location
    if (!navigated) {
      try {
        if (typeof (window as any).loadComponent === 'function') {
          try { (window as any).loadComponent('mainContent', key + 'Page'); } catch(_) {}
        } else {
          try { window.location.href = (route && route.length) ? route[0] : ('/' + key); } catch(_) {}
        }
      } catch (_) {}
    }
    // fechar menu mobile se aberto
    if (this.navOpen) this.navOpen = false;
  }

  toggleUserMenu(ev?: Event) {
    ev && ev.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) {
      const closeHandler = () => { this.userMenuOpen = false; document.removeEventListener('click', closeHandler); };
      // fecha ao clicar fora
      setTimeout(()=>document.addEventListener('click', closeHandler), 0);
    }
  }

  toggleNav(ev?: Event) {
    ev && ev.stopPropagation();
    this.navOpen = !this.navOpen;
    if (this.navOpen) {
      // fecha menu ao clicar fora (apenas em mobile)
      const closeHandler = (ev?: Event) => { this.navOpen = false; document.removeEventListener('click', closeHandler); };
      setTimeout(()=>document.addEventListener('click', closeHandler), 0);
    }
  }

  goto(page: string) { this.navigate(page); }

  logout() {
    this.legacy.performLogout && (this.legacy.performLogout as any)();
    this.navigate('login');
  }
}
