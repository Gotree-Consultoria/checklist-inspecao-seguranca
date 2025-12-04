import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaResponseDTO } from '../../../services/agenda.service';
import { DashboardService } from '../../../services/dashboard.service';
import { AgendaService } from '../../../services/agenda.service';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';

@Component({
  standalone: true,
  selector: 'app-dashboard-admin',
  imports: [CommonModule, FormsModule, SafeUrlPipe],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent {
  // Local admin state (component is autonomous)
  adminStats: any = null;
  adminDocs: any[] = [];
  adminDocsUsers: Array<{ id?: string | number; name: string }> = [];
  adminDocsFilterUser: string = 'all';
  adminDocsFilterType: string = 'all';
  adminAgenda: AgendaResponseDTO[] = [];
  recentAdminItems: Array<any> = [];
  allDocuments: Array<any> = [];
  allDocsPageInfo: any = null;
  allDocsCurrentPage: number = 0;
  allDocsPageSize: number = 5; // 5 documentos por página
  allDocsFilterType: string = '';
  allDocsFilterClientName: string = '';
  allDocsFilterStartDate: string = '';
  allDocsFilterEndDate: string = '';
  loading = false;

  // Modal para visualizar PDFs
  pdfModalOpen = false;
  pdfBlobUrl: string | null = null;
  pdfModalItem: any = null;

  // internal helpers
  private dashboard = inject(DashboardService);
  private agenda = inject(AgendaService);
  private legacy = inject(LegacyService);
  private ui = inject(UiService);

  // navigation helper (same as parent used previously)
  goTo(url: string) { window.location.href = url; }

  async ngOnInit(): Promise<void> {
    this.loadAdminDashboard();
  }

  async loadAdminDashboard(): Promise<void> {
    this.loading = true;
    try {
      // KPIs
      try {
        this.adminStats = await this.dashboard.adminStats();
      } catch (e) { this.adminStats = null; }

      // documents
      await this.loadAdminDocuments();

      // agenda (all)
      try {
        const events = await this.agenda.listAllEventos();
        const sorted = Array.isArray(events) ? events.slice().sort((a,b) => (a.date||'').localeCompare(b.date||'')) : [];
        this.adminAgenda = sorted.filter(e => !!e.date).slice(0,10);
      } catch (e) { this.adminAgenda = []; }

      // recent
      try {
        const latest = await this.dashboard.latestAll();
        const items = Array.isArray(latest) ? latest.slice(0,5) : (latest ? [latest] : []);
        this.recentAdminItems = items.map((i:any) => ({ 
          title: i.title || i.type || 'Documento', 
          date: (i.creationDate || i.inspectionDate || i.createdAt || '').substring(0,10), 
          id: String(i.id||i.reportId||''), 
          type: i.documentType||i.type||'', 
          user: i.technicianName || i.authorName || i.userName || i.responsible || '', 
          company: i.clientName || i.companyName || i.company || '' 
        }));
        console.log('[Dashboard Admin] recentAdminItems:', this.recentAdminItems);
      } catch (e) { 
        console.error('[Dashboard Admin] Erro ao carregar atividade recente:', e);
        this.recentAdminItems = []; 
      }

      // all documents (first page)
      await this.loadAllDocuments(0);

    } finally {
      this.loading = false;
    }
  }

  async loadAdminDocuments(): Promise<void> {
    try {
      const filters: any = {};
      if (this.adminDocsFilterUser && this.adminDocsFilterUser !== 'all') filters.userId = this.adminDocsFilterUser;
      if (this.adminDocsFilterType && this.adminDocsFilterType !== 'all') filters.type = this.adminDocsFilterType;
      const data = await this.dashboard.adminDocuments(Object.keys(filters).length ? filters : undefined);
      console.log('[Dashboard Admin] Dados recebidos:', data);
      this.adminDocs = Array.isArray(data) ? data : [];
      console.log('[Dashboard Admin] adminDocs após atribuição:', this.adminDocs);
      const usersMap: Record<string,string> = {};
      this.adminDocs.forEach((d:any) => {
        const id = String(d.userId || d.user || '');
        const name = d.userName || d.user || d.name || ('User ' + id);
        if (id) usersMap[id] = name;
      });
      this.adminDocsUsers = Object.keys(usersMap).map(k => ({ id: k, name: usersMap[k] }));
    } catch (e) { 
      console.error('[Dashboard Admin] Erro ao carregar documentos:', e);
      this.adminDocs = []; 
    }
  }

  async loadAllDocuments(page: number = 0): Promise<void> {
    try {
      this.allDocsCurrentPage = page;
      const response = await this.dashboard.adminAllDocuments(
        page,
        this.allDocsPageSize,
        this.allDocsFilterType || undefined,
        this.allDocsFilterClientName || undefined,
        this.allDocsFilterStartDate || undefined,
        this.allDocsFilterEndDate || undefined
      );
      this.allDocuments = Array.isArray(response.content) ? response.content : [];
      this.allDocsPageInfo = response.page;
      console.log('[Dashboard Admin] allDocuments:', this.allDocuments);
      console.log('[Dashboard Admin] page info:', this.allDocsPageInfo);
    } catch (e) {
      console.error('[Dashboard Admin] Erro ao carregar todos os documentos:', e);
      this.allDocuments = [];
      this.allDocsPageInfo = null;
    }
  }

  loadNextDocsPage(): void {
    if (this.allDocsPageInfo && this.allDocsCurrentPage < this.allDocsPageInfo.totalPages - 1) {
      this.loadAllDocuments(this.allDocsCurrentPage + 1);
    }
  }

  loadPreviousDocsPage(): void {
    if (this.allDocsCurrentPage > 0) {
      this.loadAllDocuments(this.allDocsCurrentPage - 1);
    }
  }

  onAllDocsFilterChange(): void {
    // Reseta para primeira página ao alterar filtros
    this.loadAllDocuments(0);
  }

  // Helper: Check if a document is signed and therefore immutable
  isDocumentSigned(item: any): boolean {
    return item && typeof item.signed === 'boolean' ? item.signed : false;
  }

  // Helper: Check if edit is allowed for a document
  canEditDocument(item: any): boolean {
    return !this.isDocumentSigned(item);
  }

  // View document in modal
  async viewDocument(doc: any): Promise<void> {
    try {
      const typeSlug = this.documentTypeToSlug(doc.documentType || doc.type || '');
      const id = doc.id;
      if (!id) return;
      
      // Usar endpoint /documents/{typeSlug}/{id}/pdf
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}/pdf`, {
        headers: this.legacy.authHeaders()
      });
      
      if (!resp.ok) throw new Error('Falha ao obter PDF');
      
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Abrir o PDF em modal na mesma página (iframe no componente)
      this.pdfBlobUrl = blobUrl;
      this.pdfModalItem = doc;
      this.pdfModalOpen = true;
      
      // Revogar URL após algum tempo para liberar memória
      setTimeout(() => {
        try { window.URL.revokeObjectURL(blobUrl); } catch(_) {}
      }, 5000);
    } catch (e: any) {
      console.warn('viewDocument failed', e);
      this.ui.showToast(e?.message || 'Não foi possível carregar PDF para visualização.', 'error');
    }
  }

  // Download document
  async downloadDocument(doc: any): Promise<void> {
    try {
      const typeSlug = this.documentTypeToSlug(doc.documentType || doc.type || '');
      const id = doc.id;
      if (!id) return;
      
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}/pdf`, {
        headers: this.legacy.authHeaders()
      });
      
      if (!resp.ok) throw new Error('Falha ao baixar PDF');
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Construir nome do arquivo: Tipo - Nome - Empresa - Data
      const docType = doc.documentType || doc.type || 'Documento';
      const docTitle = doc.title || 'documento';
      const clientName = doc.clientName || 'empresa';
      const dateStr = (doc.creationDate || '').substring(0, 10); // YYYY-MM-DD
      const fileName = `${docType} - ${docTitle} - ${clientName} - ${dateStr}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      this.ui.showToast('Download iniciado.', 'success');
    } catch (e: any) {
      console.warn('downloadDocument failed', e);
      this.ui.showToast(e?.message || 'Não foi possível obter PDF do documento.', 'error');
    }
  }

  // Fechar modal de PDF
  closePdfModal(): void {
    try {
      if (this.pdfBlobUrl) {
        window.URL.revokeObjectURL(this.pdfBlobUrl);
      }
    } catch (_) {}
    this.pdfBlobUrl = null;
    this.pdfModalItem = null;
    this.pdfModalOpen = false;
  }

  // Abrir PDF em nova aba
  openPdfInNewTab(): void {
    try {
      if (!this.pdfBlobUrl) return;
      window.open(this.pdfBlobUrl, '_blank');
    } catch (e) {
      console.warn('openPdfInNewTab failed', e);
    }
  }

  // Format date to DD/MM/YYYY format
  formatDateToBrazil(dateStr: any): string {
    if (!dateStr) return '';
    try {
      const s = String(dateStr).trim();
      const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        return `${d}/${m}/${y}`;
      }
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = dt.getFullYear();
        return `${dd}/${mm}/${yy}`;
      }
      return s;
    } catch (_) {
      return String(dateStr);
    }
  }

  // Convert document type to slug for API endpoint
  documentTypeToSlug(type: string): string {
    if (!type) return 'document';
    const raw = String(type || '');
    const normalized = raw.normalize ? raw.normalize('NFD').replace(/\p{Diacritic}/gu, '') : raw;
    const up = normalized.toUpperCase();
    if (up.includes('RISK') || up.includes('RISCO')) return 'risk';
    if (up.includes('CHECKLIST') || up.includes('INSPECAO') || up.includes('INSPEÇÃO') || up.includes('INSPECC')) return 'checklist';
    if (up.includes('RELATORIO') || up.includes('RELAT') || (up.includes('VISITA') && up.includes('RELAT'))) return 'visit';
    if (up.includes('VISITA') && !up.includes('CHECK')) return 'visit';
    if (up.includes('AVALIACAO') && up.includes('ERGONOMICA')) return 'aep';
    if (up.includes('AEP')) return 'aep';
    switch (up) {
      case 'CHECKLIST_INSPECAO': return 'checklist';
      case 'RELATORIO_VISITA': return 'visit';
      case 'AEP': return 'aep';
    }
    const slug = String(type).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return slug || 'document';
  }
}
