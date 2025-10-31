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

  // Mock metrics for the dashboard
  metrics = {
    totalInspections: 128,
    openNonConformities: 12,
    avgCompletionDays: 5
  };

  // Mock month data for bar chart
  monthData: Array<{ month: string, value: number }> = [
    { month: 'Jan', value: 42 },
    { month: 'Fev', value: 51 },
    { month: 'Mar', value: 63 },
    { month: 'Abr', value: 78 },
    { month: 'Mai', value: 55 },
    { month: 'Jun', value: 69 }
  ];

  statusLegend: Array<{ label: string, value: number, color: string }> = [
    { label: 'Conforme', value: 72, color: '#10B981' },
    { label: 'Não conforme', value: 18, color: '#F97316' },
    { label: 'Em análise', value: 10, color: '#06B6D4' }
  ];

  barPercent(v: number) {
    const max = Math.max(...this.monthData.map(m => m.value), 1);
    return Math.round((v / max) * 100);
  }

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
