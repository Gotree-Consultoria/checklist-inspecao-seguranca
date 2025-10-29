import { Component, HostBinding, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-footer',
  imports: [CommonModule],
  template: `
  <footer class="footer">
    <div class="footer-bottom">
      <p>© 2025 Go-Tree Consultoria. Todos os direitos reservados.</p>
    </div>
  </footer>
  `,
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  @HostBinding('class.login-footer-fixed') isLoginPage = false;
  @HostBinding('class.footer-fixed') isFixed = true; // Sempre fixo
  private router = inject(Router);

  ngOnInit() {
    this.updateLoginStatus();
    this.router.events.subscribe(() => this.updateLoginStatus());
  }

  private updateLoginStatus() {
    const isLogin = window.location.pathname.includes('/login') || (window.location.hash || '').includes('login');
    const isAuth = !!localStorage.getItem('jwtToken');
    this.isLoginPage = isLogin && !isAuth;
  }
}


