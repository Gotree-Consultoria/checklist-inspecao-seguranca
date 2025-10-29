import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegacyService } from '../../../services/legacy.service';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule],
  template: `
  <section class="hero">
    <div class="container">
      <div class="hero-content">
        <h1>Gerencie seus check-lists e relatórios com mais segurança e organização</h1>
        <!-- CTA removido -->
      </div>
    </div>
  </section>
  `,
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  constructor(public legacy: LegacyService) {}
  openLegacy() {
    // chama método do serviço se existir
    if (this.legacy && typeof (this.legacy as any).openLegacy === 'function') {
      (this.legacy as any).openLegacy();
    }
  }
}
