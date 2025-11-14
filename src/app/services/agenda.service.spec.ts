import { TestBed } from '@angular/core/testing';
import { AgendaService, AgendaResponseDTO } from './agenda.service';
import { LegacyService } from './legacy.service';

describe('AgendaService', () => {
  let service: AgendaService;
  let legacyService: LegacyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AgendaService, LegacyService]
    });
    service = TestBed.inject(AgendaService);
    legacyService = TestBed.inject(LegacyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listEventos', () => {
    it('should fetch list of eventos', async () => {
      const mockData: AgendaResponseDTO[] = [
        {
          title: 'Evento 1',
          date: '2025-11-15',
          type: 'EVENTO',
          referenceId: 1
        }
      ];

  spyOn(globalThis, 'fetch' as any).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData)
        } as any as Response)
      );

      const result = await service.listEventos();
      expect(result).toEqual(mockData);
  expect((globalThis as any).fetch).toHaveBeenCalledWith(
        jasmine.stringContaining('/api/agenda/eventos'),
        jasmine.any(Object)
      );
    });

    it('should throw error on fetch failure', async () => {
  spyOn(globalThis, 'fetch' as any).and.returnValue(
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized'
        } as any as Response)
      );

      try {
        await service.listEventos();
        fail('should have thrown');
      } catch (e) {
        expect((e as Error).message).toBeTruthy();
      }
    });
  });

  describe('createEvento', () => {
    it('should create evento with valid payload', async () => {
      const payload = {
        title: 'Nova Reunião',
        description: 'Descrição teste',
        eventDate: '2025-11-20'
      };
      const mockResponse: AgendaResponseDTO = {
        title: payload.title,
        date: payload.eventDate,
        type: 'EVENTO',
        referenceId: 1
      };

  spyOn(globalThis, 'fetch' as any).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as any as Response)
      );

      const result = await service.createEvento(payload);
      expect(result).toEqual(mockResponse);
  expect((globalThis as any).fetch).toHaveBeenCalledWith(
        jasmine.stringContaining('/api/agenda/eventos'),
        jasmine.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('updateEvento', () => {
    it('should update evento with valid payload', async () => {
      const id = 123;
      const payload = {
        title: 'Reunião Atualizada',
        eventDate: '2025-11-21'
      };
      const mockResponse: AgendaResponseDTO = {
        title: payload.title,
        date: payload.eventDate,
        type: 'EVENTO',
        referenceId: id
      };

  spyOn(globalThis, 'fetch' as any).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as any as Response)
      );

      const result = await service.updateEvento(id, payload);
      expect(result).toEqual(mockResponse);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        jasmine.stringContaining(`/api/agenda/eventos/${id}`),
        jasmine.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('rescheduleVisit', () => {
    it('should reschedule visit with valid payload', async () => {
      const visitId = 456;
      const payload = {
        newDate: '2025-12-05',
        reason: 'Cliente solicitou'
      };
      const mockResponse: AgendaResponseDTO = {
        title: 'Próxima Visita: Empresa X',
        date: payload.newDate,
        type: 'VISITA_REAGENDADA',
        referenceId: 1,
        sourceVisitId: visitId,
        originalVisitDate: '2025-11-15'
      };

  spyOn(globalThis, 'fetch' as any).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as any as Response)
      );

      const result = await service.rescheduleVisit(visitId, payload);
      expect(result.type).toBe('VISITA_REAGENDADA');
      expect(result.date).toBe(payload.newDate);
  expect((globalThis as any).fetch).toHaveBeenCalledWith(
        jasmine.stringContaining(`/api/agenda/visitas/${visitId}/reagendar`),
        jasmine.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('deleteEvento', () => {
    it('should delete evento successfully', async () => {
      const id = 123;

  spyOn(globalThis, 'fetch' as any).and.returnValue(
        Promise.resolve({
          status: 204,
          ok: true
        } as any as Response)
      );

      await service.deleteEvento(id);
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        jasmine.stringContaining(`/api/agenda/eventos/${id}`),
        jasmine.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('listAllEventos', () => {
    it('should fetch all eventos (admin)', async () => {
      const mockData: AgendaResponseDTO[] = [
        {
          title: 'Evento Admin 1',
          date: '2025-11-15',
          type: 'EVENTO',
          referenceId: 1
        }
      ];

  spyOn(globalThis, 'fetch' as any).and.returnValue(
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData)
        } as any as Response)
      );

      const result = await service.listAllEventos();
      expect(result).toEqual(mockData);
  expect((globalThis as any).fetch).toHaveBeenCalledWith(
        jasmine.stringContaining('/api/agenda/eventos/all'),
        jasmine.any(Object)
      );
    });
  });
});
