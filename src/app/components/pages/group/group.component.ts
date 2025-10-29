import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { Router } from '@angular/router';
import { UiService } from '../../../services/ui.service';
import { ReportService } from '../../../services/report.service';

@Component({
  standalone: true,
  selector: 'app-group',
  imports: [CommonModule, NgIf, NgForOf],
  templateUrl: './group.component.html',
  styleUrls: ['./group.component.css']
})
export class GroupComponent implements OnInit {
  history: any[] = [];
  loading = true;

  private ui = inject(UiService);
  private report = inject(ReportService);
  constructor(private el: ElementRef, private router: Router) {}

  ngOnInit(): void {
    // Não injetamos estilos legacy automaticamente — a UI foi migrada.
    // Carregar histórico com pequeno delay para garantir que o token foi salvo
    setTimeout(() => {
      try { this.loadHistory(); } catch (e) { console.warn('loadHistory init failed', e); }
    }, 100);
  }

  async loadHistory(limit = 10) {
    this.loading = true;
    this.history = [];
    try {
      const data = await this.report.fetchLatestDocuments();
      const items = Array.isArray(data) ? data : (data ? [data] : []);
      this.history = items.slice(0, limit);
      console.log('[GroupComponent] Histórico carregado:', this.history.length, 'itens');
    } catch (e: any) {
      console.warn('loadHistory error', e);
      // Se houver erro, tentar log do status se disponível
      if (e.status !== undefined) {
        console.warn(`Status: ${e.status}, StatusText: ${e.statusText}, URL: ${e.url}`);
      }
      this.history = [];
    } finally {
      this.loading = false;
    }
  }

  formatDocumentType(type: any) {
    if (!type) return 'Documento';
    const t = String(type).toUpperCase();
    if (t.includes('CHECKLIST') || t.includes('INSPECAO') || t.includes('INSPEÇÃO')) return 'Check-List de Inspeção de Segurança';
    if (t.includes('RELATORIO') || t.includes('VISITA')) return 'Relatório de Visita Técnica';
    if (t.includes('AEP')) return 'Avaliação Ergônomica Preliminar (AEP)';
    return String(type);
  }

  formatDateToBrazil(dateStr: any) {
    if (!dateStr) return '';
    try {
      const s = String(dateStr).trim();
      const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) { const [, y, m, d] = match; return `${d}/${m}/${y}`; }
      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        const dd = String(dt.getDate()).padStart(2,'0');
        const mm = String(dt.getMonth()+1).padStart(2,'0');
        const yy = dt.getFullYear();
        return `${dd}/${mm}/${yy}`;
      }
      return s;
    } catch (_) { return String(dateStr); }
  }

  async downloadDoc(item: any) {
    try {
      const id = item.id || item.reportId;
      if (!id) return;
      const token = localStorage.getItem('jwtToken');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(`/documents/${encodeURIComponent(id)}/pdf`, { headers });
      if (!resp.ok) throw new Error('Falha ao baixar PDF');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `document-${id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('downloadDoc failed', e);
    }
  }

  async viewDoc(item: any) {
    try {
      const id = item.id || item.reportId;
      if (!id) return;
      const token = localStorage.getItem('jwtToken');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const resp = await fetch(`/documents/${encodeURIComponent(id)}/pdf`, { headers });
      if (!resp.ok) throw new Error('Falha ao obter PDF');
      const blob = await resp.blob();
      // open in new window as object URL
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // not revoking immediately to allow viewing; will be cleaned on page unload
    } catch (e) {
      console.warn('viewDoc failed', e);
    }
  }

  go(route: string) {
    try { this.router.navigate([route]); } catch (_) { window.location.href = '/' + route; }
  }
}
