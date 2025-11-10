import { Injectable, inject } from '@angular/core';
import { LegacyService } from './legacy.service';

export interface AgendaResponseDTO {
  title: string;
  date: string;
  type: 'EVENTO' | 'VISITA' | 'VISITA_REAGENDADA';
  referenceId: number;
  description?: string | null;
  unitName?: string | null;
  sectorName?: string | null;
  originalVisitDate?: string | null;
  sourceVisitId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private legacy = inject(LegacyService);

  private baseUrl(): string {
    return `${this.legacy.apiBaseUrl}/api/agenda`;
  }

  private headersJson(): Record<string,string> {
    return { 'Content-Type': 'application/json', ...this.legacy.authHeaders() } as Record<string,string>;
  }

  async listEventos(): Promise<AgendaResponseDTO[]> {
    const url = `${this.baseUrl()}/eventos`;
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) throw new Error('Falha ao listar eventos');
    return resp.json();
  }

  async createEvento(payload: { title: string; description?: string | null; eventDate: string; }): Promise<AgendaResponseDTO> {
    const url = `${this.baseUrl()}/eventos`;
    const resp = await fetch(url, { method: 'POST', headers: this.headersJson(), body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error('Falha ao criar evento');
    return resp.json();
  }

  async updateEvento(id: number | string, payload: { title: string; description?: string | null; eventDate: string; }): Promise<AgendaResponseDTO> {
    const url = `${this.baseUrl()}/eventos/${id}`;
    const resp = await fetch(url, { method: 'PUT', headers: this.headersJson(), body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error('Falha ao atualizar evento');
    return resp.json();
  }

  async rescheduleVisit(visitId: number | string, payload: { newDate: string; reason?: string | null; }): Promise<AgendaResponseDTO> {
    const url = `${this.baseUrl()}/visitas/${visitId}/reagendar`;
    const resp = await fetch(url, { method: 'PUT', headers: this.headersJson(), body: JSON.stringify(payload) });
    if (!resp.ok) throw new Error('Falha ao reagendar visita');
    return resp.json();
  }

  async deleteEvento(id: number | string): Promise<void> {
    const url = `${this.baseUrl()}/eventos/${id}`;
    const resp = await fetch(url, { method: 'DELETE', headers: this.legacy.authHeaders() });
    if (resp.status !== 204 && !resp.ok) throw new Error('Falha ao deletar evento');
  }

  async listAllEventos(): Promise<AgendaResponseDTO[]> {
    const url = `${this.baseUrl()}/eventos/all`;
    const resp = await fetch(url, { headers: this.legacy.authHeaders() });
    if (!resp.ok) throw new Error('Falha ao listar todos os eventos');
    return resp.json();
  }
}
