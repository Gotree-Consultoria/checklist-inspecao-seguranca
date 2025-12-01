import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgForOf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SafeUrlPipe } from '../../../pipes/safe-url.pipe';
import { DashboardAdminComponent } from './dashboard-admin.component';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';
import { DashboardService, MyDashboardStats, TopCompany } from '../../../services/dashboard.service';
import { AgendaService, AgendaResponseDTO } from '../../../services/agenda.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, NgIf, NgForOf, NgClass, SafeUrlPipe, FormsModule, DashboardAdminComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private legacy = inject(LegacyService);
  private ui = inject(UiService);

  // detect admin
  isAdmin = false;

  // admin data
  adminStats: any = null;
  adminDocs: any[] = [];
  adminDocsUsers: Array<{ id?: string | number; name: string }> = [];
  adminDocsFilterUser: string = 'all';
  adminDocsFilterType: string = 'all';
  adminAgenda: AgendaResponseDTO[] = [];
  recentAdminItems: Array<{ title: string, date: string, id?: string, type?: string, user?: string, company?: string }> = [];

  // dashboard data
  kpis: { totalVisits: number; totalAeps: number; totalRisks: number; totalVisitTime: string } = { totalVisits: 0, totalAeps: 0, totalRisks: 0, totalVisitTime: '0h 0m' };
  topCompanies: TopCompany[] = [];
  myAgenda: AgendaResponseDTO[] = [];
  loading = false;
  loadingLatest = false;
  latestInspection: any = null;
  recentItems: Array<{ title: string, date: string, id?: string, type?: string, company?: string }> = [];
  // PDF modal state
  pdfModalOpen = false;
  pdfBlobUrl: string | null = null;

  // card order for drag-drop (persisted per user via localStorage)
  cardOrder: string[] = ['kpis','actions','topCompanies','agenda','recent'];
  // edit mode helps mobile users reposition via tap-to-pick/place
  editLayoutMode = false;
  selectedCardIndex: number | null = null;
  // card size map: DISABLED - all cards now fixed size
  cardSizes: Record<string, number> = { actions: 1, kpis: 1, topCompanies: 1, agenda: 1, recent: 1 };
  // touch-longpress helpers
  private touchTimer: any = null;
  private touchStartY = 0;
  private touchStartX = 0;
  private touchMoving = false;

  // Navigate to a URL (template uses this to avoid referencing window directly)
  goTo(url: string) {
    window.location.href = url;
  }

  async ngOnInit(): Promise<void> {
    this.loadLayout();
    this.populateDashboardHistory();
    this.loadLatestInspection();
    try {
      const role = await this.legacy.ensureUserRole();
      this.isAdmin = String(role || '').toUpperCase().includes('ADMIN');
    } catch (_) {
      this.isAdmin = !!String(this.legacy.getUserRole() || '').toUpperCase().includes('ADMIN');
    }

    if (this.isAdmin) {
      this.loadAdminDashboard();
    } else {
      this.loadDashboardData();
    }
  }

  private dashboard = inject(DashboardService);
  private agenda = inject(AgendaService);

  async loadDashboardData(): Promise<void> {
    this.loading = true;
    try {
      const stats: MyDashboardStats = await this.dashboard.myStats();
      console.log('[Dashboard] Stats recebidas:', stats);
      const hours = stats.totalVisitTimeHours || 0;
      const minutes = stats.totalVisitTimeMinutes || 0;
      this.kpis = {
        totalVisits: stats.totalVisits || 0,
        totalAeps: stats.totalAeps || 0,
        totalRisks: stats.totalRisks || 0,
        totalVisitTime: `${hours}h ${minutes}m`
      };
      console.log('[Dashboard] KPIs processados:', this.kpis);
      this.topCompanies = Array.isArray(stats.topCompanies) ? stats.topCompanies.slice(0,5) : [];
      console.log('[Dashboard] Top companies:', this.topCompanies);
    } catch (e:any) {
      console.error('[Dashboard] Erro ao carregar dados:', e);
      this.ui.showToast('Não foi possível carregar indicadores do dashboard', 'error');
      this.kpis = { totalVisits: 0, totalAeps: 0, totalRisks: 0, totalVisitTime: '0h 0m' };
      this.topCompanies = [];
    }

    // load next 5 agenda events
    try {
      const events = await this.agenda.listEventos();
      const sorted = Array.isArray(events) ? events.slice().sort((a,b) => (a.date||'').localeCompare(b.date||'')) : [];
      this.myAgenda = sorted.filter(e => !!e.date).slice(0,5);
    } catch (e:any) {
      this.ui.showToast('Não foi possível carregar sua agenda', 'error');
      this.myAgenda = [];
    } finally {
      this.loading = false;
    }
  }

  // Helper: Check if a document is signed and therefore immutable
  isDocumentSigned(item: any): boolean {
    return item && typeof item.signed === 'boolean' ? item.signed : false;
  }

  // Helper: Check if edit is allowed for a document
  canEditDocument(item: any): boolean {
    return !this.isDocumentSigned(item);
  }

  // ------------------ Admin flows ------------------

  async loadAdminDashboard(): Promise<void> {
    this.loading = true;
    try {
      // admin KPIs
      try {
        this.adminStats = await this.dashboard.adminStats();
      } catch (e:any) {
        this.ui.showToast('Não foi possível carregar KPIs do administrador', 'error');
        this.adminStats = null;
      }

      // documents by user (default all)
      await this.loadAdminDocuments();

      // agenda (all users)
      try {
        const events = await this.agenda.listAllEventos();
        const sorted = Array.isArray(events) ? events.slice().sort((a,b) => (a.date||'').localeCompare(b.date||'')) : [];
        this.adminAgenda = sorted.filter(e => !!e.date).slice(0,10);
      } catch (e:any) {
        this.ui.showToast('Não foi possível carregar agenda da equipe', 'error');
        this.adminAgenda = [];
      }

      // recent documents admin
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
        console.log('[Dashboard] recentAdminItems:', this.recentAdminItems);
      } catch (e:any) {
        console.error('[Dashboard] Erro ao carregar atividade recente:', e);
        this.recentAdminItems = [];
      }

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
      this.adminDocs = Array.isArray(data) ? data : [];
      // derive user list for filter dropdown from returned data
      const usersMap: Record<string,string> = {};
      this.adminDocs.forEach((d:any) => {
        const id = String(d.userId || d.user || d.userId || '');
        const name = d.userName || d.user || d.name || ('User ' + id);
        if (id) usersMap[id] = name;
      });
      this.adminDocsUsers = Object.keys(usersMap).map(k => ({ id: k, name: usersMap[k] }));
    } catch (e:any) {
      this.ui.showToast('Não foi possível carregar documentos por usuário', 'error');
      this.adminDocs = [];
    }
  }

  // Drag-drop handlers and persistence (native HTML5 drag & drop)
  private layoutStorageKey(): string {
    try {
      const token = localStorage.getItem('jwtToken');
      const payload = this.legacy.decodeJwt(token || null) || {} as any;
      const uid = payload.sub || payload.id || payload.userId || '';
      return `dashboard.layout.${uid || 'anonymous'}`;
    } catch (_) {
      return 'dashboard.layout.anonymous';
    }
  }

  loadLayout() {
    try {
      const key = this.layoutStorageKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const known = ['actions','kpis','topCompanies','agenda','recent'];
        if (Array.isArray(parsed.order) && parsed.order.length) {
          this.cardOrder = parsed.order.filter((c: any) => known.includes(c)).concat(known.filter(k => !parsed.order.includes(k)));
        }
        if (parsed.sizes && typeof parsed.sizes === 'object') {
          for (const k of known) {
            const v = Number(parsed.sizes[k] || this.cardSizes[k] || 1);
            this.cardSizes[k] = Math.min(4, Math.max(1, isNaN(v) ? 1 : v));
          }
        }
      }
    } catch (_) {}
  }

  saveLayout() {
    try {
      const key = this.layoutStorageKey();
      localStorage.setItem(key, JSON.stringify({ order: this.cardOrder, sizes: this.cardSizes }));
    } catch (e) { console.warn('saveLayout failed', e); }
  }

  // Native drag handlers
  private draggedIndex: number | null = null;
  hoverIndex: number | null = null;

  onDragStart(evt: DragEvent, index: number) {
    this.draggedIndex = index;
    try { evt.dataTransfer?.setData('text/plain', String(index)); } catch (_) {}
  }

  onDragOver(evt: DragEvent) {
    evt.preventDefault();
  }

  onDragEnter(evt: DragEvent, index: number) {
    evt.preventDefault();
    this.hoverIndex = index;
  }

  onDragLeave(evt: DragEvent, index: number) {
    evt.preventDefault();
    if (this.hoverIndex === index) this.hoverIndex = null;
  }

  onDropNative(evt: DragEvent, targetIndex: number) {
    evt.preventDefault();
    const from = this.draggedIndex != null ? this.draggedIndex : Number(evt.dataTransfer?.getData('text/plain') || -1);
    const to = targetIndex;
    if (from < 0 || to < 0 || from === to) return;
    const item = this.cardOrder.splice(from, 1)[0];
    this.cardOrder.splice(to, 0, item);
    this.draggedIndex = null;
    this.saveLayout();
  }

  // Tap-to-pick/place handlers for mobile (enabled when editLayoutMode=true)
  toggleEditLayout() {
    this.editLayoutMode = !this.editLayoutMode;
    // clear any selection when turning off
    if (!this.editLayoutMode) this.selectedCardIndex = null;
  }

  pickOrPlace(index: number) {
    // pick or place selection (used by native tap-mode)
    if (this.selectedCardIndex == null) {
      this.selectedCardIndex = index;
      return;
    }
    const from = this.selectedCardIndex;
    const to = index;
    if (from !== to) {
      const item = this.cardOrder.splice(from, 1)[0];
      this.cardOrder.splice(to, 0, item);
      this.saveLayout();
    }
    this.selectedCardIndex = null;
  }

  // DISABLED: cycle size for a given card (all cards now fixed size)
  // cycleSize(cardId: string, evt?: Event) { }

  // DISABLED: return CSS grid span for a card (all cards now fixed at span 1)
  // getGridSpan(cardId: string): number { return 1; }

  clearSelection() {
    this.selectedCardIndex = null;
  }

  // Simplified handlers for touch (long-press to pick)
  onTouchStart(evt: TouchEvent, index: number) {
    this.touchMoving = false;
    const t = evt.touches && evt.touches[0];
    this.touchStartX = t ? t.clientX : 0;
    this.touchStartY = t ? t.clientY : 0;
    this.touchTimer = setTimeout(() => {
      // long-press detected -> pick card
      this.selectedCardIndex = index;
    }, 350);
  }

  onTouchMove(evt: TouchEvent) {
    this.touchMoving = true;
    if (this.touchTimer) { clearTimeout(this.touchTimer); this.touchTimer = null; }
  }

  onTouchEnd(evt: TouchEvent) {
    if (this.touchTimer) { clearTimeout(this.touchTimer); this.touchTimer = null; }
    if (this.touchMoving) { this.touchMoving = false; return; }
    // if a card is already selected, try to place to the tapped index handled by onCardClick
  }

  onCardClick(index: number, event?: Event) {
    // Desktop click: if a card is selected (from long-press), place it; otherwise do nothing
    if (this.selectedCardIndex != null && this.selectedCardIndex !== index) {
      this.pickOrPlace(index);
      event?.preventDefault();
      event?.stopPropagation();
    }
  }

  resetLayout() {
    this.cardOrder = ['actions','kpis','topCompanies','agenda','recent'];
    this.saveLayout();
  }

  populateDashboardHistory() {
    try {
      const list = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
      if (Array.isArray(list) && list.length) {
  const items = list.slice(-5).reverse().map((i: any) => ({ title: i.title || i.type || 'Documento', date: ((i.creationDate || i.inspectionDate || i.createdAt || '') + '').substring(0,10) || '', id: String(i.id||i.reportId||''), type: i.documentType||i.type||'', company: i.companyName||i.company||i.clientName||'' }));
  this.recentItems = items;
        return;
      }
    } catch (e) {
      // ignore local parsing errors
    }
    // fallback to backend
    (async () => {
      try {
        const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/latest`, { headers: this.legacy.authHeaders() });
        if (!resp.ok) { this.recentItems = []; return; }
        const data = await resp.json();
        const items = Array.isArray(data) ? data.slice(0,5) : (data ? [data] : []);
        this.recentItems = items.map((i:any) => {
          const id = i.id || i.reportId || i.documentId || i.report_id || '';
          const type = i.documentType || i.type || i.reportType || i.document_type || '';
          const company = i.companyName || i.company || i.clientName || '';
          const dateVal = (i.creationDate || i.inspectionDate || i.createdAt || i.date || '');
          return { title: i.title || i.type || 'Documento', date: String((dateVal + '').substring(0,10)), id: String(id||''), type: String(type||''), company: String(company||'') };
        });
      } catch (err:any) {
        this.recentItems = [];
      }
    })();
  }

  // Open PDF for a recent document directly (fetch blob and open in new tab)
  async openDocument(item: { id?: string, type?: string }) {
    try {
      const id = item.id || '';
      if (!id) { this.ui.showToast('Documento sem ID disponível.', 'error'); return; }
      const slug = this.documentTypeToSlug(item.type || '');
      const url = `${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(slug)}/${encodeURIComponent(id)}/pdf`;
      const resp = await fetch(url, { headers: this.legacy.authHeaders() });
      if (!resp || !resp.ok) throw new Error('Erro ao obter PDF');
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('pdf')) throw new Error('Servidor não retornou PDF');
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      // Abrir o PDF em modal na mesma página (iframe no componente)
      this.pdfBlobUrl = blobUrl;
      this.pdfModalOpen = true;
      // Revogar URL após algum tempo para liberar memória
      setTimeout(() => {
        try { window.URL.revokeObjectURL(blobUrl); } catch(_) {}
      }, 5000);
      return;
    } catch (err:any) { console.error('openDocument failed', err); this.ui.showToast(err?.message || 'Não foi possível abrir PDF do documento.', 'error'); }
  }

  // Map various document type strings to backend slugs (keeps parity with DocumentsComponent)
  documentTypeToSlug(type: any) {
    if (!type) return 'document';
    const raw = String(type || '');
    const normalized = raw.normalize ? raw.normalize('NFD').replace(/\p{Diacritic}/gu, '') : raw;
    const up = normalized.toUpperCase();
    if (up.includes('RISK') || up.includes('RISCO')) return 'risk';
    if (up.includes('CHECKLIST') || up.includes('INSPECAO') || up.includes('INSPEÇÃO')) return 'checklist';
    if (up.includes('RELATORIO') || up.includes('RELAT') || (up.includes('VISITA') && up.includes('RELAT'))) return 'visit';
    if (up.includes('VISITA') && !up.includes('CHECK')) return 'visit';
    if ((up.includes('AVALIACAO') && up.includes('ERGONOMICA')) || up.includes('AEP')) return 'aep-reports';
    // fallback: slugify to safe string
    const slug = String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return slug || 'document';
  }

  closePdfModal() {
    try {
      if (this.pdfBlobUrl) {
        window.URL.revokeObjectURL(this.pdfBlobUrl);
      }
    } catch (_) {}
    this.pdfBlobUrl = null;
    this.pdfModalOpen = false;
  }

  async loadLatestInspection() {
    this.loadingLatest = true;
    try {
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/latest`, { headers: this.legacy.authHeaders() });
      if (!resp.ok) { this.latestInspection = null; this.loadingLatest = false; return; }
      const data = await resp.json();
      const title = data.title || data.type || 'Relatório';
      const date = (data.inspectionDate || data.date || data.createdAt || '').substring(0,10);
      const company = data.companyName || data.company || data.clientName || '';
      this.latestInspection = { title, date, company };
    } catch (e:any) {
      this.ui.showToast('Erro ao carregar última inspeção.', 'error');
      this.latestInspection = null;
    } finally { this.loadingLatest = false; }
  }
}
