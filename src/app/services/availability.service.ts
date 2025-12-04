import { Injectable, inject } from '@angular/core';
import { LegacyService } from './legacy.service';

/**
 * Interface que representa a disponibilidade de um dia específico
 */
export interface DayAvailability {
  date: string;              // Formato: YYYY-MM-DD
  morningBusy: boolean;      // Manhã ocupada?
  afternoonBusy: boolean;    // Tarde ocupada?
  fullDayBusy: boolean;      // Dia inteiro ocupado?
}

/**
 * Resposta do backend com disponibilidades do mês
 */
export interface AvailabilityResponse {
  year: number;
  month: number;
  days: DayAvailability[];
}

/**
 * Serviço para gerenciar disponibilidade de agenda
 */
@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private legacy = inject(LegacyService);

  private baseUrl(): string {
    return `${this.legacy.apiBaseUrl}/api/agenda`;
  }

  /**
   * Obtém disponibilidade de um mês específico
   * 
   * @param year Ano (ex: 2025)
   * @param month Mês (1-12)
   * @returns Promise com disponibilidades do mês
   */
  async getMonthAvailability(year: number, month: number): Promise<AvailabilityResponse> {
    try {
      const url = `${this.baseUrl()}/availability?year=${year}&month=${month}`;
      
      const resp = await fetch(url, { 
        method: 'GET',
        headers: this.legacy.authHeaders() 
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Falha ao carregar disponibilidade: ${errorText}`);
      }

      const data = await resp.json();
      
      // O backend pode retornar dois formatos:
      // 1. Array direto: [{ date, morningBusy, ... }]
      // 2. Objeto com estrutura: { year, month, days: [...] }
      
      if (Array.isArray(data)) {
        // Formato 1: Converter array para AvailabilityResponse
        return {
          year,
          month,
          days: data as DayAvailability[]
        };
      } else if (data && typeof data === 'object' && 'days' in data) {
        // Formato 2: Já está no formato esperado
        return data as AvailabilityResponse;
      } else {
        throw new Error('Formato de resposta inválido');
      }

    } catch (e) {
      console.error('[Availability] Erro ao carregar disponibilidade:', e);
      throw e;
    }
  }
}
