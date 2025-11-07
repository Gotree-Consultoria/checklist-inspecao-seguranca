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

  // Nova estrutura: lista de seções contendo itens
  sections: Array<any> = [
    {
      title: 'Higiene e Limpeza (NR 24 - Condições Sanitárias e de Conforto nos Locais de Trabalho)',
      items: [
        { key: 'cozinha.higiene.superficies', description: 'Superfícies de trabalho limpas e desinfetadas.', status: '', justification: '' },
        { key: 'cozinha.higiene.utensilios', description: 'Utensílios e equipamentos higienizados.', status: '', justification: '' },
        { key: 'cozinha.higiene.pisos', description: 'Pisos limpos, secos e antiderrapantes.', status: '', justification: '' },
        { key: 'cozinha.higiene.lixeiras', description: 'Lixeiras com tampas e acionamento por pedal, esvaziadas regularmente.', status: '', justification: '' }
      ]
    },
    {
      title: 'Equipamentos e Máquinas (NR 12)',
      items: [ { key: 'cozinha.maquinas.operacaoSegura', description: 'Procedimentos para operação segura de equipamentos (fornos, batedeiras, fatiadores).', status: '', justification: '' } ]
    },
    {
      title: 'Ergonomia (NR 17)',
      items: [
        { key: 'cozinha.ergonomia.posturas', description: 'Posturas adequadas ao levantar peso.', status: '', justification: '' },
        { key: 'cozinha.ergonomia.bancadas', description: 'Bancadas e estações de trabalho em altura ergonômica.', status: '', justification: '' }
      ]
    },
    {
      title: 'Coifas e Exaustores (NR 15 / NR 24)',
      items: [
        { key: 'cozinha.coifas.funcionamento', description: 'Coifas e exaustores em funcionamento adequado.', status: '', justification: '' },
        { key: 'cozinha.coifas.limpeza', description: 'Limpeza periódica das coifas e dutos de exaustão.', status: '', justification: '' },
        { key: 'cozinha.coifas.manutencao', description: 'Manutenção preventiva dos sistemas de exaustão.', status: '', justification: '' }
      ]
    },
    {
      title: 'Pisos (NR 24)',
      items: [
        { key: 'cozinha.pisos.antiderrapante', description: 'Pisos antiderrapantes em todas as áreas de trabalho.', status: '', justification: '' },
        { key: 'cozinha.pisos.conservacao', description: 'Pisos em bom estado de conservação, sem rachaduras ou desníveis.', status: '', justification: '' },
        { key: 'cozinha.pisos.limpezaFacil', description: 'Facilidade de limpeza e higienização dos pisos.', status: '', justification: '' }
      ]
    },
    {
      title: 'Área de Vivência (NR 18 / NR 24)',
      items: [
        { key: 'cozinha.areaVivencia.sanitarios', description: 'Instalações sanitárias adequadas e em quantidade suficiente.', status: '', justification: '' },
        { key: 'cozinha.areaVivencia.vestiarios', description: 'Vestiários limpos e organizados.', status: '', justification: '' },
        { key: 'cozinha.areaVivencia.refeitorio', description: 'Refeitórios com condições de higiene e conforto.', status: '', justification: '' },
        { key: 'cozinha.areaVivencia.alojamentos', description: 'Alojamentos em conformidade com a NR 24 (se aplicável).', status: '', justification: '' }
      ]
    },
    // Canteiro de Obras (seções e itens)
    {
      title: 'Canteiro - Geral',
      items: [
        { key: 'canteiro.isolamento', description: 'Isolamento e sinalização adequados do canteiro de obras.', status: '', justification: '' },
        { key: 'canteiro.organizacao', description: 'Organização e limpeza do local, sem entulhos ou materiais espalhados.', status: '', justification: '' },
        { key: 'canteiro.protecaoAberturas', description: 'Proteção de aberturas no piso e vãos.', status: '', justification: '' },
        { key: 'canteiro.acessoSeguro', description: 'Acesso e circulação de pessoas e materiais seguros.', status: '', justification: '' },
        { key: 'canteiro.sinalizacao', description: 'Sinalização de segurança em bom estado.', status: '', justification: '' }
      ]
    },
    {
      title: 'Trabalho em Altura (NR 35 / NR 18)',
      items: [
        { key: 'canteiro.trabalhoAltura.arpt', description: 'Análise de Risco (AR) e Permissão de Trabalho (PT) para atividades em altura.', status: '', justification: '' },
        { key: 'canteiro.trabalhoAltura.cinto', description: 'Uso de cinto tipo paraquedista com talabarte duplo.', status: '', justification: '' },
        { key: 'canteiro.trabalhoAltura.andaimes', description: 'Andaimes montados e inspecionados por profissional habilitado.', status: '', justification: '' },
        { key: 'canteiro.trabalhoAltura.redes', description: 'Redes de segurança instaladas quando necessário, com laudo técnico.', status: '', justification: '' },
        { key: 'canteiro.trabalhoAltura.plataformas', description: 'Plataformas de trabalho seguras com guarda-corpo e rodapé.', status: '', justification: '' },
        { key: 'canteiro.trabalhoAltura.escadas', description: 'Escadas em bom estado, fixas e com corrimão.', status: '', justification: '' },
        { key: 'canteiro.trabalhoAltura.linhasVida', description: 'Linhas de vida instaladas e certificadas.', status: '', justification: '' }
      ]
    },
    {
      title: 'Canteiro - Máquinas e Equipamentos',
      items: [
        { key: 'canteiro.maquinas.protecao', description: 'Máquinas com proteções e dispositivos de segurança.', status: '', justification: '' },
        { key: 'canteiro.maquinas.operadoresTreinados', description: 'Operadores treinados e autorizados.', status: '', justification: '' },
        { key: 'canteiro.maquinas.inspecaoDiaria', description: 'Inspeção diária de equipamentos.', status: '', justification: '' },
        { key: 'canteiro.maquinas.fiaçãoProtegida', description: 'Fiação elétrica protegida e aterrada (NR 10).', status: '', justification: '' }
      ]
    },
    {
      title: 'Canteiro - Movimentação e Armazenagem',
      items: [
        { key: 'canteiro.movimentacao.cargas', description: 'Cargas armazenadas de forma segura e estável.', status: '', justification: '' },
        { key: 'canteiro.movimentacao.equipamentos', description: 'Equipamentos de movimentação com manutenção em dia e operadores habilitados.', status: '', justification: '' },
        { key: 'canteiro.movimentacao.corredores', description: 'Corredores de circulação desobstruídos e sinalizados.', status: '', justification: '' }
      ]
    },
    {
      title: 'Canteiro - Escavações e Fundações (NR 18)',
      items: [
        { key: 'canteiro.escavacoes.taludes', description: 'Taludes escorados ou em ângulo seguro conforme projeto.', status: '', justification: '' },
        { key: 'canteiro.escavacoes.sinalizacao', description: 'Sinalização e isolamento da área de escavação.', status: '', justification: '' },
        { key: 'canteiro.escavacoes.acessoSeguro', description: 'Acesso seguro à escavação.', status: '', justification: '' }
      ]
    },
    {
      title: 'Canteiro - Instalações Elétricas (NR 10 / NR 18)',
      items: [
        { key: 'canteiro.eletricidade.provisoria', description: 'Instalações elétricas provisórias e definitivas em conformidade.', status: '', justification: '' },
        { key: 'canteiro.eletricidade.quadros', description: 'Quadros elétricos aterrados e com proteção contra choques.', status: '', justification: '' }
      ]
    },
    {
      title: 'Canteiro - Proteção Contra Incêndios (NR 23)',
      items: [
        { key: 'canteiro.incendio.extintores', description: 'Extintores de incêndio em locais visíveis e dentro da validade.', status: '', justification: '' },
        { key: 'canteiro.incendio.saidas', description: 'Saídas de emergência sinalizadas e desimpedidas.', status: '', justification: '' }
      ]
    },
    {
      title: 'Canteiro - Primeiros Socorros (NR 07)',
      items: [ { key: 'canteiro.primeirosSocorros.kit', description: 'Kit de primeiros socorros acessível e completo.', status: '', justification: '' } ]
    },
    // Fábrica
    {
      title: 'Gerenciamento de Riscos (NR 01)',
      items: [
        { key: 'fabrica.pgr', description: 'Elaboração e implementação do Programa de Gerenciamento de Riscos (PGR).', status: '', justification: '' },
        { key: 'fabrica.apr', description: 'Análise Preliminar de Risco (APR) para atividades específicas.', status: '', justification: '' }
      ]
    },
    {
      title: 'Máquinas e Equipamentos (NR 12) - Fábrica',
      items: [
        { key: 'fabrica.maquinas.protecao', description: 'Proteções de máquinas em perfeito estado.', status: '', justification: '' },
        { key: 'fabrica.maquinas.paradaEmergencia', description: 'Dispositivos de parada de emergência acessíveis e funcionando.', status: '', justification: '' },
        { key: 'fabrica.maquinas.loto', description: 'Procedimentos de Bloqueio e Etiquetagem (LOTO) para manutenção.', status: '', justification: '' }
      ]
    },
    {
      title: 'Movimentação de Cargas (NR 11) - Fábrica',
      items: [ { key: 'fabrica.movimentacao.equipamentos', description: 'Empilhadeiras e equipamentos com manutenção e operadores habilitados.', status: '', justification: '' } ]
    },
    {
      title: 'Produtos Químicos (NR 20 / NR 26)',
      items: [
        { key: 'fabrica.quimicos.armazenamento', description: 'Armazenamento correto e seguro de produtos químicos.', status: '', justification: '' },
        { key: 'fabrica.quimicos.fispq', description: 'FISPQ acessíveis e compreensíveis.', status: '', justification: '' },
        { key: 'fabrica.quimicos.epi', description: 'Uso de EPIs específicos para manuseio de químicos.', status: '', justification: '' }
      ]
    }
  ];

  saveChecklist(e?: Event) {
    if (e) e.preventDefault();
    // coletar valores dos checkboxes
    try {
      // coletar dados a partir da nova estrutura interna
      const data: any = {};
      data.title = (document.getElementById('reportTitleNR') as HTMLInputElement)?.value || 'Checklist NR';
      data.date = (document.getElementById('dataInspecaoNR') as HTMLInputElement)?.value || new Date().toISOString().substring(0,10);
      data.notes = (document.getElementById('anotacoesNR') as HTMLTextAreaElement)?.value || '';
      // mapear seções/itens
      data.sections = this.sections.map((s: any) => ({
        title: s.title,
        items: s.items.map((it: any) => ({ description: it.description, status: it.status || null, justification: it.justification || null }))
      }));
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
    // coletar cabeçalho e mapear a estrutura de seções/itens conforme DTO esperado
    const data: any = {};
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

    // mapear para NrsSectionDTO-like
    data.sections = this.sections.map((s: any) => ({
      title: s.title,
      items: s.items.map((it: any) => ({
        key: it.key || null,
        description: it.description,
        status: it.status || null,
        justification: it.justification || null
      }))
    }));

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
    // combinar assinaturas e enviar ao backend via ReportService no endpoint /inspection-reports/nrs
    const finalPayload = Object.assign({}, this.pendingPayload || {});
    finalPayload.signatures = signs;
    // enviar
    (async () => {
      try {
        const resp = await this.report.postNrsReport(finalPayload);
        this.ui.showToast('Checklist NR enviado com sucesso.', 'success', 4000);
        console.log('[ChecklistNr] resposta backend:', resp);
      } catch (err: any) {
        console.error('[ChecklistNr] erro ao enviar NRS:', err);
        this.ui.showToast('Falha ao enviar checklist para o servidor. Salvando localmente.', 'error', 5000);
        this.saveChecklistLocally(finalPayload);
      } finally {
        this.pendingPayload = null;
      }
    })();
  }

  // Atualiza status do item e gerencia justificativa visível
  setItemStatus(sectionIdx: number, itemIdx: number, status: 'CONFORME' | 'NAO_CONFORME' | 'NAO_APLICA') {
    try {
      const it = this.sections[sectionIdx].items[itemIdx];
      if (!it) return;
      it.status = status;
      if (status !== 'NAO_APLICA') {
        it.justification = '';
      }
    } catch (e) { console.warn('setItemStatus', e); }
  }

  setItemJustification(sectionIdx: number, itemIdx: number, value: string) {
    try { this.sections[sectionIdx].items[itemIdx].justification = value || ''; } catch(e) { /* ignore */ }
  }

  // Regra visual da seção-pai: se todos NAO_CONFORME => 'NC', se todos NAO_APLICA => 'NA', else ''
  getSectionVisualStatus(section: any): string {
    if (!section || !Array.isArray(section.items) || section.items.length === 0) return '';
    const statuses = section.items.map((i: any) => i.status || null);
    if (statuses.every((s: any) => s === 'NAO_CONFORME')) return 'NC';
    if (statuses.every((s: any) => s === 'NAO_APLICA')) return 'NA';
    return '';
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
