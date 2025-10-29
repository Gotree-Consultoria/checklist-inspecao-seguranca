import { Injectable } from '@angular/core';

/**
 * SimpleSignaturePad - Fallback offline para captura de assinatura
 * Implementa as mesmas APIs: clear(), isEmpty(), toDataURL()
 */
export class SimpleSignaturePad {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private penColor: string;
  private backgroundColor: string;
  private drawing: boolean = false;
  private hasStroke: boolean = false;

  constructor(canvas: HTMLCanvasElement, opts: any = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.penColor = opts.penColor || 'black';
    this.backgroundColor = opts.backgroundColor || 'rgba(255,255,255,0)';

    this._resizeCanvas();
    this.clear();

    this._pointerDown = this._pointerDown.bind(this);
    this._pointerMove = this._pointerMove.bind(this);
    this._pointerUp = this._pointerUp.bind(this);

    this.canvas.addEventListener('mousedown', this._pointerDown);
    this.canvas.addEventListener('mousemove', this._pointerMove);
    document.addEventListener('mouseup', this._pointerUp);

    this.canvas.addEventListener('touchstart', this._pointerDown, { passive: false });
    this.canvas.addEventListener('touchmove', this._pointerMove, { passive: false });
    document.addEventListener('touchend', this._pointerUp);

    window.addEventListener('resize', () => this._resizeCanvas());
  }

  private _resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const w = this.canvas.clientWidth || this.canvas.width;
    const h = this.canvas.clientHeight || this.canvas.height;

    const tmp = document.createElement('canvas');
    tmp.width = this.canvas.width;
    tmp.height = this.canvas.height;
    tmp.getContext('2d')!.drawImage(this.canvas, 0, 0);

    this.canvas.width = Math.floor(w * ratio);
    this.canvas.height = Math.floor(h * ratio);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(ratio, ratio);
    this.ctx.drawImage(tmp, 0, 0, w, h);
  }

  private _getPointerPos(e: any): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    if (e.touches && e.touches.length) e = e.touches[0];
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private _pointerDown = (e: any) => {
    e.preventDefault();
    const p = this._getPointerPos(e);
    this.drawing = true;
    this.hasStroke = true;
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.penColor;
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.moveTo(p.x, p.y);
  };

  private _pointerMove = (e: any) => {
    if (!this.drawing) return;
    e.preventDefault();
    const p = this._getPointerPos(e);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
  };

  private _pointerUp = (e: any) => {
    if (!this.drawing) return;
    this.drawing = false;
    try {
      this.ctx.closePath();
    } catch (_) {}
  };

  clear() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.backgroundColor && this.backgroundColor !== 'rgba(255,255,255,0)') {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.restore();
    this.hasStroke = false;
  }

  isEmpty(): boolean {
    return !this.hasStroke;
  }

  toDataURL(type: string = 'image/png'): string {
    return this.canvas.toDataURL(type);
  }
}

@Injectable({ providedIn: 'root' })
export class SignatureService {
  private CDN_URL = 'https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js';

  async loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.head.appendChild(script);
    });
  }

  private resolveSigCtor(): any {
    if (typeof (window as any).SignaturePad === 'function') return (window as any).SignaturePad;
    if ((window as any).SignaturePad?.default) return (window as any).SignaturePad.default;
    if (typeof (window as any).signature_pad === 'function') return (window as any).signature_pad;
    if ((window as any).signature_pad?.default) return (window as any).signature_pad.default;

    try {
      const keys = Object.keys(window);
      for (let k of keys) {
        const kl = k.toLowerCase();
        if (kl.includes('signature') || kl.includes('signaturepad') || kl.includes('signature_pad')) {
          const val = (window as any)[k];
          if (typeof val === 'function') return val;
          if (val?.default) return val.default;
          if (val?.SignaturePad) return val.SignaturePad;
        }
      }
    } catch (_) {}
    return null;
  }

  async initSignaturePads(
    techCanvas: HTMLCanvasElement,
    clientCanvas: HTMLCanvasElement,
    opts: any = {}
  ): Promise<{ tech: any; client: any }> {
    let SigCtor = this.resolveSigCtor();

    if (!SigCtor) {
      try {
        await this.loadScript(this.CDN_URL);
      } catch (e) {
        console.warn('Falha ao carregar CDN SignaturePad', e);
      }
      SigCtor = this.resolveSigCtor();
    }

    if (SigCtor) {
      return { tech: new SigCtor(techCanvas, opts), client: new SigCtor(clientCanvas, opts) };
    }

    // Fallback offline
    return { tech: new SimpleSignaturePad(techCanvas, opts), client: new SimpleSignaturePad(clientCanvas, opts) };
  }
}
