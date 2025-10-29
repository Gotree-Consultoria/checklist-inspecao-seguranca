import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  // Compat: aceita tanto (message, duration:number) quanto (message, type:string)
  showToast(message: string, typeOrDuration: string | number = 'info', duration = 3000) {
    // Se o segundo arguemento for número, é o duration
    if (typeof typeOrDuration === 'number') {
      duration = typeOrDuration;
    }
    // Caso seja string (tipo), podemos usar para styling no futuro — por enquanto ignoramos
    // Simple toast fallback — replace with a global component later
    const div = document.createElement('div');
    div.textContent = message;
    div.style.position = 'fixed';
    div.style.right = '16px';
    div.style.bottom = '16px';
    div.style.background = 'rgba(0,0,0,0.8)';
    div.style.color = 'white';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '6px';
    div.style.zIndex = '9999';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), duration);
  }

  async confirm(message: string) {
    return confirm(message);
  }
}
