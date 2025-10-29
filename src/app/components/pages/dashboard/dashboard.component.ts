import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private legacy = inject(LegacyService);
  private ui = inject(UiService);

  recentItems: Array<{ title: string, date: string }> = [];
  latestInspection: any = null;
  loadingLatest = false;

  ngOnInit(): void {
    this.populateDashboardHistory();
    this.loadLatestInspection();
  }

  populateDashboardHistory() {
    try {
      const list = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
      if (Array.isArray(list) && list.length) {
        const items = list.slice(-5).reverse().map((i: any) => ({ title: i.title || i.type || 'Documento', date: (i.createdAt||'').substring(0,10) || '' }));
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
        this.recentItems = items.map((i:any) => ({ title: i.title || i.type || 'Documento', date: (i.inspectionDate || i.createdAt || '').substring(0,10) }));
      } catch (err:any) {
        this.recentItems = [];
      }
    })();
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
