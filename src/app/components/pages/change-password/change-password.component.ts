import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { ApiService } from '../../../services/api.service';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private legacy = inject(LegacyService);
  private ui = inject(UiService);
  private api = inject(ApiService);

  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  });

  msg = '';
  forced = false;
  submitting = false;

  private escHandler: any = null;
  private overlayClickHandler: any = null;
  private formSubmitHandler: any = null;

  ngOnInit(): void {
    // If the overlay exists in DOM (legacy flow), hide/normalize it; otherwise we render as a page
    this.bindOverlayBehavior();
  }

  ngOnDestroy(): void {
    // remove listeners and restore scroll
    try { document.documentElement.style.overflow = ''; } catch(_){}
    if (this.escHandler) document.removeEventListener('keydown', this.escHandler);
    const overlay = document.getElementById('changePasswordModalOverlay');
    if (overlay && this.overlayClickHandler) overlay.removeEventListener('click', this.overlayClickHandler);
    const formEl = document.getElementById('changePasswordForm');
    if (formEl && this.formSubmitHandler) formEl.removeEventListener('submit', this.formSubmitHandler);
  }

  private bindOverlayBehavior() {
    const overlay = document.getElementById('changePasswordModalOverlay');
    if (!overlay) return;
    // read forced flag
    this.forced = !!overlay.getAttribute('data-forced') || !!(overlay as any).__forced;
    // open modal
    overlay.classList.add('open');
    // hide close if forced
    const closeBtn = overlay.querySelector('[data-action="modal-close"]') as HTMLElement | null;
    if (closeBtn) closeBtn.style.display = this.forced ? 'none' : '';
    // trap focus to first input
    setTimeout(() => {
      const first = overlay.querySelector('#newPassword') as HTMLElement | null;
      if (first) first.focus();
    }, 20);
    // prevent background scroll
    try { document.documentElement.style.overflow = 'hidden'; } catch(_){}

    // overlay click to close (if not forced)
    this.overlayClickHandler = (e: any) => {
      if (e.target === overlay && !this.forced) this.close();
    };
    overlay.addEventListener('click', this.overlayClickHandler);

    // ESC to close if not forced
    this.escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape' && overlay.classList.contains('open') && !this.forced) this.close(); };
    document.addEventListener('keydown', this.escHandler);

    // Ensure form submit from injected DOM form is handled
    const formEl = document.getElementById('changePasswordForm');
    if (formEl) {
      // attach submit handler to intercept legacy DOM form submissions
      this.formSubmitHandler = (ev: Event) => { ev.preventDefault(); this.handleDomFormSubmit(); };
      formEl.addEventListener('submit', this.formSubmitHandler);
    }
  }

  close() {
    const overlay = document.getElementById('changePasswordModalOverlay');
    if (!overlay) return;
    if ((overlay as any).__forced || this.forced) return; // não fecha se for forced
    overlay.classList.remove('open');
    try { document.documentElement.style.overflow = ''; } catch(_){}
  }

  private async handleDomFormSubmit() {
    // read values from DOM inputs (legacy injected form)
    const pw = (document.getElementById('newPassword') as HTMLInputElement | null)?.value || '';
    const confirm = (document.getElementById('confirmPassword') as HTMLInputElement | null)?.value || '';
    this.form.patchValue({ newPassword: pw, confirmPassword: confirm });
    await this.submit();
  }

  async submit() {
    this.msg = '';
    if (this.form.invalid) { this.msg = 'Preencha os campos corretamente.'; return; }
    const pw = this.form.get('newPassword')?.value || '';
    const confirm = this.form.get('confirmPassword')?.value || '';
    if (pw !== confirm) { this.msg = 'As senhas não conferem.'; return; }

    this.submitting = true;
    // update legacy DOM button state if present
    const submitBtnDom = document.querySelector('#changePasswordForm button[type="submit"]') as HTMLButtonElement | null;
    if (submitBtnDom) { submitBtnDom.disabled = true; submitBtnDom.textContent = 'Salvando...'; }

    try {
      const payload = { newPassword: pw };
      const urls = [`${this.legacy.apiBaseUrl}/users/me/change-password`, `${this.legacy.apiBaseUrl}/me/change-password`];
      let resp: Response | null = null;
      for (const url of urls) {
        try {
          resp = await fetch(url, { method: 'PUT', headers: { ...this.legacy.authHeaders() }, body: JSON.stringify(payload) });
          if (resp.status !== 404) break;
        } catch (e) { throw e; }
      }
      if (!resp) throw new Error('Nenhuma resposta do servidor.');
      const txt = await resp.text().catch(()=>'');
      if (!resp.ok) throw new Error(txt || `Falha ao atualizar senha (status ${resp.status})`);
      this.ui.showToast('Senha atualizada com sucesso. Você será redirecionado.', 'success');
      // If modal overlay exists, close it
      const overlay = document.getElementById('changePasswordModalOverlay');
      if (overlay) {
        overlay.classList.remove('open');
        if (!this.forced) overlay.remove();
      }
      setTimeout(() => { try { window.location.href = '/#/group'; } catch(_){} }, 600);
    } catch (err:any) {
      this.msg = err?.message || 'Erro ao atualizar senha.';
    } finally {
      this.submitting = false;
      if (submitBtnDom) { submitBtnDom.disabled = false; submitBtnDom.textContent = 'Salvar Nova Senha'; }
    }
  }
}
