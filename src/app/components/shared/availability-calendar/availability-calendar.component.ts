import { Component, OnInit, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvailabilityService, DayAvailability } from '../../../services/availability.service';
import { UiService } from '../../../services/ui.service';

/**
 * Componente de calendário customizado com indicadores visuais de disponibilidade
 * Mostra legenda em cima e pequenos traços de cor abaixo de cada data
 */
@Component({
  standalone: true,
  selector: 'app-availability-calendar',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="availability-calendar-container">
      <!-- Legenda de cores com texto -->
      <div class="availability-legend">
        <div class="legend-item">
          <span class="legend-color morning"></span>
          <span>Manhã ocupada</span>
        </div>
        <div class="legend-item">
          <span class="legend-color afternoon"></span>
          <span>Tarde ocupada</span>
        </div>
        <div class="legend-item">
          <span class="legend-color fullday"></span>
          <span>Dia cheio</span>
        </div>
      </div>

      <!-- Status de carregamento -->
      <div *ngIf="isLoading" class="availability-loading">
        <span class="spinner"></span> Carregando disponibilidade...
      </div>

      <!-- Mensagem de erro -->
      <div *ngIf="errorMessage" class="availability-error">
        ⚠ {{ errorMessage }}
      </div>

      <!-- Calendário personalizado -->
      <div *ngIf="!isLoading && !errorMessage" class="calendar-wrapper">
        <!-- Controles de navegação -->
        <div class="calendar-header">
          <button type="button" class="nav-button" (click)="previousMonth()" title="Mês anterior">
            ← Anterior
          </button>
          <h3 class="calendar-title">{{ monthYearDisplay }}</h3>
          <button type="button" class="nav-button" (click)="nextMonth()" title="Próximo mês">
            Próximo →
          </button>
        </div>

        <!-- Calendário -->
        <div class="calendar-grid">
          <!-- Cabeçalho com dias da semana -->
          <div class="calendar-weekdays">
            <div class="weekday" *ngFor="let day of weekDays">{{ day }}</div>
          </div>

          <!-- Dias do mês -->
          <div class="calendar-days">
            <!-- Espaços em branco antes do primeiro dia -->
            <div *ngFor="let _ of emptyDays" class="calendar-day empty"></div>

            <!-- Dias do mês -->
            <button
              *ngFor="let day of daysInMonth"
              type="button"
              class="calendar-day"
              [class.today]="isToday(day)"
              [class.selected]="isSelected(day)"
              [class.disabled]="isFullDayBusy(day)"
              (click)="selectDay(day)"
              [title]="getDayTooltip(day)"
            >
              <span class="day-number">{{ day }}</span>
              <div class="availability-indicator" [ngClass]="getIndicatorClass(day)"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./availability-calendar.component.css']
})
export class AvailabilityCalendarComponent implements OnInit {
  private availabilityService = inject(AvailabilityService);
  private ui = inject(UiService);

  @Input() selectedDate: Date | null = null;
  @Output() dateSelected = new EventEmitter<Date>();

  isLoading = false;
  errorMessage: string | null = null;

  // Propriedades do calendário
  currentDate = new Date();
  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  daysInMonth: number[] = [];
  emptyDays: number[] = [];
  monthYearDisplay = '';

  // Mapa de disponibilidades indexado por data (YYYY-MM-DD)
  private availabilityMap: Map<string, DayAvailability> = new Map();
  private loadedMonths: Set<string> = new Set();

  async ngOnInit(): Promise<void> {
    this.updateCalendarDisplay();
    await this.loadCurrentMonthAvailability();
  }

  /**
   * Atualiza a exibição do calendário baseado na data atual
   */
  private updateCalendarDisplay(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Atualizar título
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    this.monthYearDisplay = `${monthNames[month]} ${year}`;

    // Calcular primeiro dia da semana do mês
    const firstDay = new Date(year, month, 1).getDay();

    // Calcular número de dias no mês
    const daysCount = new Date(year, month + 1, 0).getDate();

    // Preencher arrays
    this.emptyDays = Array(firstDay).fill(0);
    this.daysInMonth = Array.from({ length: daysCount }, (_, i) => i + 1);
  }

  /**
   * Carrega disponibilidade do mês atual
   */
  private async loadCurrentMonthAvailability(): Promise<void> {
    const today = new Date();
    await this.loadMonthAvailability(today.getFullYear(), today.getMonth() + 1);
  }

