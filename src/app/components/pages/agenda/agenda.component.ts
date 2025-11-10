import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { CalendarOptions, DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { AgendaService, AgendaResponseDTO } from '../../../services/agenda.service';
import { UiService } from '../../../services/ui.service';
import { AgendaModalComponent, AgendaModalMode } from '../../shared/agenda-modal/agenda-modal.component';

@Component({
  standalone: true,
  selector: 'app-agenda',
  imports: [CommonModule, FormsModule, AgendaModalComponent, FullCalendarModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  private agendaService = inject(AgendaService);
  private ui = inject(UiService);

  @ViewChild('agendaModal') agendaModal!: AgendaModalComponent;

  eventos: AgendaResponseDTO[] = [];
  loading = false;
  currentEditingItem: AgendaResponseDTO | null = null;
  viewMode: 'calendar' | 'list' = 'calendar';

  calendarOptions: CalendarOptions = {
    initialView: 'dayGridMonth',
    locale: ptBrLocale,
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    selectable: true,
    editable: true,
    eventClick: (info: EventClickArg) => this.handleEventClick(info),
    select: (info: DateSelectArg) => this.handleDateSelect(info),
    eventDrop: (info: EventDropArg) => this.handleEventDrop(info),
    eventDisplay: 'block',
    eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
    events: (info, successCallback, failureCallback) => {
      try {
        const calendarEvents = this.eventos.map(evt => this.mapEventoToCalendarEvent(evt));
        successCallback(calendarEvents);
      } catch (error) {
        failureCallback(error as Error);
      }
    }
  };

  async ngOnInit(): Promise<void> {
    await this.loadEventos();
  }

  async loadEventos(): Promise<void> {
    this.loading = true;
    try {
      this.eventos = await this.agendaService.listEventos();
      console.log('Eventos carregados:', this.eventos);
      // Refresh calendar após atualizar eventos
      if ((this.calendarOptions.events as any)?.refetchEvents) {
        (this.calendarOptions.events as any).refetchEvents();
      }
    } catch (e) {
      console.error('Erro ao carregar agenda', e);
      this.ui.showToast('Falha ao carregar agenda', 'error');
    } finally { 
      this.loading = false; 
    }
  }

  private mapEventoToCalendarEvent(evento: AgendaResponseDTO): any {
    return {
      id: String(evento.referenceId),
      title: evento.title,
      start: evento.date,
      backgroundColor: this.getColorByType(evento.type),
      borderColor: this.getColorByType(evento.type),
      extendedProps: {
        type: evento.type,
        description: evento.description,
        originalDate: evento.originalVisitDate,
        sourceVisitId: evento.sourceVisitId
      }
    };
  }

  private getColorByType(type: string): string {
    const colors: { [key: string]: string } = {
      'EVENTO': '#3b82f6',           // azul
      'VISITA': '#10b981',           // verde
      'VISITA_REAGENDADA': '#f59e0b' // amarelo/laranja
    };
    return colors[type] || '#6b7280';
  }

  private handleEventClick(info: EventClickArg): void {
    const evento = this.eventos.find(e => e.referenceId === parseInt(info.event.id));
    if (evento) {
      this.editEvent(evento);
    }
  }

  private handleDateSelect(info: DateSelectArg): void {
    const dateStr = info.startStr.split('T')[0];
    this.currentEditingItem = null;
    this.agendaModal?.open('create', { date: dateStr });
  }

  private handleEventDrop(info: EventDropArg): void {
    const evento = this.eventos.find(e => e.referenceId === parseInt(info.event.id));
    if (evento && (evento.type === 'VISITA' || evento.type === 'VISITA_REAGENDADA')) {
      const newDate = info.event.startStr.split('T')[0];
      this.currentEditingItem = evento;
      this.agendaModal?.open('reschedule', {
        date: newDate,
        reason: null
      });
    } else {
      // Para EVENTO, permitir atualizar a data
      if (evento && evento.type === 'EVENTO') {
        const newDate = info.event.startStr.split('T')[0];
        this.currentEditingItem = evento;
        this.agendaModal?.open('edit', {
          title: evento.title,
          description: evento.description,
          date: newDate
        });
      }
    }
  }

  async createNew(): Promise<void> {
    this.currentEditingItem = null;
    this.agendaModal?.open('create', { date: new Date().toISOString().split('T')[0] });
  }

  async onModalConfirm(data: any): Promise<void> {
    try {
      this.loading = true;
      if (data.mode === 'create') {
        await this.agendaService.createEvento({
          title: data.title,
          description: data.description || null,
          eventDate: data.date
        });
        this.ui.showToast('Evento criado com sucesso', 'success');
      } else if (data.mode === 'edit') {
        if (!this.currentEditingItem) return;
        await this.agendaService.updateEvento(this.currentEditingItem.referenceId, {
          title: data.title,
          description: data.description || null,
          eventDate: data.date
        });
        this.ui.showToast('Evento atualizado com sucesso', 'success');
      } else if (data.mode === 'reschedule') {
        if (!this.currentEditingItem) return;
        const visitId = this.currentEditingItem.sourceVisitId || this.currentEditingItem.referenceId;
        await this.agendaService.rescheduleVisit(visitId, {
          newDate: data.date,
          reason: data.reason || null
        });
        this.ui.showToast('Visita reagendada com sucesso', 'success');
      }
      console.log('Recarregando eventos após operação...');
      await this.loadEventos();
    } catch (e) {
      console.error('Erro na operação', e);
      this.ui.showToast('Falha na operação', 'error');
    } finally {
      this.loading = false;
    }
  }

  async deleteEvent(item: AgendaResponseDTO): Promise<void> {
    if (!confirm(`Deseja realmente deletar: "${item.title}" (${item.date})?`)) return;
    try {
      this.loading = true;
      await this.agendaService.deleteEvento(item.referenceId);
      this.ui.showToast('Evento deletado com sucesso', 'success');
      await this.loadEventos();
    } catch (e) {
      console.error('Erro ao deletar', e);
      this.ui.showToast('Falha ao deletar evento', 'error');
    } finally {
      this.loading = false;
    }
  }

  async editEvent(item: AgendaResponseDTO): Promise<void> {
    this.currentEditingItem = item;
    if (item.type === 'EVENTO') {
      this.agendaModal?.open('edit', {
        title: item.title,
        description: item.description,
        date: item.date
      });
      return;
    }
    if (item.type === 'VISITA' || item.type === 'VISITA_REAGENDADA') {
      this.agendaModal?.open('reschedule', {
        date: item.date,
        reason: null
      });
      return;
    }
  }

  switchView(mode: 'calendar' | 'list'): void {
    console.log(`Alternando view para: ${mode}, eventos disponíveis:`, this.eventos.length);
    this.viewMode = mode;
  }

  trackByEventoId(index: number, evento: AgendaResponseDTO): any {
    return evento.referenceId;
  }
}