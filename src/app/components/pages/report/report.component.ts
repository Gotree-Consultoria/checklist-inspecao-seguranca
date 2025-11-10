import { Component, OnInit, OnDestroy, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { ReportService } from '../../../services/report.service';
import { SignatureService } from '../../../services/signature.service';
import { SignatureModalComponent } from '../../shared/signature-modal/signature-modal.component';

interface ReportRecord {
  id?: string;
  description: string;
  consequences: string;
  legal: string;
  penalties: string;
  responsible: string;
  priority: 'Alta' | 'Media' | 'Baixa';
  deadline: string;
  unchanged: 'Sim' | 'Não';
  photos: Array<string>; // base64 data URLs
}

@Component({
  standalone: true,
  selector: 'app-report',
  imports: [CommonModule, FormsModule, SignatureModalComponent],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit, OnDestroy {
  private legacy = inject(LegacyService);
  private ui = inject(UiService);
  private report = inject(ReportService);
  private signatureService = inject(SignatureService);
  private host = inject(ElementRef);

  records: Array<ReportRecord> = [];
  companies: Array<any> = [];
  private reportDraft: { records: ReportRecord[] } = { records: [] };
  private readonly DRAFT_KEY = 'draftReport';

  async ngOnInit(): Promise<void> {
    // Carrega rascunho salvo do localStorage
    this.loadDraftFromStorage();
    
    // Carrega a hora atual do fuso horário
    this.loadCurrentTime();
    
    // Carrega empresas do backend
    await this.loadCompanies();

    // Carrega dados do técnico logado (nome, conselho, registro)
    await this.loadLoggedTechnician();

    // Pequeno delay para garantir que o DOM foi completamente renderizado
    // antes de tentar preencher os inputs
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Tenta preencher novamente (retry) em caso de inputs não encontrados na primeira vez
    await this.loadLoggedTechnician();

    // Conecta botões do modal de assinaturas aos métodos do componente
    this.wireSignatureModalButtons();
  }

  private wireSignatureModalButtons(): void {
    try {
      const clearTechBtn = document.getElementById('clearTechSigReport');
      const clearClientBtn = document.getElementById('clearClientSigReport');
      const clearAllBtn = document.getElementById('clearAllSignaturesBtnReport');
      const confirmBtn = document.getElementById('confirmSendReportBtn');
      const cancelBtn = document.getElementById('cancelSendReportBtn');

      if (clearTechBtn) clearTechBtn.addEventListener('click', () => this.clearTechSig());
      if (clearClientBtn) clearClientBtn.addEventListener('click', () => this.clearClientSig());
      if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearAllSignatures());
      if (confirmBtn) confirmBtn.addEventListener('click', () => this.handleSendReport());
      if (cancelBtn) cancelBtn.addEventListener('click', () => this.cancelSignatureModal());

      console.log('[Report] Botões do modal de assinatura conectados');
    } catch (e) {
      console.warn('Erro ao conectar botões do modal', e);
    }
  }

  private async loadCompanies(): Promise<void> {
    try {
      const companiesData = await this.report.fetchCompanies();
      console.log('[Report] Empresas carregadas:', companiesData);
      if (companiesData && Array.isArray(companiesData)) {
        this.companies = companiesData;
        // Popula o dropdown de empresas
        this.populateCompanyDropdown();
      } else {
        console.warn('[Report] companiesData não é um array válido:', companiesData);
      }
    } catch (e) {
      console.warn('fetchCompanies failed', e);
      this.ui.showToast('Falha ao carregar, verifique o servidor e tente novamente.', 'error', 4000);
    }
  }

  private populateCompanyDropdown(): void {
    try {
      const selectElement = this.host.nativeElement.querySelector('#empresaCliente') as HTMLSelectElement;
      if (!selectElement || !this.companies.length) {
        console.warn('[Report] Não foi possível popular dropdown - selectElement ou companies vazio');
        return;
      }

      // Limpa as opções existentes mantendo apenas a primeira (placeholder)
      while (selectElement.options.length > 1) {
        selectElement.remove(1);
      }

      // Adiciona cada empresa como uma opção
      this.companies.forEach((company: any) => {
        const option = document.createElement('option');
        const companyId = company.id || company._id || '';
        const companyName = company.name || company.razaoSocial || company.nomeFantasia || 'Sem nome';
        
        option.value = companyId;
        option.textContent = companyName;
        option.setAttribute('data-company', JSON.stringify(company)); // Armazena dados da empresa
        
        selectElement.appendChild(option);
        console.log('[Report] Empresa adicionada:', companyName, 'ID:', companyId);
      });
      
      console.log('[Report] Dropdown populado com', this.companies.length, 'empresas');
    } catch (e) {
      console.warn('Erro ao popular dropdown de empresas', e);
    }
  }

  ngOnDestroy(): void {
    // Ao sair do componente, limpa o rascunho para que o próximo "Novo Relatório" comece vazio
    this.clearDraft();
  }

  private clearDraft(): void {
    try {
      localStorage.removeItem(this.DRAFT_KEY);
      this.records = [];
      this.reportDraft = { records: [] };
    } catch (e) {
      console.warn('Falha ao limpar rascunho', e);
    }
  }

  private loadCurrentTime(): void {
    try {
      // Pega a hora atual do fuso horário local
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      // Carrega o valor no input de "Hora inicial"
      const reportStartTimeInput = this.host.nativeElement.querySelector('#reportStartTime') as HTMLInputElement;
      if (reportStartTimeInput) {
        reportStartTimeInput.value = timeString;
      }
    } catch (e) {
      console.warn('Falha ao carregar hora atual', e);
    }
  }

  private loadDraftFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.DRAFT_KEY);
      if (saved) {
        this.reportDraft = JSON.parse(saved);
        this.records = this.reportDraft.records || [];
      }
    } catch (e) {
      console.warn('Falha ao carregar rascunho', e);
      this.reportDraft = { records: [] };
    }
  }

  private saveDraftToStorage(): void {
    try {
      this.reportDraft.records = this.records;
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(this.reportDraft));
    } catch (e) {
      console.warn('Falha ao salvar rascunho', e);
    }
  }

  addRecord(): void {
    const newRecord: ReportRecord = {
      description: '',
      consequences: '',
      legal: '',
      penalties: '',
      responsible: '',
      priority: 'Media',
      deadline: '',
      unchanged: 'Não',
      photos: []
    };
    this.records.push(newRecord);
    // Reatribui o array para forçar a detecção de mudanças do Angular
    this.records = [...this.records];
    this.saveDraftToStorage();
  }

  removeRecord(index: number): void {
    if (index >= 0 && index < this.records.length) {
      // Remove o registro e cria novo array para forçar detecção de mudanças
      this.records = this.records.filter((_, i) => i !== index);
      this.saveDraftToStorage();
      this.ui.showToast('Registro removido com sucesso.', 'success', 2000);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  removePhotos(index: number): void {
    if (index >= 0 && index < this.records.length) {
      this.records[index].photos = [];
      this.saveDraftToStorage();
    }
  }

  onRecordFileChange(event: Event, recordIndex: number, photoIndex: 0 | 1): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) return;

    const file = input.files[0];
    // Redimensiona a imagem antes de armazenar
    this.resizeImageTo6_8cm(file).then((resizedBase64: string) => {
      if (recordIndex >= 0 && recordIndex < this.records.length) {
        if (!this.records[recordIndex].photos) {
          this.records[recordIndex].photos = [];
        }
        this.records[recordIndex].photos[photoIndex] = resizedBase64;
        // Reatribui fotos e também o array principal para forçar detecção de mudanças
        this.records[recordIndex].photos = [...this.records[recordIndex].photos];
        this.records = [...this.records];
        this.saveDraftToStorage();
      }
    }).catch((error: Error) => {
      console.error('[Report] Erro ao redimensionar imagem:', error);
      // Fallback: usa a imagem original sem redimensionamento
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (recordIndex >= 0 && recordIndex < this.records.length) {
          if (!this.records[recordIndex].photos) {
            this.records[recordIndex].photos = [];
          }
          this.records[recordIndex].photos[photoIndex] = dataUrl;
          this.records[recordIndex].photos = [...this.records[recordIndex].photos];
          this.records = [...this.records];
          this.saveDraftToStorage();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async onCaptureClick(recordIndex: number): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const blob = await imageCapture.takePhoto();
      
      // Redimensiona a imagem capturada antes de armazenar
      this.resizeImageTo6_8cm(blob).then((resizedBase64: string) => {
        if (recordIndex >= 0 && recordIndex < this.records.length) {
          if (!this.records[recordIndex].photos) {
            this.records[recordIndex].photos = [];
          }
          // Adicionar à primeira foto vazia
          const slot = this.records[recordIndex].photos[0] ? 1 : 0;
          this.records[recordIndex].photos[slot] = resizedBase64;
          this.records[recordIndex].photos = [...this.records[recordIndex].photos];
          this.records = [...this.records];
          this.saveDraftToStorage();
          track.stop();
        }
      }).catch((error: Error) => {
        console.error('[Report] Erro ao redimensionar foto capturada:', error);
        // Fallback: usa a foto original sem redimensionamento
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          if (recordIndex >= 0 && recordIndex < this.records.length) {
            if (!this.records[recordIndex].photos) {
              this.records[recordIndex].photos = [];
            }
            const slot = this.records[recordIndex].photos[0] ? 1 : 0;
            this.records[recordIndex].photos[slot] = dataUrl;
            this.records[recordIndex].photos = [...this.records[recordIndex].photos];
            this.records = [...this.records];
            this.saveDraftToStorage();
            track.stop();
          }
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      this.ui.showToast(`Não foi possível acessar a câmera: ${(e as Error).message}`, 'error');
    }
  }

  onSelectFileClick(recordIndex: number): void {
    // Criar input file dinamicamente para evitar interferência com os inputs dos slots
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Permitir seleção de múltiplas fotos
    input.onchange = (e: any) => {
      const files = e.target.files as FileList;
      if (!files || files.length === 0) return;

      const maxPhotos = 2;
      const currentPhotos = this.records[recordIndex]?.photos || [];
      
      if (currentPhotos.length >= maxPhotos) {
        this.ui.showToast('Limite de 2 fotos por registro já atingido.', 'info', 3000);
        return;
      }

      let photosAdded = 0;
      const availableSlots = maxPhotos - currentPhotos.length;

      // Processar arquivo por arquivo até preencher os slots disponíveis
      for (let i = 0; i < files.length && photosAdded < availableSlots; i++) {
        const file = files[i];
        // Redimensiona a imagem antes de armazenar
        this.resizeImageTo6_8cm(file).then((resizedBase64: string) => {
          if (recordIndex >= 0 && recordIndex < this.records.length) {
            if (!this.records[recordIndex].photos) {
              this.records[recordIndex].photos = [];
            }

            // Adicionar nas posições vazias (índices 0 ou 1)
            if (this.records[recordIndex].photos.length < maxPhotos) {
              this.records[recordIndex].photos[this.records[recordIndex].photos.length] = resizedBase64;
              // Reatribui fotos e array principal para forçar detecção
              this.records[recordIndex].photos = [...this.records[recordIndex].photos];
              this.records = [...this.records];
              this.saveDraftToStorage();
            }
          }
        }).catch((error: Error) => {
          console.error('[Report] Erro ao redimensionar imagem da galeria:', error);
          // Fallback: usa a imagem original sem redimensionamento
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            if (recordIndex >= 0 && recordIndex < this.records.length) {
              if (!this.records[recordIndex].photos) {
                this.records[recordIndex].photos = [];
              }
              if (this.records[recordIndex].photos.length < maxPhotos) {
                this.records[recordIndex].photos[this.records[recordIndex].photos.length] = dataUrl;
                this.records[recordIndex].photos = [...this.records[recordIndex].photos];
                this.records = [...this.records];
                this.saveDraftToStorage();
              }
            }
          };
          reader.readAsDataURL(file);
        });
        photosAdded++;
      }

      if (photosAdded < files.length) {
        this.ui.showToast(`Apenas ${photosAdded} foto(s) adicionada(s). Limite de 2 fotos por registro.`, 'info', 3000);
      }
    };
    input.click();
  }

  onRecordChange(index: number): void {
    // Método chamado quando qualquer campo do registro é alterado
    this.saveDraftToStorage();
  }

  onCompanyChange(e: Event): void {
    try {
      const selectElement = e.target as HTMLSelectElement;
      const selectedCompanyId = selectElement.value;
      console.log('[Report] Empresa selecionada:', selectedCompanyId);

      if (!selectedCompanyId) {
        // Limpa os campos se nenhuma empresa for selecionada
        this.clearCompanyFields();
        return;
      }

      // Primeiro, tente obter os dados diretamente do option (data-company) — garante o objeto exato
      let selectedOption: HTMLOptionElement | null = null;
      try {
        selectedOption = selectElement.options[selectElement.selectedIndex] as HTMLOptionElement;
      } catch (_) { selectedOption = null; }

      let selectedCompany: any = null;
      if (selectedOption) {
        const dataAttr = selectedOption.getAttribute('data-company');
        if (dataAttr) {
          try { selectedCompany = JSON.parse(dataAttr); }
          catch (e) { /* ignore parse error and fallback below */ }
        }
      }

      // Fallback: procura na lista this.companies com comparação de strings (para evitar mismatch de tipo)
      if (!selectedCompany) {
        selectedCompany = this.companies.find((c: any) => {
          const cid = c && (c.id || c._id || c.companyId || c._companyId);
          return String(cid) === String(selectedCompanyId);
        });
      }

      console.log('[Report] Empresa encontrada:', selectedCompany);

      if (selectedCompany) {
        // Popula o CNPJ
        const cnpjInput = this.host.nativeElement.querySelector('#empresaCnpj') as HTMLInputElement;
        if (cnpjInput) {
          const cnpjValue = selectedCompany.cnpj || selectedCompany.documentNumber || selectedCompany.document || selectedCompany.cpfCnpj || '';
          cnpjInput.value = cnpjValue || '';
          console.log('[Report] CNPJ preenchido:', cnpjValue);
        }

        // Popula as unidades
        this.populateUnidades(selectedCompany);

        // Popula os setores
        this.populateSetores(selectedCompany);
      } else {
        console.warn('[Report] Não foi possível localizar dados completos da empresa selecionada. Verifique estrutura retornada pelo backend.');
        // limpa campos para evitar dados inconsistentes
        this.clearCompanyFields();
      }
    } catch (err) {
      console.warn('Erro ao selecionar empresa', err);
    }
  }

  private clearCompanyFields(): void {
    const cnpjInput = this.host.nativeElement.querySelector('#empresaCnpj') as HTMLInputElement;
    const unidadeSelect = this.host.nativeElement.querySelector('#empresaUnidade') as HTMLSelectElement;
    const setorSelect = this.host.nativeElement.querySelector('#empresaSetor') as HTMLSelectElement;

    if (cnpjInput) cnpjInput.value = '';
    
    if (unidadeSelect) {
      unidadeSelect.disabled = true;
      unidadeSelect.innerHTML = '<option value="">Selecione uma empresa primeiro</option>';
    }

    if (setorSelect) {
      setorSelect.disabled = true;
      setorSelect.innerHTML = '<option value="">Selecione uma empresa primeiro</option>';
    }
  }

  private populateUnidades(company: any): void {
    const unidadeSelect = this.host.nativeElement.querySelector('#empresaUnidade') as HTMLSelectElement;
    if (!unidadeSelect) return;

    // Limpa as opções existentes
    unidadeSelect.innerHTML = '<option value="">Selecione uma unidade</option>';
    unidadeSelect.disabled = false;

    const unidades = company.units || company.unidades || company.branches || [];
    console.log('[Report] Unidades disponíveis:', unidades);
    
    if (Array.isArray(unidades) && unidades.length > 0) {
      unidades.forEach((unit: any) => {
        const option = document.createElement('option');
        option.value = unit.id || unit._id || unit.name || '';
        option.textContent = unit.name || unit.nomeFantasia || unit.address || 'Sem nome';
        unidadeSelect.appendChild(option);
      });
      console.log('[Report] Unidades adicionadas:', unidades.length);
    } else {
      console.warn('[Report] Nenhuma unidade encontrada na empresa');
    }
  }

  private populateSetores(company: any): void {
    const setorSelect = this.host.nativeElement.querySelector('#empresaSetor') as HTMLSelectElement;
    if (!setorSelect) return;

    // Limpa as opções existentes
    setorSelect.innerHTML = '<option value="">Selecione um setor</option>';
    setorSelect.disabled = false;

    const setores = company.sectors || company.setores || company.departments || [];
    console.log('[Report] Setores disponíveis:', setores);
    
    if (Array.isArray(setores) && setores.length > 0) {
      setores.forEach((setor: any) => {
        const option = document.createElement('option');
        option.value = setor.id || setor._id || setor.name || '';
        option.textContent = setor.name || setor.nomeDepartamento || 'Sem nome';
        setorSelect.appendChild(option);
      });
      console.log('[Report] Setores adicionados:', setores.length);
    } else {
      console.warn('[Report] Nenhum setor encontrado na empresa');
    }
  }

  private async loadLoggedTechnician(): Promise<void> {
    try {
      const me = await this.legacy.fetchUserProfile();
      console.log('[Report] Perfil do técnico carregado completo:', JSON.stringify(me, null, 2));
      console.table(me); // Exibe em forma de tabela para fácil visualização
      
      if (!me) {
        console.warn('[Report] fetchUserProfile retornou null ou undefined');
        return;
      }

      // Log TODAS as chaves do objeto para debug
      const allKeys = Object.keys(me);
      console.log('[Report] Chaves disponíveis no perfil:', allKeys);
      console.log('[Report] Total de propriedades:', allKeys.length);
      
      // Log cada propriedade individualmente
      allKeys.forEach(key => {
        console.log(`[Report]   ${key}: ${me[key]}`);
      });

      // Mapear possíveis campos de nome e conselho/registro
      const name = me.name || me.fullName || me.nome || me.usuario || '';
      console.log('[Report] Nome extraído:', name, '| Todas as variantes:', { me_name: me.name, me_fullName: me.fullName, me_nome: me.nome, me_usuario: me.usuario });

      // ampliar aliases conhecidos para sigla e registro do conselho
      const councilAcronym = (
        me.councilAcronym || me.siglaConselhoClasse || me.conselhoSigla || me.sigla || me.siglaConselho || me.conselho || me.council || me.acronym || me.codigoConselho || ''
      );
      console.log('[Report] Sigla extraída:', councilAcronym, '| Todas as variantes:', { 
        me_councilAcronym: me.councilAcronym,
        me_siglaConselhoClasse: me.siglaConselhoClasse,
        me_conselhoSigla: me.conselhoSigla, 
        me_sigla: me.sigla, 
        me_siglaConselho: me.siglaConselho, 
        me_conselho: me.conselho,
        me_council: me.council,
        me_acronym: me.acronym,
        me_codigoConselho: me.codigoConselho
      });

      const councilRegistration = (
        me.councilNumber || me.conselhoClasse || me.registration || me.registro || me.conselhoRegistro || me.registrationNumber || me.crm || me.crea || me.numeroRegistro || me.registroProfissional || ''
      );
      console.log('[Report] Registro extraído:', councilRegistration, '| Todas as variantes:', { 
        me_councilNumber: me.councilNumber,
        me_conselhoClasse: me.conselhoClasse,
        me_registration: me.registration, 
        me_registro: me.registro, 
        me_conselhoRegistro: me.conselhoRegistro, 
        me_registrationNumber: me.registrationNumber,
        me_crm: me.crm,
        me_crea: me.crea,
        me_numeroRegistro: me.numeroRegistro,
        me_registroProfissional: me.registroProfissional
      });

      // Buscar os inputs com log detalhado
      const respInput = this.host.nativeElement.querySelector('#responsavel') as HTMLInputElement;
      const siglaInput = this.host.nativeElement.querySelector('#responsavelSigla') as HTMLInputElement;
      const regInput = this.host.nativeElement.querySelector('#responsavelRegistro') as HTMLInputElement;
      const techNameInput = this.host.nativeElement.querySelector('#techNameReport') as HTMLInputElement;

      console.log('[Report] Inputs encontrados:', {
        respInput: !!respInput,
        siglaInput: !!siglaInput,
        regInput: !!regInput,
        techNameInput: !!techNameInput,
        respInput_id: respInput?.id,
        siglaInput_id: siglaInput?.id,
        regInput_id: regInput?.id,
        techNameInput_id: techNameInput?.id
      });

      // Preenche os inputs e dispara evento 'input' para notificar possíveis listeners
      const dispatchInput = (el: HTMLInputElement | null, fieldName: string, val: string) => {
        if (!el) {
          console.warn(`[Report] Input ${fieldName} não encontrado no DOM`);
          return;
        }
        console.log(`[Report] Preenchendo ${fieldName} com valor: "${val}"`);
        el.value = val || '';
        console.log(`[Report] Valor atribuído a ${fieldName}. Valor no input agora: "${el.value}"`);
        try { 
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`[Report] Eventos 'input' e 'change' disparados para ${fieldName}`);
        } catch (_) {
          console.warn(`[Report] Erro ao disparar eventos para ${fieldName}`);
        }
      };

      // Sempre preencher mesmo se vazio para debug
      if (respInput) dispatchInput(respInput, 'responsavel', name);
      if (siglaInput) dispatchInput(siglaInput, 'responsavelSigla', councilAcronym);
      if (regInput) dispatchInput(regInput, 'responsavelRegistro', councilRegistration);
      if (techNameInput) dispatchInput(techNameInput, 'techNameReport', name);

      console.log('[Report] Técnico preenchido:', { name, councilAcronym, councilRegistration });
    } catch (e) {
      console.warn('Erro ao carregar técnico logado', e);
      console.error('[Report] Stack trace:', e);
    }
  }

  private captureGeolocation(): void {
    if (!navigator.geolocation) {
      console.warn('[Report] Geolocalização não disponível no navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.geolocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.log('[Report] Geolocalização capturada:', this.geolocation);
      },
      (error) => {
        console.warn('[Report] Erro ao capturar geolocalização:', error.message);
        // Mantém valores padrão 0,0 se não conseguir capturar
        this.geolocation = { latitude: 0, longitude: 0 };
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  }

  // Pads de assinatura inicializados pelo SignatureService
  private techPad: any = null;
  private clientPad: any = null;
  // overlays de debug por canvas key ('tech' | 'client')
  private signatureOverlays: Record<string, HTMLElement> = {};
  // Geolocalização capturada
  private geolocation: { latitude: number; longitude: number } = { latitude: 0, longitude: 0 };

  // Ref para o componente compartilhado de assinatura
  @ViewChild('reportSignatureModal', { static: false }) reportSignatureModalComp: any;

  private async openSignatureModalAngular(): Promise<void> {
    try {
      // Garante que pads anteriores foram limpos
      try { this.clearAllSignatures(); } catch (_) {}
      this.techPad = null;
      this.clientPad = null;
      
      // Capturar geolocalização quando modal é aberto
      this.captureGeolocation();
      
      const sigModal = this.host.nativeElement.querySelector('#reportSignatureModal') as HTMLElement;
      const techCanvas = this.host.nativeElement.querySelector('#techSignatureCanvasReport') as HTMLCanvasElement;
      const clientCanvas = this.host.nativeElement.querySelector('#clientSignatureCanvasReport') as HTMLCanvasElement;

      if (!sigModal || !techCanvas || !clientCanvas) {
        this.ui.showToast('Elemento de assinatura não encontrado.', 'error');
        return;
      }

      // Exibe modal - toggle de várias formas para garantir visibilidade
      try {
        sigModal.classList.remove('hidden');
        sigModal.classList.add('open');
        sigModal.style.display = 'flex';
        sigModal.setAttribute('aria-hidden', 'false');
      } catch (err) {
        console.warn('[Report] Falha ao ajustar classes/estilos do modal', err);
      }

      // Inicializa pads usando SignatureService
      try {
        // Cria overlay visual para diagnóstico
        this.ensureSignatureOverlay(techCanvas, 'tech');
        this.ensureSignatureOverlay(clientCanvas, 'client');

        const baseOpts = this.signatureService.getDefaultPadOptions();
        const pads = await this.signatureService.initSignaturePads(techCanvas, clientCanvas, {
          ...baseOpts,
          onPointerDown: (pos: any, ev: any) => {
            // pos is in canvas CSS pixels as provided by SimpleSignaturePad
            try {
              const canvasId = (ev && ev.target && (ev.target as Element).id) ? (ev.target as Element).id : null;
              if (canvasId && canvasId.includes('tech')) this.showDebugMarkers('tech', pos, ev);
              else this.showDebugMarkers('client', pos, ev);
            } catch (_) {}
          }
        });
        if (pads) {
          this.techPad = pads.tech;
          this.clientPad = pads.client;
          // Log debug das dimensões
          console.log('[Report] Signature pads inicializados', {
            techCanvasWidth: techCanvas.width,
            techCanvasHeight: techCanvas.height,
            techCanvasClientWidth: techCanvas.clientWidth,
            techCanvasClientHeight: techCanvas.clientHeight,
            devicePixelRatio: window.devicePixelRatio
          });
          
          // Bloqueia scroll APENAS após inicialização bem-sucedida dos pads
          try { document.documentElement.style.overflow = 'hidden'; } catch (_) { try { document.body.style.overflow = 'hidden'; } catch(_){} }
          console.log('[Report] Modal de assinatura exibido e scroll bloqueado');
        }
      } catch (e) {
        console.warn('Falha ao inicializar SignaturePad via service', e);
        // Se falhar, restaura scroll e esconde modal
        try { document.documentElement.style.overflow = ''; } catch (_) { try { document.body.style.overflow = ''; } catch(_){} }
        try {
          sigModal.classList.add('hidden');
          sigModal.classList.remove('open');
          sigModal.style.display = 'none';
          sigModal.setAttribute('aria-hidden', 'true');
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Erro ao abrir modal de assinatura', e);
    }
  }

  private closeSignatureModal(): void {
    try {
      const sigModal = this.host.nativeElement.querySelector('#reportSignatureModal') as HTMLElement;
      if (sigModal) {
        sigModal.classList.add('hidden');
        sigModal.classList.remove('open');
        sigModal.style.display = 'none';
        sigModal.setAttribute('aria-hidden', 'true');
      }
    } catch (e) {
      console.warn('Erro ao esconder modal de assinatura', e);
    }

    try { document.documentElement.style.overflow = ''; } catch (_) { try { document.body.style.overflow = ''; } catch(_){} }

    // Limpa pads e referências
    try { this.clearAllSignatures(); } catch (_) {}
    this.techPad = null;
    this.clientPad = null;
    console.log('[Report] Modal de assinatura fechado e scroll restaurado');
  }

  // Cria um overlay transparente sobre o canvas para debug (marcar posições)
  private ensureSignatureOverlay(canvas: HTMLCanvasElement, key: 'tech' | 'client'): void {
    try {
      if (this.signatureOverlays[key]) return;
      const parent = canvas.parentElement as HTMLElement;
      if (!parent) return;
      // garante que o parente tem position para o overlay absoluto
      const cs = window.getComputedStyle(parent);
      if (cs.position === 'static') parent.style.position = 'relative';

      const overlay = document.createElement('div');
      overlay.className = 'sig-overlay';
      overlay.style.position = 'absolute';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '2000';
      parent.appendChild(overlay);
      this.signatureOverlays[key] = overlay;
    } catch (e) {
      console.warn('Falha ao criar overlay de assinatura', e);
    }
  }

  // Mostra marcadores de debug: posição do evento e posição usada pelo pad
  private showDebugMarkers(key: 'tech' | 'client', padPos: { x: number; y: number }, ev: any): void {
    try {
      const overlay = this.signatureOverlays[key];
      if (!overlay) return;
      const canvas = document.getElementById(key === 'tech' ? 'techSignatureCanvasReport' : 'clientSignatureCanvasReport') as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      // posição do evento (client coords)
      const eventX = ev && ev.clientX ? (ev.clientX - rect.left) : (ev.offsetX || 0);
      const eventY = ev && ev.clientY ? (ev.clientY - rect.top) : (ev.offsetY || 0);

      // padPos já está em coordenadas relativas ao canvas (CSS pixels)
      const padX = padPos.x;
      const padY = padPos.y;

      // cria pontos
      const pEvent = document.createElement('span');
      pEvent.className = 'sig-dot sig-dot-event';
      pEvent.style.left = `${eventX - 6}px`;
      pEvent.style.top = `${eventY - 6}px`;
      overlay.appendChild(pEvent);

      const pPad = document.createElement('span');
      pPad.className = 'sig-dot sig-dot-pad';
      pPad.style.left = `${padX - 6}px`;
      pPad.style.top = `${padY - 6}px`;
      overlay.appendChild(pPad);

      // remove após curto período
      setTimeout(() => { try { pEvent.remove(); pPad.remove(); } catch (_) {} }, 1200);
    } catch (e) {
      console.warn('Erro ao mostrar marcadores de debug', e);
    }
  }

  clearTechSig(): void {
    try { if (this.techPad) this.techPad.clear(); } catch (_) {}
  }

  clearClientSig(): void {
    try { if (this.clientPad) this.clientPad.clear(); } catch (_) {}
  }

  clearAllSignatures(): void {
    this.clearTechSig();
    this.clearClientSig();
  }

  cancelSignatureModal(): void {
    try {
      this.closeSignatureModal();
    } catch (e) {
      console.warn('Erro ao cancelar modal de assinatura', e);
    }
  }

  async handleSaveClick(e: Event): Promise<void> {
    e.preventDefault();
    
    // Validar campos mínimos
    const title = (document.getElementById('reportTitle') as HTMLInputElement)?.value || '';
    const visitDate = (document.getElementById('dataInspecao') as HTMLInputElement)?.value || '';
    const location = (document.getElementById('localInspecao') as HTMLInputElement)?.value || '';

    if (!title || !visitDate || !location) {
      this.ui.showToast('Preencha os campos obrigatórios: Título, Data da Visita e Local.', 'warning');
      return;
    }

    // Capturar geolocalização antes de abrir o modal de assinatura
    try {
      this.captureGeolocation();
    } catch (_) {}

    // Abrir modal de assinatura compartilhado (SignatureModalComponent)
    try {
      if (this.reportSignatureModalComp && typeof this.reportSignatureModalComp.open === 'function') {
        this.reportSignatureModalComp.open();
        return;
      }
      // Fallback: antiga implementação que inicializava pads manualmente
      await this.openSignatureModalAngular();
    } catch (e) {
      console.warn('signature init failed', e);
      this.ui.showToast('Não foi possível inicializar a assinatura.', 'error');
    }
  }

  // Recebe as assinaturas do componente compartilhado e envia o relatório
  public async onSharedSignaturesConfirmed(data: any): Promise<void> {
    try {
      // Validações semelhantes às de handleSendReport
      if (!this.records || this.records.length === 0) {
        this.ui.showToast('Adicione pelo menos um registro antes de enviar.', 'warning');
        return;
      }

      for (let i = 0; i < this.records.length; i++) {
        const record = this.records[i];
        if (!record.photos || record.photos.length === 0) {
          this.ui.showToast(`Registro ${i + 1}: Adicione pelo menos 1 foto.`, 'warning');
          return;
        }
      }

      // Extrair IDs de unidade e setor - converter para number
      const clientCompanyIdValue = (document.getElementById('empresaCliente') as HTMLSelectElement)?.value?.trim();
      const unitIdValue = (document.getElementById('empresaUnidade') as HTMLSelectElement)?.value?.trim();
      const sectorIdValue = (document.getElementById('empresaSetor') as HTMLSelectElement)?.value?.trim();

      const visitDateFormatted = this.formatDate((document.getElementById('dataInspecao') as HTMLInputElement)?.value || '');
      const startTimeFormatted = this.formatTime((document.getElementById('reportStartTime') as HTMLInputElement)?.value || '');

      const payload: any = {
        title: (document.getElementById('reportTitle') as HTMLInputElement)?.value?.trim() || '',
        clientCompanyId: clientCompanyIdValue ? parseInt(clientCompanyIdValue) : null,
        unitId: unitIdValue ? parseInt(unitIdValue) : null,
        sectorId: sectorIdValue ? parseInt(sectorIdValue) : null,
        location: (document.getElementById('localInspecao') as HTMLInputElement)?.value?.trim() || '',
        visitDate: visitDateFormatted || null,
        startTime: startTimeFormatted || null,
        technicalReferences: Array.from(document.querySelectorAll('#referencesList li')).map(li => li.textContent?.trim() || '').filter(Boolean).join('; '),
        summary: (document.getElementById('reportSummary') as HTMLTextAreaElement)?.value?.trim() || '',
        findings: this.records.map(r => {
          const photo1Base64 = this.stripDataUrl(r.photos[0] || '') || '';
          const photo2Base64 = this.stripDataUrl(r.photos[1] || '') || '';
          const deadlineFormatted = r.deadline ? this.formatDate(r.deadline) : null;
          return {
            photoBase64_1: photo1Base64,
            photoBase64_2: photo2Base64,
            description: r.description?.trim() || '',
            consequences: r.consequences?.trim() || '',
            legalGuidance: r.legal?.trim() || '',
            responsible: r.responsible?.trim() || '',
            penalties: r.penalties?.trim() || '',
            priority: (r.priority || 'MEDIA').toUpperCase(),
            deadline: deadlineFormatted,
            recurrence: r.unchanged === 'Sim'
          };
        }),
        technicianSignatureImageBase64: this.stripDataUrl(data.techSignature) || '',
        clientSignatureImageBase64: this.stripDataUrl(data.clientSignature) || '',
        clientSignerName: data.clientName || '',
        clientSignatureLatitude: this.geolocation.latitude,
        clientSignatureLongitude: this.geolocation.longitude
      };
      // campo opcional: próxima visita
      try {
        const nextVisit = (document.getElementById('nextVisitDate') as HTMLInputElement)?.value || '';
        payload.nextVisitDate = this.formatDate(nextVisit) || null;
      } catch(_) { payload.nextVisitDate = null; }

      const resp = await this.report.postTechnicalVisit(payload);
      if (!resp) throw new Error('Resposta vazia do servidor');

      // Limpar e fechar modal
      try { if (this.reportSignatureModalComp && typeof this.reportSignatureModalComp.close === 'function') this.reportSignatureModalComp.close(); } catch(_) {}
      try { this.clearAllSignatures(); } catch(_) {}

      // Limpar rascunho
      localStorage.removeItem(this.DRAFT_KEY);
      this.records = [];
      this.reportDraft = { records: [] };

      this.ui.showToast('Relatório enviado com sucesso!', 'success', 4000);
    } catch (e) {
      const error = e as any;
      const errorMsg = error?.message || 'Erro desconhecido';
      console.error('Erro ao enviar relatório via modal compartilhado:', error);
      this.ui.showToast(`Falha ao enviar relatório: ${errorMsg}`, 'error');
    }
  }

  public async handleSendReport(): Promise<void> {
    try {
      // Validar que pelo menos um registro foi adicionado
      if (!this.records || this.records.length === 0) {
        this.ui.showToast('Adicione pelo menos um registro antes de enviar.', 'warning');
        return;
      }

      // Validar que cada registro tem pelo menos 1 foto
      for (let i = 0; i < this.records.length; i++) {
        const record = this.records[i];
        if (!record.photos || record.photos.length === 0) {
          this.ui.showToast(`Registro ${i + 1}: Adicione pelo menos 1 foto.`, 'warning');
          return;
        }
      }

      // Extrair IDs de unidade e setor - converter para number (será enviado como inteiro ao backend)
      const clientCompanyIdValue = (document.getElementById('empresaCliente') as HTMLSelectElement)?.value?.trim();
      const unitIdValue = (document.getElementById('empresaUnidade') as HTMLSelectElement)?.value?.trim();
      const sectorIdValue = (document.getElementById('empresaSetor') as HTMLSelectElement)?.value?.trim();
      
      // Validar assinaturas
      const techSig = this.getTechSignatureBase64();
      const clientSig = this.getClientSignatureBase64();
      if (!techSig || !clientSig) {
        this.ui.showToast('Ambas as assinaturas (Técnico e Responsável) são obrigatórias.', 'warning');
        return;
      }

      // Preparar payload conforme DTO: CreateTechnicalVisitRequestDTO
      const visitDateFormatted = this.formatDate((document.getElementById('dataInspecao') as HTMLInputElement)?.value || '');
      const startTimeFormatted = this.formatTime((document.getElementById('reportStartTime') as HTMLInputElement)?.value || '');
      
      const payload = {
        title: (document.getElementById('reportTitle') as HTMLInputElement)?.value?.trim() || '',
        clientCompanyId: clientCompanyIdValue ? parseInt(clientCompanyIdValue) : null,
        unitId: unitIdValue ? parseInt(unitIdValue) : null,
        sectorId: sectorIdValue ? parseInt(sectorIdValue) : null,
        location: (document.getElementById('localInspecao') as HTMLInputElement)?.value?.trim() || '',
        visitDate: visitDateFormatted || null, // YYYY-MM-DD format para LocalDate do backend
        startTime: startTimeFormatted || null, // HH:mm format para LocalTime do backend
        technicalReferences: Array.from(document.querySelectorAll('#referencesList li'))
          .map(li => li.textContent?.trim() || '')
          .filter(Boolean)
          .join('; '), // String separada por ponto-vírgula
        summary: (document.getElementById('reportSummary') as HTMLTextAreaElement)?.value?.trim() || '',
        findings: this.records.map(r => {
          // Extrair e validar base64 das fotos
          const photo1Base64 = this.stripDataUrl(r.photos[0] || '') || '';
          const photo2Base64 = this.stripDataUrl(r.photos[1] || '') || '';
          
          // Formatar deadline para YYYY-MM-DD ou null
          const deadlineFormatted = r.deadline ? this.formatDate(r.deadline) : null;
          
          return {
            photoBase64_1: photo1Base64,
            photoBase64_2: photo2Base64,
            description: r.description?.trim() || '',
            consequences: r.consequences?.trim() || '',
            legalGuidance: r.legal?.trim() || '',
            responsible: r.responsible?.trim() || '',
            penalties: r.penalties?.trim() || '',
            priority: (r.priority || 'MEDIA').toUpperCase(),
            deadline: deadlineFormatted, // YYYY-MM-DD format para LocalDate do backend
            recurrence: r.unchanged === 'Sim'
          };
        }),
        technicianSignatureImageBase64: techSig || '',
        clientSignatureImageBase64: clientSig || '',
        clientSignerName: (document.getElementById('clientSignerName') as HTMLInputElement)?.value?.trim() || '',
        clientSignatureLatitude: this.geolocation.latitude,
        clientSignatureLongitude: this.geolocation.longitude
      };
      // campo opcional: próxima visita
      try {
        const nextVisit = (document.getElementById('nextVisitDate') as HTMLInputElement)?.value || '';
        (payload as any).nextVisitDate = this.formatDate(nextVisit) || null;
      } catch(_) { (payload as any).nextVisitDate = null; }

      console.log('[report] payload to send', payload);
      console.log('[report] findings count:', payload.findings.length);
      console.log('[report] first finding:', JSON.stringify(payload.findings[0], null, 2));
      console.log('[report] visitDate type:', typeof payload.visitDate, '| value:', payload.visitDate);
      console.log('[report] startTime type:', typeof payload.startTime, '| value:', payload.startTime);
      console.log('[report] Full payload JSON:', JSON.stringify(payload, null, 2));
      
      // Log detalhado dos registros para debug
      this.records.forEach((r, idx) => {
        const photo1 = this.stripDataUrl(r.photos[0] || '') || '';
        const photo2 = this.stripDataUrl(r.photos[1] || '') || '';
        console.log(`[Report] Registro ${idx}:`, {
          description: r.description,
          photo1_size: photo1.length,
          photo2_size: photo2.length,
          photo1_valid: photo1.length > 0 ? 'SIM' : 'NÃO',
          photo2_valid: photo2.length > 0 ? 'SIM' : 'NÃO',
          priority: r.priority,
          deadline: r.deadline,
          recurrence: r.unchanged
        });
      });

      // Validar que todas as imagens têm conteúdo válido (não vazio)
      for (let i = 0; i < this.records.length; i++) {
        const record = this.records[i];
        const photo1Base64 = this.stripDataUrl(record.photos[0] || '') || '';
        
        if (!photo1Base64 || photo1Base64.trim().length === 0) {
          this.ui.showToast(`Registro ${i + 1}: Foto inválida ou vazia. Adicione novamente.`, 'warning');
          return;
        }
        
        // Se houver foto 2, validar também
        if (record.photos[1]) {
          const photo2Base64 = this.stripDataUrl(record.photos[1] || '') || '';
          if (photo2Base64.trim().length === 0) {
            console.warn(`[Report] Registro ${i}: Foto 2 está vazia, será ignorada`);
          }
        }
      }

      // Enviar ao backend
      const data = await this.report.postTechnicalVisit(payload);
      
      if (!data) {
        throw new Error('Resposta vazia do servidor');
      }

      console.log('[Report] Visita técnica criada com sucesso:', data);

      // Fechar modal
      // Usar helper consistente para fechar o modal
      this.closeSignatureModal();

      // Limpa pads de assinatura
      try { this.clearAllSignatures(); } catch (_) {}
      this.techPad = null;
      this.clientPad = null;

      // Limpar rascunho
      localStorage.removeItem(this.DRAFT_KEY);
      this.records = [];
      this.reportDraft = { records: [] };

      this.ui.showToast('Relatório enviado com sucesso!', 'success', 4000);

      // Nota: A geração automática de PDF no backend está com erro
      // Por enquanto, o usuário pode baixar o PDF manualmente após criação
      // TODO: Investigar o erro de geração de PDF no backend e habilitá-lo depois
    } catch (e) {
      const error = e as any;
      let errorMsg = error.message || 'Erro desconhecido';
      
      // Log detalhado para debug de erro 500
      console.error('=== ERRO AO ENVIAR RELATÓRIO ===');
      console.error('Tipo de erro:', error.constructor.name);
      console.error('Mensagem:', errorMsg);
      console.error('Status:', error.status);
      console.error('Response text:', error.response?.text);
      console.error('Response JSON:', error.response?.json);
      console.error('Stack:', error.stack);
      console.error('Full error object:', error);
      
      this.ui.showToast(`Falha ao enviar relatório: ${errorMsg}`, 'error');
    }
  }

  private getTechSignatureBase64(): string {
    try {
      // Tentar pegar do canvas primeiro (mais direto)
      const canvas = document.getElementById('techSignatureCanvasReport') as HTMLCanvasElement;
      if (canvas) {
        // Crop and export to avoid large transparent margins and keep stroke proportion
        try {
          const dataUrl = this.exportCroppedDataUrlLocal(canvas, 'image/png');
          return this.stripDataUrl(dataUrl) || '';
        } catch (_) {
          const dataUrl = canvas.toDataURL('image/png');
          return this.stripDataUrl(dataUrl) || '';
        }
      }
      
      // Fallback para this.techPad
      if (this.techPad && typeof this.techPad.toDataURL === 'function') {
        const dataUrl = this.techPad.toDataURL('image/png');
        return this.stripDataUrl(dataUrl) || '';
      }
    } catch (e) {
      console.warn('Erro ao obter assinatura técnica', e);
    }
    return '';
  }

  private getClientSignatureBase64(): string {
    try {
      // Tentar pegacar do canvas primeiro (mais direto)
      const canvas = document.getElementById('clientSignatureCanvasReport') as HTMLCanvasElement;
      if (canvas) {
        try {
          const dataUrl = this.exportCroppedDataUrlLocal(canvas, 'image/png');
          return this.stripDataUrl(dataUrl) || '';
        } catch (_) {
          const dataUrl = canvas.toDataURL('image/png');
          return this.stripDataUrl(dataUrl) || '';
        }
      }
      
      // Fallback para this.clientPad
      if (this.clientPad && typeof this.clientPad.toDataURL === 'function') {
        const dataUrl = this.clientPad.toDataURL('image/png');
        return this.stripDataUrl(dataUrl) || '';
      }
    } catch (e) {
      console.warn('Erro ao obter assinatura do cliente', e);
    }
    return '';
  }

  // Local helper to crop a canvas removing transparent margins (similar to SignatureModalComponent)
  private cropCanvasLocal(sourceCanvas: HTMLCanvasElement, alphaThreshold: number = 10): HTMLCanvasElement {
    try {
      const w = sourceCanvas.width;
      const h = sourceCanvas.height;
      const ctx = sourceCanvas.getContext('2d');
      if (!ctx) return sourceCanvas;

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > alphaThreshold) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maxX < minX || maxY < minY) return sourceCanvas;

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      const out = document.createElement('canvas');
      out.width = cropW;
      out.height = cropH;
      const outCtx = out.getContext('2d');
      if (!outCtx) return sourceCanvas;
      outCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      return out;
    } catch (e) {
      return sourceCanvas;
    }
  }

  // Export cropped canvas to dataURL and optionally resize if wider than maxWidth
  private exportCroppedDataUrlLocal(sourceCanvas: HTMLCanvasElement, type: string = 'image/png', maxWidth: number | null = 1200): string {
    try {
      const cropped = this.cropCanvasLocal(sourceCanvas);
      if (maxWidth && cropped.width > maxWidth) {
        const scale = maxWidth / cropped.width;
        const resized = document.createElement('canvas');
        resized.width = Math.round(cropped.width * scale);
        resized.height = Math.round(cropped.height * scale);
        const rctx = resized.getContext('2d');
        if (rctx) rctx.drawImage(cropped, 0, 0, resized.width, resized.height);
        return resized.toDataURL(type);
      }
      return cropped.toDataURL(type);
    } catch (e) {
      try { return sourceCanvas.toDataURL(type); } catch (_) { return ''; }
    }
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    // Se já está em YYYY-MM-DD, retorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    // Tenta converter de DD/MM/YYYY
    const match = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (match) {
      let day = match[1].padStart(2, '0');
      let month = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) year = '20' + year;
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  private formatTime(timeString: string): string {
    if (!timeString) return '';
    // Remove segundos se presentes (HH:mm:ss -> HH:mm)
    return timeString.split(':').slice(0, 2).join(':');
  }

  private stripDataUrl(dataUrl: string): string | null {
    if (!dataUrl) return null;
    const parts = dataUrl.split(',');
    return parts.length > 1 ? parts[1] : dataUrl;
  }

  private resizeImageTo6_8cm(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.onload = () => {
          // 6.8 cm = ~256 pixels (assumindo 96 DPI)
          const maxWidth = 256;
          let width = img.width;
          let height = img.height;

          // Calcula a proporção
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          // Cria um canvas com as novas dimensões
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          // Desenha a imagem redimensionada no canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Não foi possível obter contexto 2D do canvas'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Converte para base64 com qualidade reduzida (0.85 = 85%)
          const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          console.log('[Report] Imagem redimensionada para', width, 'x', height, 'pixels');
          resolve(resizedBase64);
        };
        img.onerror = () => {
          reject(new Error('Falha ao carregar imagem'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Falha ao ler arquivo'));
      };
      reader.readAsDataURL(file);
    });
  }

  // Método público para debug - chame via console: document.querySelector('app-report').__ngContext__.lView[8].component.debugUserProfile()
  public async debugUserProfile(): Promise<void> {
    console.log('=== DEBUG USER PROFILE ===');
    const me = await this.legacy.fetchUserProfile();
    console.log('Perfil completo:', me);
    console.log('Chaves:', Object.keys(me || {}));
    console.table(me);
    
    const siglaInput = this.host.nativeElement.querySelector('#responsavelSigla') as HTMLInputElement;
    const regInput = this.host.nativeElement.querySelector('#responsavelRegistro') as HTMLInputElement;
    
    console.log('Input #responsavelSigla:', { exists: !!siglaInput, value: siglaInput?.value, id: siglaInput?.id });
    console.log('Input #responsavelRegistro:', { exists: !!regInput, value: regInput?.value, id: regInput?.id });
    
    // Tenta preencher manualmente
    if (siglaInput && me) {
      const sigla = me.councilAcronym || me.siglaConselhoClasse || me.sigla || me.conselhoSigla || me.councilAcronym || '';
      console.log('Tentando preencher sigla com:', sigla);
      siglaInput.value = sigla;
      siglaInput.dispatchEvent(new Event('input', { bubbles: true }));
      siglaInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('Após preencher, valor no input:', siglaInput.value);
    }
    
    if (regInput && me) {
      const reg = me.councilNumber || me.conselhoClasse || me.registro || me.conselhoRegistro || me.registration || me.crm || '';
      console.log('Tentando preencher registro com:', reg);
      regInput.value = reg;
      regInput.dispatchEvent(new Event('input', { bubbles: true }));
      regInput.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('Após preencher, valor no input:', regInput.value);
    }
  }

  // Função de debug para visualizar o payload antes de enviar
  public debugPayload(): void {
    console.log('=== DEBUG PAYLOAD ===');
    console.log('Registros:', this.records.length);
    this.records.forEach((r, idx) => {
      const photo1 = this.stripDataUrl(r.photos[0] || '') || '';
      const photo2 = this.stripDataUrl(r.photos[1] || '') || '';
      console.log(`Registro ${idx}:`, {
        description: r.description,
        consequences: r.consequences,
        legal: r.legal,
        responsible: r.responsible,
        penalties: r.penalties,
        priority: r.priority,
        deadline: r.deadline,
        unchanged: r.unchanged,
        photo1_tamanho: photo1.length,
        photo2_tamanho: photo2.length
      });
    });

    // Captura dados do formulário
    const dataInspacao = (document.getElementById('dataInspecao') as HTMLInputElement)?.value || '';
    const startTime = (document.getElementById('reportStartTime') as HTMLInputElement)?.value || '';
    const responsavel = (document.getElementById('responsavel') as HTMLInputElement)?.value || '';
    const sigla = (document.getElementById('responsavelSigla') as HTMLInputElement)?.value || '';
    const registro = (document.getElementById('responsavelRegistro') as HTMLInputElement)?.value || '';

    console.log('Dados do formulário:', {
      dataInspacao,
      startTime,
      responsavel,
      sigla,
      registro
    });

    // Verifica assinaturas
    const techSig = this.getTechSignatureBase64();
    const clientSig = this.getClientSignatureBase64();
    console.log('Assinaturas:', {
      tech_tamanho: techSig.length,
      client_tamanho: clientSig.length,
      tech_valid: techSig.length > 0 ? 'SIM' : 'NÃO',
      client_valid: clientSig.length > 0 ? 'SIM' : 'NÃO'
    });

    console.log('Geolocalização:', this.geolocation);
  }
}
