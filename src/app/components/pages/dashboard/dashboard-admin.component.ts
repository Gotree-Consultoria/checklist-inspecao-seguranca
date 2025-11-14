import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaResponseDTO } from '../../../services/agenda.service';
import { DashboardService } from '../../../services/dashboard.service';
import { AgendaService } from '../../../services/agenda.service';

@Component({
  standalone: true,
  selector: 'app-dashboard-admin',
  imports: [CommonModule, FormsModule],
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
  loading = false;

  // internal helpers
  private dashboard = inject(DashboardService);
  private agenda = inject(AgendaService);

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
        this.recentAdminItems = items.map((i:any) => ({ title: i.title || i.type || 'Documento', date: (i.inspectionDate || i.createdAt || '').substring(0,10), id: String(i.id||i.reportId||''), type: i.documentType||i.type||'', user: i.authorName || i.userName || i.responsible || '', company: i.companyName || i.company || '' }));
      } catch (e) { this.recentAdminItems = []; }

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
      const usersMap: Record<string,string> = {};
      this.adminDocs.forEach((d:any) => {
        const id = String(d.userId || d.user || '');
        const name = d.userName || d.user || d.name || ('User ' + id);
        if (id) usersMap[id] = name;
      });
      this.adminDocsUsers = Object.keys(usersMap).map(k => ({ id: k, name: usersMap[k] }));
    } catch (e) { this.adminDocs = []; }
  }

  // Helper: Check if a document is signed and therefore immutable
  isDocumentSigned(item: any): boolean {
    return item && typeof item.signed === 'boolean' ? item.signed : false;
  }

  // Helper: Check if edit is allowed for a document
  canEditDocument(item: any): boolean {
    return !this.isDocumentSigned(item);
  }
}
