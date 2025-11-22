import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { CnpjFormatPipe } from '../../../pipes/cnpj-format.pipe';
import { debounceTime, Subject } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CnpjFormatPipe],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  private legacy = inject(LegacyService);
  private ui = inject(UiService);

  accessDenied = false;
  loadingUsers = false;
  loadingCompanies = false;
  loadingCompanyForm = false;
  users: any[] = [];
  companies: any[] = [];

  // Subject para debounce na busca de CNPJ
  private cnpjSearchSubject = new Subject<{ cnpj: string; field: 'company' | 'unit'; index?: number }>();

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
  dynamicUnits: Array<{ id?: number; name: string; cnpj?: string }> = [];
  dynamicSectors: Array<string | { id: number; name: string }> = [];
  // modal de edição de usuário
  editingUserId: number | null = null;
  showEditUserModal = false;
  editUserForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    cpf: [''],
    siglaConselhoClasse: [''],
    conselhoClasse: [''],
    especialidade: ['']
  });
  editUserFormMsg = '';

  // modal de edição de empresa
  editingCompanyId: number | null = null;
  showEditCompanyModal = false;
  editCompanyForm = this.fb.group({
    companyName: ['', Validators.required],
    companyCnpj: ['', Validators.required]
  });
  editCompanyFormMsg = '';

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
    
    // Setup debounced CNPJ search
    this.cnpjSearchSubject.pipe(
      debounceTime(800)
    ).subscribe(({ cnpj, field, index }) => {
      this.fetchCnpjData(cnpj, field, index);
    });
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

  async resetUserPassword(userId: string) {
    if (!userId) return;
    const me = (window as any).__cachedUserMe;
    if (me && me.id && String(me.id) === String(userId)) {
      this.ui.showToast('Você não pode resetar a sua própria senha por aqui.', 'error');
      return;
    }
    const proceed = window.confirm('Deseja realmente resetar a senha deste usuário?');
    if (!proceed) return;
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/users/admin/reset-password/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: this.legacy.authHeaders()
      });
      const txt = await resp.text().catch(() => '');
      if (!resp.ok) {
        let serverMsg = txt || `Erro ao resetar senha (status ${resp.status})`;
        try { const parsed = JSON.parse(txt); serverMsg = parsed.message || parsed.error || serverMsg; } catch(e) {}
        this.ui.showToast(serverMsg, 'error');
        throw new Error(serverMsg);
      }
      this.ui.showToast('Senha resetada com sucesso', 'success');
      this.loadUsers();
    } catch (e: any) {
      this.ui.showToast(e?.message || 'Erro ao resetar senha', 'error');
    }
  }

  openEditUserModal(user: any) {
    this.editingUserId = user.id;
    this.editUserForm.patchValue({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      cpf: user.cpf || '',
      siglaConselhoClasse: user.siglaConselhoClasse || user.councilAcronym || '',
      conselhoClasse: user.conselhoClasse || user.councilNumber || '',
      especialidade: user.especialidade || user.specialty || ''
    });
    this.showEditUserModal = true;
    this.editUserFormMsg = '';
  }

  closeEditUserModal() {
    this.showEditUserModal = false;
    this.editingUserId = null;
    this.editUserForm.reset();
    this.editUserFormMsg = '';
  }

  async submitEditUser() {
    this.editUserFormMsg = '';
    if (this.editUserForm.invalid) { this.editUserFormMsg = 'Preencha os campos obrigatórios.'; return; }
    if (!this.editingUserId) return;

    const val = this.editUserForm.value;
    const payload = {
      name: val.name,
      email: val.email,
      phone: val.phone || '',
      cpf: val.cpf || '',
      siglaConselhoClasse: val.siglaConselhoClasse || '',
      conselhoClasse: val.conselhoClasse || '',
      especialidade: val.especialidade || ''
    };

    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/users/${this.editingUserId}`, {
        method: 'PUT',
        headers: { ...this.legacy.authHeaders() },
        body: JSON.stringify(payload)
      });
      const txt = await resp.text().catch(() => '');
      if (!resp.ok) {
        let serverMsg = txt || `Erro ao atualizar usuário (status ${resp.status})`;
        try { const parsed = JSON.parse(txt); serverMsg = parsed.message || parsed.error || serverMsg; } catch(e) {}
        this.ui.showToast(serverMsg, 'error');
        throw new Error(serverMsg);
      }
      this.editUserFormMsg = 'Usuário atualizado com sucesso.';
      this.ui.showToast('Usuário atualizado com sucesso', 'success');
      setTimeout(() => this.closeEditUserModal(), 1500);
      this.loadUsers();
    } catch (e: any) {
      this.editUserFormMsg = e?.message || String(e);
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
        headers: { ...this.legacy.authHeaders() },
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

  async deleteCompany(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/companies/${id}`, {
        method: 'DELETE',
        headers: this.legacy.authHeaders()
      });

      if (resp.status === 204) {
        // ✅ Sucesso - empresa excluída
        this.ui.showToast('Empresa excluída com sucesso', 'success');
        this.loadCompanies();
      } else if (resp.status === 409) {
        // ⚠️ Conflict - empresa vinculada a relatórios
        const txt = await resp.text().catch(() => '');
        let msg = 'Esta empresa não pode ser excluída, pois está sendo usada.';
        try {
          const parsed = JSON.parse(txt);
          msg = parsed.message || msg;
        } catch(e) {}
        this.ui.showToast(msg, 'error');
      } else if (resp.status === 404) {
        // ❌ Not Found - empresa não existe
        const txt = await resp.text().catch(() => '');
        let msg = 'Empresa não encontrada.';
        try {
          const parsed = JSON.parse(txt);
          msg = parsed.message || msg;
        } catch(e) {}
        this.ui.showToast(msg, 'error');
        this.loadCompanies();
      } else {
        // ⚠️ Outro erro
        const txt = await resp.text().catch(() => '');
        let msg = `Erro ao excluir empresa (status ${resp.status})`;
        try {
          const parsed = JSON.parse(txt);
          msg = parsed.message || parsed.error || msg;
        } catch(e) {}
        this.ui.showToast(msg, 'error');
      }
    } catch (e: any) {
      this.ui.showToast(e?.message || 'Erro ao excluir empresa', 'error');
    }
  }

  addUnit(nameInput: HTMLInputElement, cnpjInput: HTMLInputElement) {
    const name = (nameInput?.value || '').trim();
    const cnpj = (cnpjInput?.value || '').trim();
    if (!name) { this.ui.showToast('Nome da unidade é obrigatório', 'error'); return; }
    // CNPJ é opcional na unidade
    if (cnpj && !this.validateCNPJ(cnpj)) { this.ui.showToast('CNPJ inválido', 'error'); return; }
    const cleanCnpj = cnpj ? this.onlyDigits(cnpj) : '';
    this.dynamicUnits.push({ name, ...(cleanCnpj ? { cnpj: cleanCnpj } : {}) });
    nameInput.value = ''; cnpjInput.value = '';
  }

  removeUnit(idx: number) { this.dynamicUnits.splice(idx,1); }

  async removeUnitWithDelete(idx: number) {
    const unit = this.dynamicUnits[idx];
    if (!unit.id) {
      // Unidade nova sem ID, apenas remove da lista
      this.dynamicUnits.splice(idx, 1);
      return;
    }
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/units/${unit.id}`, {
        method: 'DELETE',
        headers: this.legacy.authHeaders()
      });
      if (resp.status === 204) {
        this.dynamicUnits.splice(idx, 1);
        this.ui.showToast('Unidade removida com sucesso', 'success');
      } else if (resp.status === 409) {
        this.ui.showToast('Esta unidade não pode ser excluída, pois está sendo usada...', 'error');
      } else {
        const txt = await resp.text().catch(() => '');
        let msg = `Erro ao remover unidade (status ${resp.status})`;
        try { const parsed = JSON.parse(txt); msg = parsed.message || parsed.error || msg; } catch(e) {}
        this.ui.showToast(msg, 'error');
      }
    } catch (e: any) {
      this.ui.showToast(e?.message || 'Erro ao remover unidade', 'error');
    }
  }

  removeSector(idx: number) { this.dynamicSectors.splice(idx,1); }

  addSector(nameInput: HTMLInputElement) {
    const name = (nameInput?.value || '').trim();
    if (!name) { this.ui.showToast('Nome do setor é obrigatório', 'error'); return; }
    if (this.dynamicSectors.includes(name)) { this.ui.showToast('Este setor já foi adicionado', 'error'); return; }
    this.dynamicSectors.push(name);
    nameInput.value = '';
  }

  async removeSectorWithDelete(idx: number) {
    const sector = this.dynamicSectors[idx];
    if (typeof sector === 'string') {
      // Setor novo sem ID, apenas remove da lista
      this.dynamicSectors.splice(idx, 1);
      return;
    }
    const sectorId = (sector as any).id;
    if (!sectorId) {
      this.dynamicSectors.splice(idx, 1);
      return;
    }
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/sectors/${sectorId}`, {
        method: 'DELETE',
        headers: this.legacy.authHeaders()
      });
      if (resp.status === 204) {
        this.dynamicSectors.splice(idx, 1);
        this.ui.showToast('Setor removido com sucesso', 'success');
      } else if (resp.status === 409) {
        this.ui.showToast('Este setor não pode ser excluído, pois está sendo usado...', 'error');
      } else {
        const txt = await resp.text().catch(() => '');
        let msg = `Erro ao remover setor (status ${resp.status})`;
        try { const parsed = JSON.parse(txt); msg = parsed.message || parsed.error || msg; } catch(e) {}
        this.ui.showToast(msg, 'error');
      }
    } catch (e: any) {
      this.ui.showToast(e?.message || 'Erro ao remover setor', 'error');
    }
  }

  async submitCreateCompany() {
    this.companyFormMsg = '';
    if (this.companyForm.invalid) { this.companyFormMsg = 'Preencha os campos obrigatórios.'; return; }
    const val = this.companyForm.value;
    const cnpj = val.companyCnpj || '';
    if (!this.validateCNPJ(cnpj)) { this.companyFormMsg = 'CNPJ inválido.'; return; }
    const payload: any = {
      name: val.companyName,
      cnpj: this.onlyDigits(cnpj),
      units: this.dynamicUnits
        .map((u: any) => {
          const obj: any = { name: u.name };
          if (u.cnpj && u.cnpj.toString().trim()) {
            obj.cnpj = this.onlyDigits(u.cnpj);
          }
          return obj;
        }),
      sectors: this.dynamicSectors
    };
    this.loadingCompanyForm = true;
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/companies`, {
        method: 'POST',
        headers: { ...this.legacy.authHeaders() },
        body: JSON.stringify(payload)
      });
      const txt = await resp.text().catch(()=>'');
      if (!resp.ok) {
        let serverMsg = txt || `Erro ao criar empresa (status ${resp.status})`;
        try { const parsed = JSON.parse(txt); serverMsg = parsed.message || parsed.error || serverMsg; } catch(e) {}
        this.ui.showToast(serverMsg, 'error');
        throw new Error(serverMsg);
      }
      this.companyFormMsg = '✅ Empresa criada com sucesso!';
      this.companyForm.reset();
      this.dynamicUnits = []; this.dynamicSectors = [];
      setTimeout(() => this.loadCompanies(), 500);
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      if (errorMsg.includes('Failed to fetch') || errorMsg.toLowerCase().includes('timeout')) {
        this.companyFormMsg = '⚠️ Timeout na conexão. O servidor está demorando mais do que o normal. Tente novamente em alguns segundos...';
      } else {
        this.companyFormMsg = `❌ ${errorMsg}`;
      }
    } finally {
      this.loadingCompanyForm = false;
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

  // Buscar dados do CNPJ e preencher razão social
  async fetchCnpjData(cnpj: string, field: 'company' | 'unit', index?: number) {
    const cleanCnpj = this.onlyDigits(cnpj);
    if (!cleanCnpj || cleanCnpj.length !== 14 || !this.validateCNPJ(cleanCnpj)) {
      return; // CNPJ inválido, não fazer a busca
    }

    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/external/cnpj/${cleanCnpj}`, {
        headers: this.legacy.authHeaders()
      });
      
      if (!resp.ok) {
        return; // Falha na busca, não preencher nada
      }

      const data = await resp.json();
      // Tenta diferentes chaves possíveis da resposta
      const socialName = data.razao_social || data.socialName || data.nome || data.name || '';

      if (!socialName) {
        return; // Nenhum nome encontrado, não preencher
      }

      if (field === 'company') {
        // Preencher campo de empresa
        this.companyForm.patchValue({ companyName: socialName });
      } else if (field === 'unit' && typeof index === 'number') {
        // Preencher nome da unidade
        if (this.dynamicUnits[index]) {
          this.dynamicUnits[index].name = socialName;
        }
      }
    } catch (e: any) {
      // Silenciosamente ignorar erros na busca automática
      console.debug('Erro ao buscar CNPJ:', e);
    }
  }

  // Trigger busca de CNPJ com debounce
  onCnpjChange(cnpj: string, field: 'company' | 'unit', index?: number) {
    this.cnpjSearchSubject.next({ cnpj, field, index });
  }

  // Busca CNPJ específica para unidade (preenche o input de nome antes de adicionar)
  async onUnitCnpjChange(cnpj: string, nameInput: HTMLInputElement) {
    const cleanCnpj = this.onlyDigits(cnpj);
    if (!cleanCnpj || cleanCnpj.length !== 14 || !this.validateCNPJ(cleanCnpj)) {
      return; // CNPJ inválido, não fazer a busca
    }

    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/external/cnpj/${cleanCnpj}`, {
        headers: this.legacy.authHeaders()
      });
      
      if (!resp.ok) {
        return; // Falha na busca, não preencher nada
      }

      const data = await resp.json();
      // Tenta diferentes chaves possíveis da resposta
      const socialName = data.razao_social || data.socialName || data.nome || data.name || '';

      if (socialName && nameInput) {
        nameInput.value = socialName;
      }
    } catch (e: any) {
      // Silenciosamente ignorar erros na busca automática
      console.debug('Erro ao buscar CNPJ:', e);
    }
  }

  // Editar Empresa
  openEditCompanyModal(company: any) {
    this.editingCompanyId = company.id;
    this.editCompanyForm.patchValue({
      companyName: company.name,
      companyCnpj: company.cnpj
    });
    // Limpar unidades: remover cnpj vazio/null
    this.dynamicUnits = (company.units || []).map((u: any) => {
      const obj: any = { name: u.name };
      if (u.cnpj && u.cnpj.toString().trim()) {
        obj.cnpj = u.cnpj;
      }
      return obj;
    });
    // Converter setores do formato de objeto para string (se necessário)
    this.dynamicSectors = (company.sectors || []).map((s: any) => typeof s === 'string' ? s : s.name);
    this.showEditCompanyModal = true;
    this.editCompanyFormMsg = '';
  }

  closeEditCompanyModal() {
    this.showEditCompanyModal = false;
    this.editingCompanyId = null;
    this.editCompanyForm.reset();
    this.dynamicUnits = [];
    this.dynamicSectors = [];
    this.editCompanyFormMsg = '';
  }

  async submitEditCompany() {
    this.editCompanyFormMsg = '';
    if (this.editCompanyForm.invalid) { this.editCompanyFormMsg = 'Preencha os campos obrigatórios.'; return; }
    if (!this.editingCompanyId) return;

    const val = this.editCompanyForm.value;
    const cnpj = val.companyCnpj || '';
    if (!this.validateCNPJ(cnpj)) { this.editCompanyFormMsg = 'CNPJ inválido.'; return; }

    const payload: any = {
      name: val.companyName,
      cnpj: this.onlyDigits(cnpj),
      units: this.dynamicUnits
        .map((u: any) => {
          const obj: any = { name: u.name };
          if (u.cnpj && u.cnpj.toString().trim()) {
            obj.cnpj = this.onlyDigits(u.cnpj);
          }
          return obj;
        }),
      sectors: this.dynamicSectors
    };

    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/companies/${this.editingCompanyId}`, {
        method: 'PUT',
        headers: { ...this.legacy.authHeaders() },
        body: JSON.stringify(payload)
      });
      const txt = await resp.text().catch(()=>'');
      if (!resp.ok) {
        let serverMsg = txt || `Erro ao atualizar empresa (status ${resp.status})`;
        try { const parsed = JSON.parse(txt); serverMsg = parsed.message || parsed.error || serverMsg; } catch(e) {}
        this.ui.showToast(serverMsg, 'error');
        throw new Error(serverMsg);
      }
      this.editCompanyFormMsg = 'Empresa atualizada com sucesso.';
      this.ui.showToast('Empresa atualizada com sucesso', 'success');
      setTimeout(() => this.closeEditCompanyModal(), 1500);
      this.loadCompanies();
    } catch (e: any) {
      this.editCompanyFormMsg = e?.message || String(e);
    }
  }
}
