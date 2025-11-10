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
    geolocation?: { latitude: number | null; longitude: number | null } | null;
  }>();

  isOpen = false;
  techName = '';
  clientName = '';
  geolocation: { latitude: number | null; longitude: number | null } | null = null;

  private signatureService = inject(SignatureService);
  private ui = inject(UiService);
  private legacy = inject(LegacyService);

  private techPad: any;
  private clientPad: any;

  // Recorta o canvas removendo margens transparentes
  private cropCanvas(sourceCanvas: HTMLCanvasElement, alphaThreshold: number = 10): HTMLCanvasElement {
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

      // se não encontrou pixels opacos, retorna o original
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

  // Exporta base64 a partir do canvas, aplicando crop e redimensionamento opcional
  private exportCroppedDataUrl(sourceCanvas: HTMLCanvasElement, type: string = 'image/png', maxWidth: number | null = 1200): string {
    try {
      const cropped = this.cropCanvas(sourceCanvas);
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
      try { return sourceCanvas.toDataURL(type); } catch (_) { return '';}
    }
  }

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
      // tentar obter geolocalização do dispositivo (se permitido pelo usuário)
      try {
        if (navigator && typeof navigator.geolocation !== 'undefined' && navigator.geolocation.getCurrentPosition) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              try {
                this.geolocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
              } catch (_) { this.geolocation = { latitude: null, longitude: null }; }
            },
            err => {
              // se o usuário negar ou houver erro, armazenar nulls
              this.geolocation = { latitude: null, longitude: null };
            },
            { enableHighAccuracy: false, timeout: 5000 }
          );
        } else {
          this.geolocation = { latitude: null, longitude: null };
        }
      } catch (e) {
        this.geolocation = { latitude: null, longitude: null };
      }
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

    // Emitir evento com as assinaturas (usar canvas recortado/redimensionado para remover margens transparentes)
    const techDataUrl = this.techCanvas && this.techCanvas.nativeElement ? this.exportCroppedDataUrl(this.techCanvas.nativeElement) : (this.techPad && typeof this.techPad.toDataURL === 'function' ? this.techPad.toDataURL() : '');
    const clientDataUrl = this.clientCanvas && this.clientCanvas.nativeElement ? this.exportCroppedDataUrl(this.clientCanvas.nativeElement) : (this.clientPad && typeof this.clientPad.toDataURL === 'function' ? this.clientPad.toDataURL() : '');

    this.confirmSignatures.emit({
      techName: this.techName.trim(),
      techSignature: techDataUrl,
      clientName: this.clientName.trim(),
      clientSignature: clientDataUrl,
      geolocation: this.geolocation || null
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
