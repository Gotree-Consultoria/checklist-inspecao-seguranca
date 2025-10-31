import { Component, OnInit, ElementRef, ViewChild, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignatureService } from '../../../services/signature.service';
import { UiService } from '../../../services/ui.service';
import { LegacyService } from '../../../services/legacy.service';

@Component({
  selector: 'app-signature-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" [class.hidden-modal]="!isOpen">
      <div class="modal">
        <div class="modal-header">
          <h3>Assinaturas</h3>
          <button type="button" class="close-btn" (click)="cancel()" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body">
          <p>Por favor, colete a assinatura do Técnico e do Cliente.</p>

          <div class="sign-block">
            <h4>Técnico</h4>
            <div class="fg">
              <label for="techName">Nome do Técnico</label>
              <input type="text" id="techName" class="form-control sig-name-input" [(ngModel)]="techName" readonly />
            </div>
            <div class="fg">
              <label>Assinatura do Técnico</label>
              <canvas
                #techSignatureCanvas
                id="techSignatureCanvas"
                width="600"
                height="150"
                class="signature-canvas"
              ></canvas>
              <div class="signature-clear-btn">
                <button type="button" (click)="clearTechSignature()" class="btn-secondary">
                  Limpar Assinatura (Técnico)
                </button>
              </div>
            </div>
          </div>

          <hr />

          <div class="sign-block">
            <h4>Cliente</h4>
            <div class="fg">
              <label for="clientName">Nome do Responsável pela Empresa</label>
              <input type="text" id="clientName" class="form-control sig-name-input" [(ngModel)]="clientName" />
            </div>
            <div class="fg">
              <label>Assinatura do Cliente</label>
              <canvas
                #clientSignatureCanvas
                id="clientSignatureCanvas"
                width="600"
                height="150"
                class="signature-canvas"
              ></canvas>
              <div class="signature-clear-btn">
                <button type="button" (click)="clearClientSignature()" class="btn-secondary">
                  Limpar Assinatura (Cliente)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" (click)="clearAll()" class="btn-secondary">Limpar</button>
          <button type="button" (click)="confirm()" class="btn-submit">Confirmar e Salvar</button>
          <button type="button" (click)="cancel()" class="btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 1;
        visibility: visible;
        transition: opacity 0.3s, visibility 0.3s;
      }

      .modal-overlay.hidden-modal {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
      }

      .modal {
        background: white;
        border-radius: 8px;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      }

      .modal-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h3 {
        margin: 0;
        font-size: 1.5rem;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #666;
      }

      .modal-body {
        padding: 20px;
      }

      /* Sign blocks center the pads and align inputs to limited width */
      .sign-block {
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .fg {
        margin-bottom: 15px;
        width: 100%;
        max-width: 620px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      label {
        display: block;
        font-weight: 500;
        margin-bottom: 5px;
        color: #333;
        width: 100%;
        max-width: 620px;
        text-align: left;
      }

      .form-control {
        width: 60%;
        max-width: 360px;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.95rem;
      }

      .signature-canvas {
        border: 2px solid #ddd;
        border-radius: 6px;
        cursor: crosshair;
        background-color: white;
        display: block;
        margin: 10px auto; /* centraliza horizontalmente */
      }

      /* inputs menores para nomes nas assinaturas */
      .sig-name-input {
        width: 60%;
        max-width: 360px;
        display: inline-block;
      }

      .signature-clear-btn {
        margin-top: 10px;
      }

      .modal-footer {
        padding: 16px;
        border-top: 1px solid #eee;
        display: flex;
        justify-content: flex-end; /* alinhamento à direita (restaurado) */
        gap: 8px;
      }

      /* botões menores e compactos */
      .btn-submit,
      .btn-secondary {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
      }

      .btn-submit {
        background-color: #bfd83a;
        color: white;
      }

      .btn-secondary {
        background-color: #e65f3c;
        color: white;
      }

      hr {
        margin: 20px 0;
      }
    `,
  ],
})
export class SignatureModalComponent implements OnInit {
  @ViewChild('techSignatureCanvas', { static: false }) techCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('clientSignatureCanvas', { static: false }) clientCanvas!: ElementRef<HTMLCanvasElement>;

  @Output() confirmSignatures = new EventEmitter<{
    techName: string;
    techSignature: string;
    clientName: string;
    clientSignature: string;
  }>();

  isOpen = false;
  techName = '';
  clientName = '';

  private signatureService = inject(SignatureService);
  private ui = inject(UiService);
  private legacy = inject(LegacyService);

  private techPad: any;
  private clientPad: any;

  async ngOnInit() {
    // Inicializar signature pads após a view estar pronta
  }

  async open() {
    this.isOpen = true;
    // Aguardar que a view seja renderizada e carregar o nome do técnico automaticamente
    setTimeout(async () => {
      try {
        await this.loadTechnicianName();
      } catch (_) {}
      this.initSignaturePads();
    }, 0);
  }

  private async loadTechnicianName(): Promise<void> {
    try {
      const me = await this.legacy.fetchUserProfile().catch(() => null) || null;
      if (!me) return;
      const name = me.name || me.fullName || me.nome || me.usuario || '';
      if (name) this.techName = String(name).trim();
    } catch (e) {
      // ignore failures to avoid blocking modal
    }
  }

  private async initSignaturePads() {
    try {
      const pads = await this.signatureService.initSignaturePads(
        this.techCanvas.nativeElement,
        this.clientCanvas.nativeElement,
        this.signatureService.getDefaultPadOptions()
      );
      this.techPad = pads.tech;
      this.clientPad = pads.client;
    } catch (err) {
      console.error('Erro ao inicializar signature pads:', err);
      this.ui.showToast('Erro ao carregar canvas de assinatura', 'error', 5000);
    }
  }

  clearTechSignature() {
    if (this.techPad) this.techPad.clear();
  }

  clearClientSignature() {
    if (this.clientPad) this.clientPad.clear();
  }

  clearAll() {
    this.clearTechSignature();
    this.clearClientSignature();
    this.techName = '';
    this.clientName = '';
  }

  confirm() {
    // Validar preenchimento
    if (!this.techName.trim()) {
      this.ui.showToast('Por favor, preencha o nome do Técnico', 'warning', 3000);
      return;
    }
    if (!this.clientName.trim()) {
      this.ui.showToast('Por favor, preencha o nome do Cliente', 'warning', 3000);
      return;
    }
    if (!this.techPad || this.techPad.isEmpty()) {
      this.ui.showToast('Por favor, colete a assinatura do Técnico', 'warning', 3000);
      return;
    }
    if (!this.clientPad || this.clientPad.isEmpty()) {
      this.ui.showToast('Por favor, colete a assinatura do Cliente', 'warning', 3000);
      return;
    }

    // Emitir evento com as assinaturas
    this.confirmSignatures.emit({
      techName: this.techName.trim(),
      techSignature: this.techPad.toDataURL(),
      clientName: this.clientName.trim(),
      clientSignature: this.clientPad.toDataURL(),
    });

    this.close();
  }

  cancel() {
    this.close();
  }

  private close() {
    this.isOpen = false;
    this.clearAll();
  }
}
