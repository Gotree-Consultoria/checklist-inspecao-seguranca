export interface DocumentSummaryDTO {
  id: number;
  title: string;
  documentType: string; // 'Checklist de Riscos', 'Relatório de Visita', etc.
  clientName: string;
  creationDate: string;
  signed: boolean;
  companyId?: number;
  reportId?: string | number;
  type?: string;
  name?: string;

  // --- NOVOS CAMPOS ---
  emailSent: boolean;         // true = já enviado (Verde)
  clientEmail: string | null; // Se vier null, desabilita o botão (Cinza)
}
