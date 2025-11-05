import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { Router } from '@angular/router';
import { UiService } from '../../../services/ui.service';
import { ReportService } from '../../../services/report.service';
import { LegacyService } from '../../../services/legacy.service';

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
  private legacy = inject(LegacyService);
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
      const typeSlug = this.documentTypeToSlug(item.type || item.documentType || '');
      const id = item.id || item.reportId;
      if (!id) return;
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}/pdf`, { headers: this.legacy.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao baixar PDF');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `document-${id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      this.ui.showToast('Download iniciado.', 'success');
    } catch (e: any) {
      console.warn('downloadDoc failed', e);
      this.ui.showToast(e?.message || 'Não foi possível obter PDF do documento.', 'error');
    }
  }

  async viewDoc(item: any) {
    try {
      const typeSlug = this.documentTypeToSlug(item.type || item.documentType || '');
      const id = item.id || item.reportId;
      if (!id) return;
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}/pdf`, { headers: this.legacy.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao obter PDF');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(()=>window.URL.revokeObjectURL(url), 5000);
    } catch (e: any) {
      console.warn('viewDoc failed', e);
      this.ui.showToast(e?.message || 'Não foi possível carregar PDF para visualização.', 'error');
    }
  }

  documentTypeToSlug(type: string): string {
    if (!type) return 'document';
    const raw = String(type || '');
    const normalized = raw.normalize ? raw.normalize('NFD').replace(/\p{Diacritic}/gu, '') : raw;
    const up = normalized.toUpperCase();
    if (up.includes('CHECKLIST') || up.includes('INSPECAO') || up.includes('INSPEÇÃO') || up.includes('INSPECC')) return 'checklist';
    if (up.includes('RELATORIO') || up.includes('RELAT') || (up.includes('VISITA') && up.includes('RELAT'))) return 'visit';
    if (up.includes('VISITA') && !up.includes('CHECK')) return 'visit';
  // Reconhecer a frase 'Avaliação Ergonômica Preliminar' (com ou sem acentos)
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

  go(route: string) {
    try { this.router.navigate([route]); } catch (_) { window.location.href = '/' + route; }
  }
}
