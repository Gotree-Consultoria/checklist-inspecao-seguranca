import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { ReportService } from '../../../services/report.service';

@Component({
  standalone: true,
  selector: 'app-report',
  imports: [CommonModule, FormsModule],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})
export class ReportComponent implements OnInit {
  private legacy = inject(LegacyService);
  private ui = inject(UiService);
  private report = inject(ReportService);
  private host = inject(ElementRef);

  records: Array<any> = [];

  async ngOnInit(): Promise<void> {
    // Não injetamos scripts legacy automaticamente. Buscamos a lista de empresas via ReportService.
    try {
      const companies = await this.report.fetchCompanies().catch(()=>null);
      if (!companies) {
        this.ui.showToast('Lista de empresas não disponível — funcionalidade em migração.', 'info', 4000);
      }
    } catch (e) {
      console.warn('fetchCompanies failed', e);
      this.ui.showToast('Falha ao carregar empresas. Esta funcionalidade está sendo migrada.', 'error', 4000);
    }
  }

  addRecord() {
    this.records.push({ file: null, description: '', preview: null });
  }

  removeRecord(index: number) {
    this.records.splice(index, 1);
  }

  onRecordFileChange(ev: Event, record: any) {
    const input = ev.target as HTMLInputElement;
    if (!input || !input.files || !input.files.length) return;
    const file = input.files[0];
    record.file = file;
    const reader = new FileReader();
    reader.onload = () => { record.preview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  onCompanyChange(e: Event) {
    // delega ao legacy handler que já popula unidades e setores via dataset
    try { const el = e.target as HTMLSelectElement; const evt = new Event('change'); el.dispatchEvent(evt); } catch(_){}
  }

  async handleSaveClick(e: Event) {
    e.preventDefault();
    // validar campos mínimos
    const title = (document.getElementById('reportTitle') as HTMLInputElement)?.value || '';
    const clientNameInput = document.getElementById('clientSignerName') as HTMLInputElement;
    // abrir modal de assinatura usando o módulo legacy de assinatura que inicializa pads
    try {
      // se existir openSignatureModal global, use-o para manter compatibilidade
      if ((window as any).openSignatureModal) {
        await (window as any).openSignatureModal({
          modalId: '#reportSignatureModal',
          techCanvasSelector: '#techSignatureCanvasReport',
          clientCanvasSelector: '#clientSignatureCanvasReport',
          techNameSelector: '#techNameReport',
          clientNameSelector: '#clientSignerName',
          clearAllBtnId: '#clearAllSignaturesBtnReport',
          clearTechBtnId: '#clearTechSigReport',
          clearClientBtnId: '#clearClientSigReport',
          confirmBtnId: '#confirmSendReportBtn',
          cancelBtnId: '#cancelSendReportBtn'
        });
        return;
      }

      // A coleta de assinaturas e envio ao backend será migrada para Angular.
      // Por enquanto, informamos ao usuário que esta funcionalidade está em migração
      // e usamos o ReportService para enviar se os dados estiverem disponíveis.
      this.ui.showToast('Envio do relatório via assinatura está em migração. Por favor, utilize a versão antiga do app para testes.', 'info', 6000);
    } catch (e) {
      console.warn('signature init failed', e);
      this.ui.showToast('Não foi possível inicializar a assinatura.', 'error');
    }
  }
}
