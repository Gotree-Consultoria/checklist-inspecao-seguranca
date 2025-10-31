import { Component, inject, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../services/ui.service';
import { ReportService } from '../../../services/report.service';
import { SignatureModalComponent } from '../../shared/signature-modal/signature-modal.component';

@Component({
  standalone: true,
  selector: 'app-checklist-nr',
  imports: [CommonModule, SignatureModalComponent],
  templateUrl: './checklist-nr.component.html',
  styleUrls: ['./checklist-nr.component.css']
})
export class ChecklistNrComponent {
  private ui = inject(UiService);
  private report = inject(ReportService);
  private host = inject(ElementRef);

  companies: Array<any> = [];

  saveChecklist(e?: Event) {
    if (e) e.preventDefault();
    // coletar valores dos checkboxes
    try {
      const data: any = {};
      const checks = Array.from(document.querySelectorAll<HTMLInputElement>('#checklist-nr-form input[type=checkbox]'));
      data.checked = checks.filter(c => c.checked).map(c => c.getAttribute('data-key'));
      data.title = (document.getElementById('reportTitleNR') as HTMLInputElement)?.value || 'Checklist NR';
      data.date = (document.getElementById('dataInspecaoNR') as HTMLInputElement)?.value || new Date().toISOString().substring(0,10);
      data.notes = (document.getElementById('anotacoesNR') as HTMLTextAreaElement)?.value || '';
      this.pendingPayload = data;
      this.saveChecklistLocally(data);
    } catch (err: any) {
      console.error('saveChecklist error', err);
      this.ui.showToast('Erro ao salvar checklist localmente.', 'error');
    }
  }
  
  @ViewChild('nrSignatureModal', { static: false }) nrSignatureModal!: SignatureModalComponent;
  
  // payload collected before opening signature modal
  pendingPayload: any = null;

  async ngOnInit(): Promise<void> {
    // Carrega empresas do backend e popula dropdown
    try {
      if (this.report && typeof this.report.fetchCompanies === 'function') {
        const companiesData = await this.report.fetchCompanies();
        if (Array.isArray(companiesData)) {
          this.companies = companiesData;
          this.populateCompanyDropdownNR();
        }
      }
    } catch (err) {
      console.warn('[ChecklistNR] Falha ao carregar empresas', err);
      this.ui.showToast('Falha ao carregar empresas.', 'error', 3000);
    }

    // Wire change listener on empresaClienteNR to populate unidades/setores
    try {
      const selectEl = this.host?.nativeElement?.querySelector('#empresaClienteNR') as HTMLSelectElement;
      if (selectEl) {
        selectEl.addEventListener('change', (e: any) => this.onCompanyChangeNR(e));
      }
    } catch (e) { /* ignore */ }
  }
  
  saveChecklistLocally(payload: any) {
    try {
      const saved = JSON.parse(localStorage.getItem('savedChecklistNR') || '[]');
      saved.push({ id: Date.now(), createdAt: new Date().toISOString(), payload });
      localStorage.setItem('savedChecklistNR', JSON.stringify(saved));
      this.ui.showToast('Checklist (NR) salvo localmente. Implementar envio ao backend quando disponível.', 'success', 4000);
    } catch (err: any) {
      console.error('saveChecklist error', err);
      this.ui.showToast('Erro ao salvar checklist localmente.', 'error');
    }
  }
  
  openSignatureModal(e?: Event) {
    if (e) e.preventDefault();
    // collect form values into pendingPayload
    const data: any = {};
    const checks = Array.from(document.querySelectorAll<HTMLInputElement>('#checklist-nr-form input[type=checkbox]'));
    data.checked = checks.filter(c => c.checked).map(c => c.getAttribute('data-key'));
    data.title = (document.getElementById('reportTitleNR') as HTMLInputElement)?.value || 'Checklist NR';
    data.date = (document.getElementById('dataInspecaoNR') as HTMLInputElement)?.value || new Date().toISOString().substring(0,10);
    data.notes = (document.getElementById('anotacoesNR') as HTMLTextAreaElement)?.value || '';
    // header fields
    data.company = (document.getElementById('empresaClienteNR') as HTMLSelectElement)?.value || '';
    data.cnpj = (document.getElementById('empresaCnpjNR') as HTMLInputElement)?.value || '';
    data.unit = (document.getElementById('empresaUnidadeNR') as HTMLSelectElement)?.value || '';
    data.sector = (document.getElementById('empresaSetorNR') as HTMLSelectElement)?.value || '';
    data.responsible = (document.getElementById('responsavelNR') as HTMLInputElement)?.value || '';
    data.responsibleSigla = (document.getElementById('responsavelSiglaNR') as HTMLInputElement)?.value || '';
    data.responsibleRegistro = (document.getElementById('responsavelRegistroNR') as HTMLInputElement)?.value || '';
    data.location = (document.getElementById('localInspecaoNR') as HTMLInputElement)?.value || '';
  
    this.pendingPayload = data;
    // open shared signature modal
    try {
      this.nrSignatureModal.open();
    } catch (err) {
      // fallback: show toast and save locally directly
      this.saveChecklistLocally(this.pendingPayload);
    }
  }
  
  onSignaturesConfirmed(signs: any) {
    // combine signatures into payload and save locally
    const finalPayload = Object.assign({}, this.pendingPayload || {});
    finalPayload.signatures = signs;
    this.saveChecklistLocally(finalPayload);
    this.pendingPayload = null;
  }

  private populateCompanyDropdownNR(): void {
    try {
      const selectElement = this.host.nativeElement.querySelector('#empresaClienteNR') as HTMLSelectElement;
      if (!selectElement) return;

      // remove opções existentes mantendo placeholder se houver
      while (selectElement.options.length > 0) selectElement.remove(0);

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Selecione uma empresa';
      selectElement.appendChild(placeholder);

      this.companies.forEach((company: any) => {
        const option = document.createElement('option');
        const companyId = company.id || company._id || '';
        const companyName = company.name || company.razaoSocial || company.nomeFantasia || 'Sem nome';
        option.value = companyId;
        option.textContent = companyName;
        option.setAttribute('data-company', JSON.stringify(company));
        selectElement.appendChild(option);
      });
    } catch (e) {
      console.warn('[ChecklistNR] Erro ao popular dropdown de empresas', e);
    }
  }

  private onCompanyChangeNR(e: Event): void {
    try {
      const selectElement = e.target as HTMLSelectElement;
      const selectedCompanyId = selectElement.value;
      if (!selectedCompanyId) {
        this.clearCompanyFieldsNR();
        return;
      }

      let selectedOption: HTMLOptionElement | null = null;
      try { selectedOption = selectElement.options[selectElement.selectedIndex] as HTMLOptionElement; } catch(_) { selectedOption = null; }

      let selectedCompany: any = null;
      if (selectedOption) {
        const dataAttr = selectedOption.getAttribute('data-company');
        if (dataAttr) {
          try { selectedCompany = JSON.parse(dataAttr); } catch (_) { selectedCompany = null; }
        }
      }

      if (!selectedCompany) {
        selectedCompany = this.companies.find((c: any) => {
          const cid = c && (c.id || c._id || c.companyId || c._companyId);
          return String(cid) === String(selectedCompanyId);
        });
      }

      if (selectedCompany) {
        const cnpjInput = this.host.nativeElement.querySelector('#empresaCnpjNR') as HTMLInputElement;
        if (cnpjInput) {
          const cnpjValue = selectedCompany.cnpj || selectedCompany.documentNumber || selectedCompany.document || selectedCompany.cpfCnpj || '';
          cnpjInput.value = cnpjValue || '';
        }
        this.populateUnidadesNR(selectedCompany);
        this.populateSetoresNR(selectedCompany);
      } else {
        this.clearCompanyFieldsNR();
      }
    } catch (err) {
      console.warn('[ChecklistNR] Erro onCompanyChangeNR', err);
    }
  }

  private clearCompanyFieldsNR(): void {
    try {
      const cnpjInput = this.host.nativeElement.querySelector('#empresaCnpjNR') as HTMLInputElement;
      const unidadeSelect = this.host.nativeElement.querySelector('#empresaUnidadeNR') as HTMLSelectElement;
      const setorSelect = this.host.nativeElement.querySelector('#empresaSetorNR') as HTMLSelectElement;

      if (cnpjInput) cnpjInput.value = '';
      if (unidadeSelect) {
        unidadeSelect.disabled = true;
        unidadeSelect.innerHTML = '<option value="">Selecione uma empresa primeiro</option>';
      }
      if (setorSelect) {
        setorSelect.disabled = true;
        setorSelect.innerHTML = '<option value="">Selecione uma empresa primeiro</option>';
      }
    } catch (e) { console.warn(e); }
  }

  private populateUnidadesNR(company: any): void {
    try {
      const unidadeSelect = this.host.nativeElement.querySelector('#empresaUnidadeNR') as HTMLSelectElement;
      if (!unidadeSelect) return;
      unidadeSelect.innerHTML = '<option value="">Selecione uma unidade</option>';
      unidadeSelect.disabled = false;

      const unidades = company.units || company.unidades || company.branches || [];
      if (Array.isArray(unidades) && unidades.length > 0) {
        unidades.forEach((unit: any) => {
          const option = document.createElement('option');
          option.value = unit.id || unit._id || unit.name || '';
          option.textContent = unit.name || unit.nomeFantasia || unit.address || 'Sem nome';
          unidadeSelect.appendChild(option);
        });
      }
    } catch (e) { console.warn(e); }
  }

  private populateSetoresNR(company: any): void {
    try {
      const setorSelect = this.host.nativeElement.querySelector('#empresaSetorNR') as HTMLSelectElement;
      if (!setorSelect) return;
      setorSelect.innerHTML = '<option value="">Selecione um setor</option>';
      setorSelect.disabled = false;

      const setores = company.sectors || company.setores || company.departments || [];
      if (Array.isArray(setores) && setores.length > 0) {
        setores.forEach((setor: any) => {
          const option = document.createElement('option');
          option.value = setor.id || setor._id || setor.name || '';
          option.textContent = setor.name || setor.nomeDepartamento || 'Sem nome';
          setorSelect.appendChild(option);
        });
      }
    } catch (e) { console.warn(e); }
  }
}
