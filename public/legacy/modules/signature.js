// Módulo de assinatura: tenta usar signature_pad externo ou fallback SimpleSignaturePad
const CDN_URL = 'https://cdn.jsdelivr.net/npm/signature_pad@4.0.0/dist/signature_pad.umd.min.js';

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = (e) => reject(e || new Error('Failed to load script ' + src));
        document.head.appendChild(s);
    });
}

function resolveSigCtor() {
    if (typeof window.SignaturePad === 'function') return window.SignaturePad;
    if (window.SignaturePad && typeof window.SignaturePad.default === 'function') return window.SignaturePad.default;
    if (typeof window.signature_pad === 'function') return window.signature_pad;
    if (window.signature_pad && typeof window.signature_pad.default === 'function') return window.signature_pad.default;
    try {
        const keys = Object.keys(window);
        for (let k of keys) {
            const kl = k.toLowerCase();
            if (kl.includes('signature') || kl.includes('signaturepad') || kl.includes('signature_pad')) {
                const val = window[k];
                if (typeof val === 'function') return val;
                if (val && typeof val.default === 'function') return val.default;
                if (val && typeof val.SignaturePad === 'function') return val.SignaturePad;
            }
        }
    } catch (_) {}
    return null;
}

// Fallback leve para captura de assinatura (funciona offline).
// Implementa as mesmas APIs usadas pelo código: clear(), isEmpty(), toDataURL().
export class SimpleSignaturePad {
    constructor(canvas, opts = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.penColor = (opts.penColor) || 'black';
        this.backgroundColor = (opts.backgroundColor) || 'rgba(255,255,255,0)';
        this.drawing = false;
        this.hasStroke = false;
        this._resizeCanvas();
        this.clear();
        this._pointerDown = this._pointerDown.bind(this);
        this._pointerMove = this._pointerMove.bind(this);
        this._pointerUp = this._pointerUp.bind(this);
        this.canvas.addEventListener('mousedown', this._pointerDown);
        this.canvas.addEventListener('mousemove', this._pointerMove);
        document.addEventListener('mouseup', this._pointerUp);
        this.canvas.addEventListener('touchstart', this._pointerDown, {passive:false});
        this.canvas.addEventListener('touchmove', this._pointerMove, {passive:false});
        document.addEventListener('touchend', this._pointerUp);
        window.addEventListener('resize', () => this._resizeCanvas());
    }
    _resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const w = this.canvas.clientWidth || this.canvas.width;
        const h = this.canvas.clientHeight || this.canvas.height;
        const tmp = document.createElement('canvas');
        tmp.width = this.canvas.width;
        tmp.height = this.canvas.height;
        tmp.getContext('2d').drawImage(this.canvas, 0, 0);
        this.canvas.width = Math.floor(w * ratio);
        this.canvas.height = Math.floor(h * ratio);
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        const ctx = this.ctx = this.canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        ctx.drawImage(tmp, 0, 0, w, h);
    }
    _getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        if (e.touches && e.touches.length) e = e.touches[0];
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    _pointerDown(e) {
        e.preventDefault();
        const p = this._getPointerPos(e);
        this.drawing = true;
        this.hasStroke = true;
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.penColor;
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.moveTo(p.x, p.y);
    }
    _pointerMove(e) {
        if (!this.drawing) return;
        e.preventDefault();
        const p = this._getPointerPos(e);
        this.ctx.lineTo(p.x, p.y);
        this.ctx.stroke();
    }
    _pointerUp(e) {
        if (!this.drawing) return;
        this.drawing = false;
        try { this.ctx.closePath(); } catch(_){}
    }
    clear() {
        const ctx = this.ctx;
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
        if (this.backgroundColor && this.backgroundColor !== 'rgba(255,255,255,0)') {
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        }
        ctx.restore();
        this.hasStroke = false;
    }
    isEmpty() {
        return !this.hasStroke;
    }
    toDataURL(type='image/png') {
        return this.canvas.toDataURL(type);
    }
}

export async function initSignaturePads(techCanvas, clientCanvas, opts = {}) {
    // tenta encontrar construtor já carregado
    let SigCtor = resolveSigCtor();
    if (!SigCtor) {
        try {
            await loadScript(CDN_URL);
        } catch (e) {
            // falha no carregamento CDN; seguirá para fallback
            console.warn('Falha ao carregar CDN SignaturePad', e);
        }
        SigCtor = resolveSigCtor();
    }
    if (SigCtor) {
        return { tech: new SigCtor(techCanvas, opts), client: new SigCtor(clientCanvas, opts) };
    }
    // fallback offline
    return { tech: new SimpleSignaturePad(techCanvas, opts), client: new SimpleSignaturePad(clientCanvas, opts) };
}

export default { SimpleSignaturePad, initSignaturePads };
