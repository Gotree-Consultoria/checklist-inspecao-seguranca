import { Component, OnInit, AfterViewInit, Renderer2, ElementRef, inject, ViewEncapsulation, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { ChecklistService } from '../../../services/checklist.service';
import { ReportService } from '../../../services/report.service';
import { ChecklistSection } from '../../../data/checklist.data';
import { SignatureModalComponent } from '../../shared/signature-modal/signature-modal.component';

@Component({
  standalone: true,
  selector: 'app-checklist',
  imports: [CommonModule, SignatureModalComponent],
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ChecklistComponent implements OnInit, AfterViewInit {
  @ViewChild(SignatureModalComponent) signatureModal!: SignatureModalComponent;

  private legacy = inject(LegacyService);
  private ui = inject(UiService);
  private renderer = inject(Renderer2);
  private host = inject(ElementRef) as ElementRef<HTMLElement>;
  private checklistService = inject(ChecklistService) as ChecklistService;
  private reportService = inject(ReportService) as ReportService;

  checklistData: ChecklistSection[] = [];

  constructor() {}

  ngOnInit(): void {
    // carregar dados tipados do service
    try {
      const sections = this.checklistService.getAllSections();
      this.checklistData = sections as any[];
    } catch (err) {
      console.warn('ChecklistService não pôde fornecer dados, usando fallback local.', err);
      this.checklistData = [];
    }
  }

  ngAfterViewInit(): void {
    // garantir render após a view estar pronta
    requestAnimationFrame(() => this.renderChecklistForm());
    // Carregar empresas no dropdown ao ter foco
    this.setupCompanySelector();
    // Carregar dados do usuário autenticado
    this.loadUserResponsibleData();
  }

  private async loadUserResponsibleData() {
    try {
      const userProfile = await this.legacy.fetchUserProfile();
      if (userProfile) {
        const hostEl = this.host.nativeElement as HTMLElement;
        
        // Preencher responsável
        const responsavelInput = hostEl.querySelector('#responsavel') as HTMLInputElement;
        if (responsavelInput && userProfile.name) {
          responsavelInput.value = userProfile.name;
        }

        // Preencher sigla do conselho
        const siglaInput = hostEl.querySelector('#responsavelSigla') as HTMLInputElement;
        if (siglaInput && userProfile.sigla) {
          siglaInput.value = userProfile.sigla;
        }

        // Preencher registro do conselho
        const registroInput = hostEl.querySelector('#responsavelRegistro') as HTMLInputElement;
        if (registroInput && userProfile.registro) {
          registroInput.value = userProfile.registro;
        }
      }
    } catch (err) {
      console.warn('Não foi possível carregar dados do usuário:', err);
    }
  }

  setupCompanySelector() {
    const empresaSelect = this.host.nativeElement.querySelector('#empresaCliente') as HTMLSelectElement | null;
    if (!empresaSelect) return;

    const loadCompanies = async () => {
      // se já carregado, não refaz
      if (empresaSelect.options.length > 1) return;
      
      try {
        const list = await this.reportService.fetchCompanies();
        // limpar e popular
        empresaSelect.innerHTML = '<option value="">Selecione a empresa</option>';
        if (Array.isArray(list)) {
          list.forEach((c: any) => {
            const opt = document.createElement('option');
            opt.value = c.id || '';
            opt.textContent = c.name || c.nome || 'Sem nome';
            opt.dataset['cnpj'] = c.cnpj || '';
            opt.dataset['units'] = JSON.stringify(c.units || []);
            opt.dataset['sectors'] = JSON.stringify(c.sectors || []);
            empresaSelect.appendChild(opt);
          });
        }
      } catch (err) {
        console.warn('fetchCompanies falhou', err);
        this.ui.showToast('Não foi possível carregar empresas do servidor.', 'error', 5000);
      }
    };

    // Disparar ao clicar ou focar no dropdown
    empresaSelect.addEventListener('mousedown', loadCompanies);
    empresaSelect.addEventListener('focus', loadCompanies);

    // Ao mudar a seleção de empresa, carregar CNPJ, unidades e setores
    empresaSelect.addEventListener('change', (e: any) => {
      this.handleCompanySelection(e.target);
    });
  }

  private handleCompanySelection(empresaSelect: HTMLSelectElement) {
    const selectedOption = empresaSelect.options[empresaSelect.selectedIndex];
    const hostEl = this.host.nativeElement as HTMLElement;

    // Limpar campos
    const cnpjInput = hostEl.querySelector('#empresaCnpj') as HTMLInputElement;
    const unidadeSelect = hostEl.querySelector('#empresaUnidade') as HTMLSelectElement;
    const setorSelect = hostEl.querySelector('#empresaSetor') as HTMLSelectElement;

    if (!selectedOption || !selectedOption.value) {
      // Empresa não selecionada
      if (cnpjInput) cnpjInput.value = '';
      if (unidadeSelect) {
        unidadeSelect.innerHTML = '<option value="">Selecione a unidade</option>';
        unidadeSelect.disabled = true;
      }
      if (setorSelect) {
        setorSelect.innerHTML = '<option value="">Selecione o setor</option>';
        setorSelect.disabled = true;
      }
      return;
    }

    // Preencher CNPJ
    const cnpj = selectedOption.dataset['cnpj'] || '';
    if (cnpjInput) cnpjInput.value = cnpj;

    // Carregar unidades
    const unitsStr = selectedOption.dataset['units'] || '[]';
    const units = JSON.parse(unitsStr);
    if (unidadeSelect) {
      unidadeSelect.innerHTML = '<option value="">Selecione a unidade</option>';
      if (Array.isArray(units) && units.length > 0) {
        units.forEach((unit: any) => {
          const opt = document.createElement('option');
          opt.value = unit.id || unit;
          opt.textContent = unit.name || unit.nome || unit;
          unidadeSelect.appendChild(opt);
        });
        unidadeSelect.disabled = false;
      } else {
        unidadeSelect.disabled = true;
      }
    }

    // Carregar setores
    const sectorsStr = selectedOption.dataset['sectors'] || '[]';
    const sectors = JSON.parse(sectorsStr);
    if (setorSelect) {
      setorSelect.innerHTML = '<option value="">Selecione o setor</option>';
      if (Array.isArray(sectors) && sectors.length > 0) {
        sectors.forEach((sector: any) => {
          const opt = document.createElement('option');
          opt.value = sector.id || sector;
          opt.textContent = sector.name || sector.nome || sector;
          setorSelect.appendChild(opt);
        });
        setorSelect.disabled = false;
      } else {
        setorSelect.disabled = true;
      }
    }
  }

  renderChecklistForm() {
    const container: HTMLElement | null = this.host.nativeElement.querySelector('#checklistContainer');
    if (!container) return;
    let html = '';
    this.checklistData.forEach(section => {
      const isNa = section.naOption;
      html += `<div class="section-container">
        <div class="section-header">
          <span class="section-number">${section.sectionId}</span>
          <h3 class="section-title"> ${section.sectionTitle}</h3>
          ${isNa ? `<div class="na-option"><input type="checkbox" id="na-${section.sectionId}" name="na-${section.sectionId}"><label for="na-${section.sectionId}">Não se Aplica</label></div>` : ''}
        </div>
        <div class="section-items ${isNa? 'collapsible':''}" id="items-${section.sectionId}">`;
      section.items.forEach((item:any) => {
        const itemNa = item.naOption ? `<label class="item-na"><input type="checkbox" class="item-na-checkbox" id="na-item-${item.id}" data-item="${item.id}" /> Não se Aplica</label>` : '';
        html += `<div class="checklist-item">
            <p class="question-text">${item.id} - ${item.text}</p>
            <div class="radio-options">
              <span class="radio-pill"><input type="radio" id="q-${item.id}-sim" name="q-${item.id}" value="sim" required><label for="q-${item.id}-sim">Sim</label></span>
              <span class="radio-pill"><input type="radio" id="q-${item.id}-nao" name="q-${item.id}" value="nao"><label for="q-${item.id}-nao">Não</label></span>
              ${itemNa}
            </div>
          </div>`;
      });
      html += `</div></div>`;
    });
    container.innerHTML = html;
    this.addCollapsibleListeners();
    // bind item NA toggles (visual state + disable inputs)
    container.querySelectorAll('.item-na-checkbox').forEach((el:any) => {
      el.addEventListener('change', (e:any) => {
        const itemId = el.dataset.item;
        if (!itemId) return;
        const itemEl = container.querySelector(`#items-${itemId}`) ? container.querySelector(`#items-${itemId} .checklist-item`) : container.querySelector(`.checklist-item:has(.item-na-checkbox[data-item="${itemId}"])`);
        // fallback search
        const radios = Array.from(container.querySelectorAll(`input[name="q-${itemId}"]`)) as HTMLInputElement[];
        const labels = Array.from(container.querySelectorAll(`label[for^="q-${itemId}-"]`)) as HTMLLabelElement[];
        if (el.checked) {
          // Desabilitar: limpar seleção, desabilitar e remover required
          radios.forEach(r => { 
            r.checked = false;
            r.disabled = true;
            r.removeAttribute('required');
          });
          labels.forEach(l => l.setAttribute('aria-disabled','true'));
          if (itemEl) (itemEl as HTMLElement).classList.add('na-checked');
        } else {
          // Reabilitar: remover disabled e restaurar required
          radios.forEach(r => { 
            r.disabled = false;
            r.setAttribute('required','required');
          });
          labels.forEach(l => l.removeAttribute('aria-disabled'));
          if (itemEl) (itemEl as HTMLElement).classList.remove('na-checked');
        }
      });
    });
  }

  addCollapsibleListeners(){
    const hostEl = this.host.nativeElement as HTMLElement;
    hostEl.querySelectorAll('.na-option input[type="checkbox"]').forEach((checkbox:any) => {
      checkbox.addEventListener('change', (event:any)=>{
        const sectionId = (event.target.id || '').split('-')[1];
        const sectionItems = hostEl.querySelector(`#items-${sectionId}`) as HTMLElement | null;
        if (!sectionItems) return;
        if (event.target.checked) {
          // Seção marcada como NA: ocultar, desabilitar e remover required
          sectionItems.style.display = 'none';
          const radioButtons = Array.from(sectionItems.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
          radioButtons.forEach(r => { 
            r.checked = false;
            r.disabled = true;
            r.removeAttribute('required');
          });
        } else {
          // Seção reabilitada: mostrar, reabilitar e restaurar required
          sectionItems.style.display = 'block';
          const radioButtons = Array.from(sectionItems.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
          radioButtons.forEach(r => { 
            // Verificar se o item específico não está marcado como NA
            const itemContainer = r.closest('.checklist-item');
            const itemNaCheckbox = itemContainer?.querySelector('.item-na-checkbox') as HTMLInputElement;
            if (!itemNaCheckbox?.checked) {
              r.disabled = false;
              r.setAttribute('required','required');
            }
          });
        }
      });
    });
  }

  async handleChecklistSubmit(e:any){
    e.preventDefault();
    
    // Validar que todos os itens obrigatórios estejam respondidos
    const hostEl = this.host.nativeElement as HTMLElement;
    const allRadios = Array.from(hostEl.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    
    // Agrupar radios por nome e validar
    const radiosByName = new Map<string, HTMLInputElement[]>();
    allRadios.forEach(radio => {
      if (!radiosByName.has(radio.name)) {
        radiosByName.set(radio.name, []);
      }
      radiosByName.get(radio.name)!.push(radio);
    });

    // Validar que cada grupo obrigatório tenha uma resposta (a menos que desabilitado)
    let isValid = true;
    radiosByName.forEach((radios, name) => {
      // Se todos os radios do grupo estão desabilitados, pular validação
      const allDisabled = radios.every(r => r.disabled);
      if (allDisabled) return;
      
      // Se algum está habilitado, deve ter pelo menos um selecionado
      const isRequired = radios.some(r => r.required && !r.disabled);
      if (isRequired && !radios.some(r => r.checked && !r.disabled)) {
        isValid = false;
        console.warn(`Campo obrigatório não preenchido: ${name}`);
      }
    });

    if (!isValid) {
      this.ui.showToast('Por favor, preencha todos os campos obrigatórios.', 'warning', 5000);
      return;
    }

    // Recolhe seções e itens do DOM para montar o payload (equivalente ao legacy)
    const sections: any[] = [];
    hostEl.querySelectorAll('.section-container').forEach(sectionEl => {
      const sectionTitle = (sectionEl.querySelector('.section-title')?.textContent || '').trim();
      const isSectionNa = !!(sectionEl.querySelector('.na-option input[type="checkbox"]') as HTMLInputElement)?.checked;
      const items: any[] = [];
      sectionEl.querySelectorAll('.checklist-item').forEach(itemEl => {
        const idTxt = (itemEl.querySelector('.question-text')?.textContent || '').trim();
        const radios = Array.from(itemEl.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
        let checked = null;
        radios.forEach(r => { if (r.checked) checked = (r.value === 'sim'); });
        const isItemNa = !!(itemEl.querySelector('.item-na-checkbox') as HTMLInputElement)?.checked;
        items.push({ description: idTxt, checked: isItemNa ? false : !!checked, na: isItemNa });
      });
      sections.push({ title: sectionTitle || 'Seção sem título', na: isSectionNa, items });
    });

    // Armazenar dados para quando as assinaturas forem confirmadas
    (window as any).__checklistData = {
      sections,
      metadata: {
        title: (this.host.nativeElement.querySelector('#reportTitle') as HTMLInputElement)?.value,
        dataInspecao: (this.host.nativeElement.querySelector('#dataInspecao') as HTMLInputElement)?.value,
        responsavel: (this.host.nativeElement.querySelector('#responsavel') as HTMLInputElement)?.value,
        anotacoes: (this.host.nativeElement.querySelector('#anotacoes') as HTMLTextAreaElement)?.value,
        observacoes: (this.host.nativeElement.querySelector('#observacoes') as HTMLTextAreaElement)?.value,
      }
    };

    // Abrir modal de assinatura do Angular
    if (this.signatureModal) {
      await this.signatureModal.open();
    } else {
      this.ui.showToast('Erro ao abrir modal de assinatura.', 'error', 5000);
    }
  }

  onSignaturesConfirmed(data: any) {
    // Dados das assinaturas foram coletados
    const checklistData = (window as any).__checklistData;
    
    if (!checklistData) {
      this.ui.showToast('Erro: dados do checklist não encontrados.', 'error', 5000);
      return;
    }

    // Preparar payload completo com assinaturas
    const payload = {
      sections: checklistData.sections,
      metadata: checklistData.metadata,
      signatures: {
        tech: {
          name: data.techName,
          signature: data.techSignature,
        },
        client: {
          name: data.clientName,
          signature: data.clientSignature,
        }
      }
    };

    // Salvar via ReportService
    this.saveChecklistWithSignatures(payload);
  }

  private async saveChecklistWithSignatures(payload: any) {
    try {
      const result = await this.reportService.postInspectionReport(payload);
      this.ui.showToast('Checklist salvo com sucesso!', 'success', 5000);
      // Redirecionar para página de sucesso ou histórico
      window.location.href = '/#/group';
    } catch (err) {
      console.error('Erro ao salvar checklist:', err);
      this.ui.showToast('Erro ao salvar checklist. Tente novamente.', 'error', 5000);
    }
  }
}
