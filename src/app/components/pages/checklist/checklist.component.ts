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
    // Inicializa `checklistData` a partir do service
    try {
      const sections = this.checklistService.getAllSections();
      this.checklistData = sections as any[];
    } catch (err) {
      this.checklistData = [];
    }
  }

  ngAfterViewInit(): void {
    // Inicializações após a renderização
    requestAnimationFrame(() => this.renderChecklistForm());
    this.setupCompanySelector();
    this.loadUserResponsibleData();
  }

  private async loadUserResponsibleData() {
    try {
      const userProfile = await this.legacy.fetchUserProfile();
      if (userProfile) {
        const hostEl = this.host.nativeElement as HTMLElement;

        const responsavelInput = hostEl.querySelector('#responsavel') as HTMLInputElement;
        if (responsavelInput && userProfile.name) {
          responsavelInput.value = userProfile.name;
        }

        const siglaInput = hostEl.querySelector('#responsavelSigla') as HTMLInputElement;
        if (siglaInput) {
          const sigla = userProfile.councilAcronym || userProfile.siglaConselhoClasse || userProfile.conselhoSigla || 
                       userProfile.sigla || userProfile.siglaConselho || userProfile.conselho || userProfile.council || 
                       userProfile.acronym || userProfile.codigoConselho || '';
          if (sigla) {
            siglaInput.value = sigla;
          }
        }

    const registroInput = hostEl.querySelector('#responsavelRegistro') as HTMLInputElement;
        if (registroInput) {
          const registro = userProfile.councilNumber || userProfile.conselhoClasse || userProfile.registration || 
                          userProfile.registro || userProfile.conselhoRegistro || userProfile.registrationNumber || 
                          userProfile.crm || userProfile.crea || userProfile.numeroRegistro || userProfile.registroProfissional || '';
          if (registro) {
            registroInput.value = registro;
          }
        }
      }
    } catch (err) {
    }
  }

  setupCompanySelector() {
    const empresaSelect = this.host.nativeElement.querySelector('#empresaCliente') as HTMLSelectElement | null;
    if (!empresaSelect) return;

    const loadCompanies = async () => {
  if (empresaSelect.options.length > 1) return;
      
      try {
        const list = await this.reportService.fetchCompanies();
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
        this.ui.showToast('Não foi possível carregar empresas do servidor.', 'error', 5000);
      }
    };

    empresaSelect.addEventListener('mousedown', loadCompanies);
    empresaSelect.addEventListener('focus', loadCompanies);
    empresaSelect.addEventListener('change', (e: any) => this.handleCompanySelection(e.target));
  }

  private handleCompanySelection(empresaSelect: HTMLSelectElement) {
    const selectedOption = empresaSelect.options[empresaSelect.selectedIndex];
    const hostEl = this.host.nativeElement as HTMLElement;

  // Atualiza campos da seleção
    const cnpjInput = hostEl.querySelector('#empresaCnpj') as HTMLInputElement;
    const unidadeSelect = hostEl.querySelector('#empresaUnidade') as HTMLSelectElement;
    const setorSelect = hostEl.querySelector('#empresaSetor') as HTMLSelectElement;

    if (!selectedOption || !selectedOption.value) {
      // Nenhuma empresa selecionada
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

  // Preenche CNPJ
    const cnpj = selectedOption.dataset['cnpj'] || '';
    if (cnpjInput) cnpjInput.value = cnpj;

  // Preenche unidades
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

  // Preenche setores
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
    container.querySelectorAll('.item-na-checkbox').forEach((el:any) => {
      el.addEventListener('change', (e:any) => {
        const itemId = el.dataset.item;
        if (!itemId) return;
        const escapedItemId = itemId.replace(/[.#:]/g, '\\$&');
        let itemEl = null;
        try {
          itemEl = container.querySelector(`#items-${escapedItemId}`) ? 
                   container.querySelector(`#items-${escapedItemId} .checklist-item`) : 
                   container.querySelector(`.checklist-item:has(.item-na-checkbox[data-item="${itemId}"])`);
        } catch (_) { itemEl = null; }
        
        
        const radios = Array.from(container.querySelectorAll(`input[name="q-${escapedItemId}"]`)) as HTMLInputElement[];
        const labels = Array.from(container.querySelectorAll(`label[for^="q-${escapedItemId}-"]`)) as HTMLLabelElement[];
        
        if (el.checked) {
          radios.forEach(r => { 
            r.checked = false;
            r.disabled = true;
            r.removeAttribute('required');
          });
          labels.forEach(l => l.setAttribute('aria-disabled','true'));
          if (itemEl) (itemEl as HTMLElement).classList.add('na-checked');
        } else {
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
          sectionItems.style.display = 'none';
          const radioButtons = Array.from(sectionItems.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
          radioButtons.forEach(r => { r.checked = false; r.disabled = true; r.removeAttribute('required'); });
        } else {
          sectionItems.style.display = 'block';
          const radioButtons = Array.from(sectionItems.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
          radioButtons.forEach(r => { 
            const itemContainer = r.closest('.checklist-item');
            const itemNaCheckbox = itemContainer?.querySelector('.item-na-checkbox') as HTMLInputElement;
            if (!itemNaCheckbox?.checked) { r.disabled = false; r.setAttribute('required','required'); }
          });
        }
      });
    });
  }

  async handleChecklistSubmit(e:any){
    e.preventDefault();
    
  // Valida obrigatoriedade dos itens
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
      }
    });

    if (!isValid) {
      this.ui.showToast('Por favor, preencha todos os campos obrigatórios.', 'warning', 5000);
      return;
    }

  // Recolhe seções e itens do DOM para montar o payload
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

// Capture TODOS os dados do formulário AQUI, antes de abrir o modal.
    const clientCompanyIdValue = (hostEl.querySelector('#empresaCliente') as HTMLSelectElement)?.value?.trim();
    const unitIdValue = (hostEl.querySelector('#empresaUnidade') as HTMLSelectElement)?.value?.trim();
    const sectorIdValue = (hostEl.querySelector('#empresaSetor') as HTMLSelectElement)?.value?.trim();

    (window as any).__checklistData = {
        sections,
        metadata: {
            
            companyId: clientCompanyIdValue,
            unitId: unitIdValue,
            sectorId: sectorIdValue,
            
            
            title: (hostEl.querySelector('#reportTitle') as HTMLInputElement)?.value,
            dataInspecao: (hostEl.querySelector('#dataInspecao') as HTMLInputElement)?.value,
            localInspecao: (hostEl.querySelector('#localInspecao') as HTMLInputElement)?.value,
            responsavel: (hostEl.querySelector('#responsavel') as HTMLInputElement)?.value,
            responsavelSigla: (hostEl.querySelector('#responsavelSigla') as HTMLInputElement)?.value,
            responsavelRegistro: (hostEl.querySelector('#responsavelRegistro') as HTMLInputElement)?.value,
            anotacoes: (hostEl.querySelector('#anotacoes') as HTMLTextAreaElement)?.value,
            observacoes: (hostEl.querySelector('#observacoes') as HTMLTextAreaElement)?.value,
        }
    };
  // Abre o modal de assinatura
    if (this.signatureModal) {
      await this.signatureModal.open();
    } else {
      this.ui.showToast('Erro ao abrir modal de assinatura.', 'error', 5000);
    }
  }

  onSignaturesConfirmed(data: any) {
  // Monta payload usando os dados coletados
    const checklistData = (window as any).__checklistData;
    
    if (!checklistData) {
      this.ui.showToast('Erro: dados do checklist não encontrados.', 'error', 5000);
      return;
    }
    // ⚠️ MAPEAR EXATAMENTE PARA O DTO: SaveInspectionReportRequestDTO
    // O backend NÃO espera "id" ou "metadata" - espera os campos específicos do DTO!
    
    // Leia os dados diretamente do objeto metadata que já foi preenchido no handleChecklistSubmit.
    const payload = {
        // IDs (lidos do metadata)
        companyId: checklistData.metadata.companyId ? parseInt(checklistData.metadata.companyId) : null,
        unitId: checklistData.metadata.unitId ? parseInt(checklistData.metadata.unitId) : null,
        sectorId: checklistData.metadata.sectorId ? parseInt(checklistData.metadata.sectorId) : null,

        // Título e dados do cabeçalho (lidos do metadata)
        title: checklistData.metadata.title || 'Checklist de Inspeção',
        inspectionDate: this.parseDate(checklistData.metadata.dataInspecao),
        local: checklistData.metadata.localInspecao || '',
        
        // Campos de texto (lidos do metadata)
        notes: checklistData.metadata.anotacoes || '',
        observations: checklistData.metadata.observacoes || '',

        // Dados do responsável (lidos do metadata)
        responsavelSigla: checklistData.metadata.responsavelSigla || '',
        responsavelRegistro: checklistData.metadata.responsavelRegistro || '',

        // Assinaturas (recebidas do modal)
        clientSignature: {
            signerName: data.clientName || 'Cliente',
            imageBase64: data.clientSignature,
            latitude: data.geolocation?.latitude,
            longitude: data.geolocation?.longitude
        },
        technicianSignature: {
            imageBase64: data.techSignature
        },
        
        // Seções (já no formato correto)
        sections: checklistData.sections,

        useDigitalSignature: true
    };



    // Salvar via ReportService
    this.saveChecklistWithSignatures(payload);
  }

  private parseDate(dateString: string | undefined): any {
    if (!dateString) return null;
    // Converte DD/MM/YYYY ou YYYY-MM-DD para LocalDate (YYYY-MM-DD)
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return `${year}-${month}-${day}`;
    }
    return dateString;
  }

  private async saveChecklistWithSignatures(payload: any) {
    try {
      
      const result = await this.reportService.postInspectionReport(payload);
      
      this.ui.showToast('Checklist salvo com sucesso!', 'success', 5000);
      // Redirecionar para página de sucesso ou histórico
      window.location.href = '/#/group';
    } catch (err) {
      const error = err as any;
      
      const msg = error.message || 'Erro desconhecido';
      this.ui.showToast(`Erro ao salvar checklist: ${msg}`, 'error', 5000);
    }
  }
}
