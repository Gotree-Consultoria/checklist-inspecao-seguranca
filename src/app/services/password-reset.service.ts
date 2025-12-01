import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  private passwordResetRequiredSubject = new BehaviorSubject<boolean>(false);
  public passwordResetRequired$ = this.passwordResetRequiredSubject.asObservable();

  setPasswordResetRequired(required: boolean) {
    this.passwordResetRequiredSubject.next(required);
  }

  isPasswordResetRequired(): boolean {
    return this.passwordResetRequiredSubject.value;
  }
}
