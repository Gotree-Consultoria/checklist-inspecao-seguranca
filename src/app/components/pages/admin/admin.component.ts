import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  private legacy = inject(LegacyService);
  private ui = inject(UiService);

  accessDenied = false;
  loadingUsers = false;
  loadingCompanies = false;
  users: any[] = [];
  companies: any[] = [];

  // Form state (reactive)
  fb = inject(FormBuilder);
  userForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    birthDate: ['', Validators.required],
    phone: ['', Validators.required],
    cpf: ['', Validators.required],
    role: ['USER'],
    councilAcronym: [''],
    councilNumber: [''],
    specialty: ['']
  });

  companyForm = this.fb.group({
    companyName: ['', Validators.required],
    companyCnpj: ['', Validators.required]
  });

  // dynamic units/sectors
  dynamicUnits: Array<{ name: string; cnpj: string }> = [];
  dynamicSectors: Array<{ name: string }> = [];

  // messages
  userFormMsg = '';
  companyFormMsg = '';

  ngOnInit(): void {
    const role = this.legacy.getUserRole();
    if (!(role && role.toLowerCase().includes('admin'))) {
      this.accessDenied = true;
      return;
    }
    this.loadUsers();
    this.loadCompanies();
  }

  async loadUsers() {
    this.loadingUsers = true;
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/users`, { headers: this.legacy.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao carregar usuários');
      const users = await resp.json();
      this.users = Array.isArray(users) ? users : [];
    } catch (e: any) {
      this.ui.showToast(e?.message || 'Erro ao carregar usuários', 'error');
      this.users = [];
    } finally {
      this.loadingUsers = false;
    }
  }

  async deleteUser(userId: string) {
    if (!userId) return;
    const me = (window as any).__cachedUserMe;
    if (me && me.id && String(me.id) === String(userId)) {
      this.ui.showToast('Você não pode excluir seu próprio usuário.', 'error');
      return;
    }
    const proceed = window.confirm('Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.');
    if (!proceed) return;
    try {
      const delResp = await fetch(`${this.legacy.apiBaseUrl}/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: this.legacy.authHeaders()
      });
      if (!delResp.ok) throw new Error('Falha ao excluir usuário');
      this.ui.showToast('Usuário excluído', 'success');
      this.loadUsers();
    } catch (e: any) {
      this.ui.showToast(e?.message || 'Erro ao excluir', 'error');
    }
  }

  // create user
  async submitCreateUser() {
    this.userFormMsg = '';
    if (this.userForm.invalid) {
      this.userFormMsg = 'Preencha todos os campos obrigatórios corretamente.';
      return;
    }
    const val = this.userForm.value;
    // birthDate may be yyyy-mm-dd from input type=date; backend expects dd/MM/yyyy
    let birthDate = val.birthDate || '';
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(birthDate);
    if (isoMatch) {
      const [y, m, d] = (birthDate as string).split('-');
      birthDate = `${d}/${m}/${y}`;
    }

    const payload: any = {
      name: val.name,
      email: val.email,
      password: val.password,
      birthDate,
      phone: val.phone,
      cpf: val.cpf,
      role: val.role || null,
      siglaConselhoClasse: val.councilAcronym || '',
      conselhoClasse: val.councilNumber || '',
      especialidade: val.specialty || ''
    };

    try {
      const submitBtn = null; // kept for parity (no direct DOM manipulation)
      const resp = await fetch(`${this.legacy.apiBaseUrl}/users/insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.legacy.authHeaders() },
        body: JSON.stringify(payload)
      });
      const respText = await resp.text().catch(() => '');
      if (!resp.ok) {
        let serverMsg = respText || `Erro ao criar usuário (status ${resp.status})`;
        try { const parsed = JSON.parse(respText); serverMsg = parsed.message || parsed.error || serverMsg; } catch(e) {}
        this.ui.showToast(serverMsg, 'error');
        throw new Error(serverMsg);
      }
      this.userFormMsg = 'Usuário criado com sucesso.';
      this.userForm.reset({ role: 'USER' });
      this.loadUsers();
    } catch (e: any) {
      this.userFormMsg = e?.message || String(e);
    }
  }

  // Companies
  async loadCompanies() {
    this.loadingCompanies = true;
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/companies`, { headers: this.legacy.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao carregar empresas');
      const data = await resp.json();
      this.companies = Array.isArray(data) ? data : [];
    } catch (e: any) {
      this.ui.showToast(e?.message || 'Erro ao carregar empresas', 'error');
      this.companies = [];
    } finally { this.loadingCompanies = false; }
  }

  addUnit(nameInput: HTMLInputElement, cnpjInput: HTMLInputElement) {
    const name = (nameInput?.value || '').trim();
    const cnpj = (cnpjInput?.value || '').trim();
    if (!name) { this.ui.showToast('Nome da unidade é obrigatório', 'error'); return; }
    if (!this.validateCNPJ(cnpj)) { this.ui.showToast('CNPJ inválido', 'error'); return; }
    this.dynamicUnits.push({ name, cnpj: this.formatCNPJ(cnpj) });
    nameInput.value = ''; cnpjInput.value = '';
  }

  removeUnit(idx: number) { this.dynamicUnits.splice(idx,1); }

  addSector(nameInput: HTMLInputElement) {
    const name = (nameInput?.value || '').trim();
    if (!name) { this.ui.showToast('Nome do setor é obrigatório', 'error'); return; }
    this.dynamicSectors.push({ name });
    nameInput.value = '';
  }

  removeSector(idx: number) { this.dynamicSectors.splice(idx,1); }

  async submitCreateCompany() {
    this.companyFormMsg = '';
    if (this.companyForm.invalid) { this.companyFormMsg = 'Preencha os campos obrigatórios.'; return; }
    const val = this.companyForm.value;
    const cnpj = val.companyCnpj || '';
    if (!this.validateCNPJ(cnpj)) { this.companyFormMsg = 'CNPJ inválido.'; return; }
    const payload: any = {
      name: val.companyName,
      cnpj: this.formatCNPJ(cnpj),
      units: this.dynamicUnits,
      sectors: this.dynamicSectors
    };
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.legacy.authHeaders() },
        body: JSON.stringify(payload)
      });
      const txt = await resp.text().catch(()=>'');
      if (!resp.ok) {
        let serverMsg = txt || `Erro ao criar empresa (status ${resp.status})`;
        try { const parsed = JSON.parse(txt); serverMsg = parsed.message || parsed.error || serverMsg; } catch(e) {}
        this.ui.showToast(serverMsg, 'error');
        throw new Error(serverMsg);
      }
      this.companyFormMsg = 'Empresa criada com sucesso.';
      this.companyForm.reset();
      this.dynamicUnits = []; this.dynamicSectors = [];
      this.loadCompanies();
    } catch (e: any) {
      this.companyFormMsg = e?.message || String(e);
    }
  }

  // CNPJ helpers (portado do legacy)
  onlyDigits(v: string) { return (v||'').replace(/\D+/g,''); }
  formatCNPJ(v: string) {
    const d = this.onlyDigits(v).slice(0,14);
    if (!d) return '';
    let out = d;
    if (d.length > 2) out = d.slice(0,2)+'.'+d.slice(2);
    if (d.length > 5) out = out.slice(0,6)+'.'+out.slice(6);
    if (d.length > 8) out = out.slice(0,10)+'/'+out.slice(10);
    if (d.length > 12) out = out.slice(0,15)+'-'+out.slice(15);
    return out;
  }
  validateCNPJ(cnpj: string) {
    const str = this.onlyDigits(cnpj);
    if (str.length !== 14) return false;
    if (/^(\d)\1+$/.test(str)) return false;
    const calc = (base: string) => {
      const factor = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum = base.split('').reduce((acc, cur, idx) => acc + parseInt(cur,10)*factor[idx], 0);
      const mod = sum % 11;
      return (mod < 2) ? 0 : 11 - mod;
    };
    const d1 = calc(str.slice(0,12));
    const d2 = calc(str.slice(0,12)+d1);
    return str.endsWith(String(d1)+String(d2));
  }
}