  /**
   * Carrega disponibilidade para um mês específico
   */
  private async loadMonthAvailability(year: number, month: number): Promise<void> {
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    // Se já foi carregado, não carregar de novo
    if (this.loadedMonths.has(monthKey)) {
      return;
    }

    try {
      this.isLoading = true;
      this.errorMessage = null;

      const response = await this.availabilityService.getMonthAvailability(year, month);

      // Validar resposta
      if (!response || !response.days || !Array.isArray(response.days)) {
        this.loadedMonths.add(monthKey);
        return;
      }

      // Armazenar em Map para acesso O(1)
      response.days.forEach(day => {
        this.availabilityMap.set(day.date, day);
        // Log apenas se houver ocupação
        if (day.morningBusy || day.afternoonBusy || day.fullDayBusy) {
          console.log('[AvailabilityCalendar] 📍 Ocupação encontrada:', day);
        }
      });

      this.loadedMonths.add(monthKey);
    } catch (e) {
      const errorMsg = (e as Error).message || 'Erro ao carregar disponibilidade';
      console.error('[AvailabilityCalendar] Erro:', errorMsg);
      this.errorMessage = errorMsg;
      this.ui.showToast(errorMsg, 'error', 4000);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Navega para o mês anterior
   */
  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.currentDate = new Date(this.currentDate);
    this.updateCalendarDisplay();
    this.loadMonthAvailability(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1);
  }

  /**
   * Navega para o próximo mês
   */
  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.currentDate = new Date(this.currentDate);
    this.updateCalendarDisplay();
    this.loadMonthAvailability(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1);
  }

  /**
   * Seleciona um dia do calendário
   * 
   * IMPORTANTE: Aqui apenas selecionamos visualmente.
   * O bloqueio real (lógica) acontece no check-availability quando o usuário escolhe o turno.
   * A cor é apenas uma sugestão visual.
   */
  selectDay(day: number): void {
    try {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth() + 1;

      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const availability = this.availabilityMap.get(dateKey);

      // Criar data e emitir (sem bloqueios aqui - deixamos para o turno)
      const selectedDate = new Date(year, month - 1, day);
      this.selectedDate = selectedDate;
      this.dateSelected.emit(selectedDate);

    } catch (e) {
      console.error('[AvailabilityCalendar] Erro ao selecionar data:', e);
    }
  }

  // ====== HELPERS PARA TEMPLATE ======

  isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      this.currentDate.getMonth() === today.getMonth() &&
      this.currentDate.getFullYear() === today.getFullYear()
    );
  }

  isSelected(day: number): boolean {
    if (!this.selectedDate) return false;
    return (
      day === this.selectedDate.getDate() &&
      this.currentDate.getMonth() === this.selectedDate.getMonth() &&
      this.currentDate.getFullYear() === this.selectedDate.getFullYear()
    );
  }

  isFullDayBusy(day: number): boolean {
    const availability = this.getAvailability(day);
    return availability?.fullDayBusy ?? false;
  }

  getDayTooltip(day: number): string {
    const availability = this.getAvailability(day);

    if (!availability) {
      return 'Data disponível';
    }

    if (availability.fullDayBusy) {
      return 'Dia completamente ocupado - não disponível';
    }

    const parts: string[] = [];
    if (availability.morningBusy) parts.push('Manhã ocupada');
    if (availability.afternoonBusy) parts.push('Tarde ocupada');

    return parts.length > 0 ? parts.join(', ') : 'Data disponível';
  }

  /**
   * Retorna classe CSS para o indicador visual (traço de cor abaixo da data)
   */
  getIndicatorClass(day: number): string {
    const availability = this.getAvailability(day);

    if (!availability) {
      return '';
    }

    if (availability.fullDayBusy) {
      console.log(`[AvailabilityCalendar] Dia ${day}: Dia cheio (vermelho)`);
      return 'indicator-fullday';
    }

    if (availability.morningBusy && availability.afternoonBusy) {
      console.log(`[AvailabilityCalendar] Dia ${day}: Manhã + Tarde (vermelho)`);
      return 'indicator-fullday';
    }

    if (availability.morningBusy) {
      console.log(`[AvailabilityCalendar] Dia ${day}: Manhã (azul)`);
      return 'indicator-morning';
    }

    if (availability.afternoonBusy) {
      console.log(`[AvailabilityCalendar] Dia ${day}: Tarde (laranja)`);
      return 'indicator-afternoon';
    }

    return '';
  }

  private getAvailability(day: number): DayAvailability | undefined {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const availability = this.availabilityMap.get(dateKey);
    
    return availability;
  }
}
