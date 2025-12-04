import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgendaComponent } from './agenda.component';
import { AgendaService, AgendaResponseDTO } from '../../../services/agenda.service';
import { UiService } from '../../../services/ui.service';
import { AgendaModalComponent } from '../../shared/agenda-modal/agenda-modal.component';

describe('AgendaComponent', () => {
  let component: AgendaComponent;
  let fixture: ComponentFixture<AgendaComponent>;
  let agendaService: AgendaService;
  let uiService: UiService;

  const mockEventos: AgendaResponseDTO[] = [
    {
      title: 'Reunião Q4',
      date: '2025-11-15',
      type: 'EVENTO',
      referenceId: 1,
      description: 'Planejamento final',
      shift: 'MANHA'
    },
    {
      title: 'Próxima Visita: Empresa X',
      date: '2025-11-20',
      type: 'VISITA',
      referenceId: 2,
      unitName: 'Unidade A',
      sectorName: 'Setor Técnico',
      shift: 'MANHA'
    },
    {
      title: 'Próxima Visita: Empresa Y',
      date: '2025-12-05',
      type: 'VISITA_REAGENDADA',
      referenceId: 3,
      sourceVisitId: 999,
      originalVisitDate: '2025-11-25',
      shift: 'MANHA'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaComponent, AgendaModalComponent],
      providers: [AgendaService, UiService]
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaComponent);
    component = fixture.componentInstance;
    agendaService = TestBed.inject(AgendaService);
    uiService = TestBed.inject(UiService);
    // Provide a simple mock for the ViewChild agendaModal used in the component
    component.agendaModal = { open: (mode: any, data?: any) => {} } as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load eventos on init', async () => {
      spyOn(agendaService, 'listEventos').and.returnValue(
        Promise.resolve(mockEventos)
      );

      await component.ngOnInit();
      expect(component.eventos).toEqual(mockEventos);
      expect(component.loading).toBe(false);
    });

    it('should handle error when loading eventos', async () => {
      spyOn(agendaService, 'listEventos').and.returnValue(
        Promise.reject(new Error('Network error'))
      );
      spyOn(uiService, 'showToast');

      await component.ngOnInit();
      expect(uiService.showToast).toHaveBeenCalledWith(
        jasmine.stringContaining('Falha'),
        'error'
      );
      expect(component.eventos).toEqual([]);
    });
  });

  describe('createNew', () => {
    it('should open modal in create mode', () => {
      const openSpy = spyOn(
        component.agendaModal,
        'open'
      );

      component.createNew();
      expect(openSpy).toHaveBeenCalledWith('create', jasmine.any(Object));
    });
  });

  describe('editEvent', () => {
    it('should open modal in edit mode for EVENTO type', () => {
      const evento = mockEventos[0];
      const openSpy = spyOn(
        component.agendaModal,
        'open'
      );

      component.editEvent(evento);
      expect(openSpy).toHaveBeenCalledWith('edit', jasmine.any(Object));
    });

    it('should open modal in reschedule mode for VISITA type', () => {
      const visita = mockEventos[1];
      const openSpy = spyOn(
        component.agendaModal,
        'open'
      );

      component.editEvent(visita);
      expect(openSpy).toHaveBeenCalledWith('reschedule', jasmine.any(Object));
    });

    it('should open modal in reschedule mode for VISITA_REAGENDADA type', () => {
      const visitaReagendada = mockEventos[2];
      const openSpy = spyOn(
        component.agendaModal,
        'open'
      );

      component.editEvent(visitaReagendada);
      expect(openSpy).toHaveBeenCalledWith('reschedule', jasmine.any(Object));
    });
  });

  describe('deleteEvent', () => {
    it('should show confirmation and delete evento', async () => {
      const evento = mockEventos[0];
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(agendaService, 'deleteEvento').and.returnValue(Promise.resolve());
      spyOn(uiService, 'showToast');

      component.eventos = [evento];
      await component.deleteEvent(evento);

      expect(window.confirm).toHaveBeenCalledWith(
        jasmine.stringContaining('Deseja realmente deletar')
      );
      expect(agendaService.deleteEvento).toHaveBeenCalledWith(evento.referenceId);
      expect(uiService.showToast).toHaveBeenCalledWith(
        jasmine.stringContaining('deletado'),
        'success'
      );
    });

    it('should not delete if user cancels confirmation', async () => {
      const evento = mockEventos[0];
      spyOn(window, 'confirm').and.returnValue(false);
      spyOn(agendaService, 'deleteEvento');

      await component.deleteEvent(evento);
      expect(agendaService.deleteEvento).not.toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      const evento = mockEventos[0];
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(agendaService, 'deleteEvento').and.returnValue(
        Promise.reject(new Error('Delete failed'))
      );
      spyOn(uiService, 'showToast');

      await component.deleteEvent(evento);
      expect(uiService.showToast).toHaveBeenCalledWith(
        jasmine.stringContaining('Falha'),
        'error'
      );
    });
  });

  describe('onModalConfirm', () => {
    it('should create novo evento', async () => {
      const data = {
        mode: 'create' as const,
        title: 'Nova Reunião',
        description: 'Test',
        date: '2025-11-20'
      };
      const newEvento: AgendaResponseDTO = {
        ...data,
        type: 'EVENTO',
        referenceId: 999
      };

      spyOn(agendaService, 'createEvento').and.returnValue(
        Promise.resolve(newEvento)
      );
      spyOn(agendaService, 'listEventos').and.returnValue(
        Promise.resolve([newEvento])
      );
      spyOn(uiService, 'showToast');

      component.eventos = [];
      await component.onModalConfirm(data);

      expect(agendaService.createEvento).toHaveBeenCalledWith({
        title: data.title,
        description: data.description || null,
        eventDate: data.date,
        shift: 'MANHA',
        clientName: null
      });
      expect(uiService.showToast).toHaveBeenCalledWith(
        jasmine.stringContaining('criado'),
        'success'
      );
    });

    it('should edit existing evento', async () => {
      const evento = mockEventos[0];
      const data = {
        mode: 'edit' as const,
        title: 'Reunião Editada',
        description: 'Updated',
        date: '2025-11-16'
      };
      const updatedEvento: AgendaResponseDTO = {
        ...evento,
        ...data
      };

      spyOn(agendaService, 'updateEvento').and.returnValue(
        Promise.resolve(updatedEvento)
      );
      spyOn(agendaService, 'listEventos').and.returnValue(
        Promise.resolve([updatedEvento])
      );
      spyOn(uiService, 'showToast');

      component.eventos = [evento];
      component.currentEditingItem = evento;
      await component.onModalConfirm(data);

      expect(agendaService.updateEvento).toHaveBeenCalledWith(
        evento.referenceId,
        {
          title: data.title,
          description: data.description || null,
          eventDate: data.date,
          eventType: 'EVENTO',
          shift: 'MANHA',
          clientName: null
        }
      );
      expect(uiService.showToast).toHaveBeenCalledWith(
        jasmine.stringContaining('atualizado'),
        'success'
      );
    });

    it('should reschedule visita', async () => {
      const visita = mockEventos[1];
      const data = {
        mode: 'reschedule' as const,
        date: '2025-12-10',
        reason: 'Cliente solicitou'
      };
      const rescheduledVisita: AgendaResponseDTO = {
        ...visita,
        type: 'VISITA_REAGENDADA',
        date: data.date,
        originalVisitDate: visita.date,
        sourceVisitId: visita.referenceId
      };

      spyOn(agendaService, 'rescheduleVisit').and.returnValue(
        Promise.resolve(rescheduledVisita)
      );
      spyOn(agendaService, 'listEventos').and.returnValue(
        Promise.resolve([rescheduledVisita])
      );
      spyOn(uiService, 'showToast');

      component.eventos = [visita];
      component.currentEditingItem = visita;
      await component.onModalConfirm(data);

      expect(agendaService.rescheduleVisit).toHaveBeenCalledWith(
        visita.referenceId,
        {
          newDate: data.date,
          reason: data.reason || null
        }
      );
      expect(uiService.showToast).toHaveBeenCalledWith(
        jasmine.stringContaining('reagendada'),
        'success'
      );
    });

    it('should handle modal confirm error', async () => {
      const data = {
        mode: 'create' as const,
        title: 'Novo Evento',
        date: '2025-11-20'
      };

      spyOn(agendaService, 'createEvento').and.returnValue(
        Promise.reject(new Error('Creation failed'))
      );
      spyOn(agendaService, 'listEventos').and.returnValue(
        Promise.resolve([])
      );
      spyOn(uiService, 'showToast');

      await component.onModalConfirm(data);
      expect(uiService.showToast).toHaveBeenCalledWith(
        jasmine.stringContaining('Falha'),
        'error'
      );
    });
  });

  describe('loadEventos', () => {
    it('should set loading to true during fetch', async () => {
      // Return a promise that we can resolve later to ensure the loading
      // flag remains true while the fetch is pending.
      let resolver: any;
      const pending = new Promise<import('../../../services/agenda.service').AgendaResponseDTO[]>(res => { resolver = res; });
      spyOn(agendaService, 'listEventos').and.returnValue(pending as any);

      component.loading = false;
      const loadPromise = component.loadEventos();
      
      // Wait one tick to ensure the setTimeout has been scheduled
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Now resolve the pending promise and wait for the component to settle
      resolver(mockEventos);
      await loadPromise;
      expect(component.loading).toBe(false);
    });
  });
});
