import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../services/report.service';
import { UiService } from '../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-agenda',
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  // Mock events for visualization
  events: Array<any> = [];
  selectedDate = '';
  displayedYear = new Date().getFullYear();
  displayedMonth = new Date().getMonth() + 1; // 1-12
  daysInMonth: number[] = [];
  blankDays: number[] = []; // placeholders before day 1 to align weekdays
  get displayedMonthPadded() { return String(this.displayedMonth).padStart(2, '0'); }
  formatDay = (d: number) => String(d).padStart(2, '0');

  private report = inject(ReportService);
  private ui = inject(UiService);

  // form fields for creating event
  newTitle = '';
  newDescription = '';
  newEventDate = '';
  loading = false;
  showCreateModal = false;

  ngOnInit(): void {
    // inicializa selectedDate usando data local (evita offset de UTC)
    this.selectedDate = this.formatLocalDate(new Date());
    this.newEventDate = this.selectedDate;
    // carregar eventos do backend (se disponível); fallback para mock
    this.loadEvents();
    // preparar dias do mês baseado em displayedMonth
    // garantir que displayedMonth/displayedYear seguem a selectedDate
    try {
      const parts = this.selectedDate.split('-');
      if (parts.length === 3) {
        this.displayedYear = Number(parts[0]);
        this.displayedMonth = Number(parts[1]);
      }
    } catch(_) {}
    this.rebuildDaysInMonth();
  }

  // month picker state
  showMonthPicker = false;
  pickerYear = this.displayedYear;
  monthNamesShort = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  async loadEvents(): Promise<void> {
    this.loading = true;
    try {
      const data = await this.report.fetchAgendaEvents();
      if (Array.isArray(data)) {
        // Normalizar para o formato esperado pelo componente
        this.events = data.map((it: any, idx: number) => ({
          id: it.id || it._id || idx + 1,
          title: it.title || it.titulo || '',
          description: it.description || it.descricao || '',
          date: (it.eventDate || it.date || it.event_date || '').slice(0,10),
          time: it.time || it.eventTime || '',
          duration: it.duration || '',
          notes: it.description || it.notes || '',
          // preservar informações extras do backend para exibição/diagnóstico
          type: it.type || it.tipo || '',
          referenceId: it.referenceId || it.reference_id || it.refId || null,
          unitName: it.unitName || it.unidade || it.unit_name || null,
          sectorName: it.sectorName || it.sector_name || it.setor || null
        }));
      
      } else {
        // fallback: mock local
        const today = this.selectedDate;
        this.events = [
          { id: 1, professional: 'Dr. João Silva', title: 'Consulta - Avaliação', date: today, time: '09:00', duration: '30m', notes: 'Avaliação de ergonomia para Operador de Caixa' },
          { id: 2, professional: 'Dra. Maria Souza', title: 'Sessão de retorno', date: today, time: '10:30', duration: '45m', notes: 'Acompanhamento de caso' },
          { id: 3, professional: 'Dr. Pedro Alves', title: 'Emissão de AEP', date: today, time: '14:00', duration: '60m', notes: 'Finalização e assinatura' }
        ];
      }
    } catch (err) {
      console.warn('[Agenda] Falha ao carregar eventos da API, usando mock local', err);
      const today = this.selectedDate;
      this.events = [
        { id: 1, professional: 'Dr. João Silva', title: 'Consulta - Avaliação', date: today, time: '09:00', duration: '30m', notes: 'Avaliação de ergonomia para Operador de Caixa' },
        { id: 2, professional: 'Dra. Maria Souza', title: 'Sessão de retorno', date: today, time: '10:30', duration: '45m', notes: 'Acompanhamento de caso' },
        { id: 3, professional: 'Dr. Pedro Alves', title: 'Emissão de AEP', date: today, time: '14:00', duration: '60m', notes: 'Finalização e assinatura' }
      ];
    } finally {
      this.loading = false;
    }
  }

  // reconstrói vetor daysInMonth a partir de displayedMonth/displayedYear
  rebuildDaysInMonth(): void {
    const year = Number(this.displayedYear);
    const month = Number(this.displayedMonth); // 1-12
    // number of days in month
    const days = new Date(year, month, 0).getDate();
    this.daysInMonth = Array.from({ length: days }, (_, i) => i + 1);
    // calcular quantas células em branco (offset) antes do dia 1
    try {
      const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0=Sun
      this.blankDays = Array.from({ length: firstDayIndex }, (_, i) => i);
    } catch (_) {
      this.blankDays = [];
    }
  }

  prevMonth(): void {
    if (this.displayedMonth === 1) {
      this.displayedMonth = 12;
      this.displayedYear -= 1;
    } else {
      this.displayedMonth -= 1;
    }
    this.rebuildDaysInMonth();
  }

  nextMonth(): void {
    if (this.displayedMonth === 12) {
      this.displayedMonth = 1;
      this.displayedYear += 1;
    } else {
      this.displayedMonth += 1;
    }
    this.rebuildDaysInMonth();
  }

  goToToday(): void {
    const now = new Date();
    this.displayedYear = now.getFullYear();
    this.displayedMonth = now.getMonth() + 1;
    this.selectedDate = this.formatLocalDate(now);
    this.rebuildDaysInMonth();
  }

  toggleMonthPicker(): void {
    this.showMonthPicker = !this.showMonthPicker;
    if (this.showMonthPicker) this.pickerYear = this.displayedYear;
  }

  pickMonth(idxOneBased: number): void {
    this.displayedMonth = idxOneBased;
    this.displayedYear = this.pickerYear;
    this.rebuildDaysInMonth();
    // keep selectedDate in same month: set to first day to avoid out-of-range
    const day = Math.min( Number(this.selectedDate.split('-')[2] || '1'), this.daysInMonth.length );
    this.selectedDate = `${this.displayedYear}-${String(this.displayedMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    this.showMonthPicker = false;
  }

  incPickerYear(): void { this.pickerYear += 1; }
  decPickerYear(): void { this.pickerYear -= 1; }

  private formatLocalDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Retorna o nome do mês em pt-BR dado um número 1-12
  getDisplayedMonthName(): string {
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const m = Number(this.displayedMonth);
    if (!m || m < 1 || m > 12) return '';
    return `${months[m-1]} ${this.displayedYear}`;
  }

  // retorna true se existe pelo menos 1 evento na data (yyyy-mm-dd)
  hasEventsOnDay(day: number): boolean {
    const date = `${this.displayedYear}-${String(this.displayedMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return this.events.some(e => (e.date || '').slice(0,10) === date);
  }

  // eventos do mês exibidos abaixo do calendário
  get eventsOfMonth() {
    const ymPrefix = `${this.displayedYear}-${String(this.displayedMonth).padStart(2,'0')}`;
    return this.events.filter(e => (e.date || '').slice(0,7) === ymPrefix).sort((a,b) => (a.date + (a.time||'')) .localeCompare(b.date + (b.time||'')));
  }

  // labels curtos para os dias da semana
  weekdays: string[] = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  async createEvent(): Promise<void> {
    if (!this.newTitle || !this.newEventDate) {
      this.ui.showToast('Preencha título e data do evento.', 'warning');
      return;
    }
    const payload = {
      title: this.newTitle,
      description: this.newDescription || '',
      eventDate: this.newEventDate
    };
    try {
      this.loading = true;
      const created = await this.report.postAgendaEvent(payload);
      // Insere no array local após criar
      const ev = {
        id: created?.id || created?._id || (this.events.length + 1),
        title: created?.title || payload.title,
        description: created?.description || payload.description,
        date: (created?.eventDate || payload.eventDate).slice(0,10),
        time: created?.time || '',
        duration: created?.duration || '',
        notes: created?.description || payload.description
      };
      this.events = [...this.events, ev];
      this.ui.showToast('Evento criado com sucesso.', 'success');
      // limpar formulário
      this.newTitle = '';
      this.newDescription = '';
      this.newEventDate = this.selectedDate;
  // fechar modal se estiver aberto
  try { this.closeCreateModal(); } catch(_) {}
      // forçar recarregar do backend para garantir consistência
      await this.loadEvents();
    } catch (err: any) {
      console.error('[Agenda] Erro ao criar evento:', err);
      this.ui.showToast('Falha ao criar evento: ' + (err?.message || ''), 'error');
    } finally {
      this.loading = false;
    }
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    if (!this.newEventDate) this.newEventDate = this.selectedDate || this.formatLocalDate(new Date());
    setTimeout(() => {
      try { const el = document.getElementById('newTitle'); if (el) (el as HTMLElement).focus(); } catch (_) {}
    }, 120);
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  // filtra eventos do dia selecionado
  get eventsOfDay() {
    return this.events
      .filter(e => ((e.date || '').slice(0,10)) === this.selectedDate)
      .sort((a,b) => (a.time || '').localeCompare(b.time || ''));
  }

  changeDate(ev: any) {
    this.selectedDate = ev.target.value;
    // manter o mês/ano exibidos sincronizados com a data selecionada
    try {
      const parts = String(this.selectedDate).split('-');
      if (parts.length === 3) {
        this.displayedYear = Number(parts[0]);
        this.displayedMonth = Number(parts[1]);
        this.rebuildDaysInMonth();
      }
    } catch(_) {}
  }

  selectDay(day: number) {
    const y = String(this.displayedYear);
    const m = String(this.displayedMonth).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    this.selectedDate = `${y}-${m}-${d}`;
  }
}
