import { Injectable, inject } from '@angular/core';
import { Router, CanDeactivate } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PasswordResetGuard implements CanDeactivate<any> {
  private router = inject(Router);

  canDeactivate(component: any): boolean | Observable<boolean> {
    // Verificar se o componente tem o modal de reset de senha aberto
    if (component && component.showResetPasswordModal) {
      // Impedir saída do componente de login enquanto modal estiver aberto
      return false;
    }
    return true;
  }
}
