import { Component, ElementRef, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-documents',
  imports: [CommonModule, FormsModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit {
  private legacy = inject(LegacyService);
  private ui = inject(UiService);

  filters = { q: '', type: 'all', date: '' };
  documents: any[] = [];
  openActionsIndex: number | null = null;
  popupPosition: { top: string; left: string } = { top: '0px', left: '0px' };
  
  // Paginação
  itemsPerPage = 10;
  allDocuments: any[] = []; // todos os documentos carregados
  
  private outsideClickHandler = (ev: Event) => {
    // fecha popup quando clicar fora
    this.openActionsIndex = null;
  };

  constructor(private el: ElementRef, private router: Router) {}

  ngOnInit(): void {
    this.loadDocumentsList();
    // fecha actions ao clicar fora
    document.addEventListener('click', this.outsideClickHandler);
  }

  ngOnDestroy(): void {
    try { document.removeEventListener('click', this.outsideClickHandler); } catch(_) {}
  }

  toggleActions(index: number, ev: Event) {
    ev.stopPropagation();
    if (this.openActionsIndex === index) {
      this.openActionsIndex = null;
    } else {
      this.openActionsIndex = index;
      // Calcular posição do popup após renderizar
      requestAnimationFrame(() => this.positionPopup(index, ev as MouseEvent));
    }
  }

  private positionPopup(index: number, ev: MouseEvent) {
    try {
      const button = ev.target as HTMLElement;
      const rect = button.getBoundingClientRect();
      
      // Popup aparece logo abaixo e à direita do botão
      let top = rect.bottom + 6;
      let left = rect.right + 4;
      
      // Ajustar se popup sair da tela (lado direito)
      const popupWidth = 160;
      const viewportWidth = window.innerWidth;
      if (left + popupWidth > viewportWidth - 16) {
        left = rect.left - popupWidth - 4;
      }
      
      // Ajustar se popup sair da tela (parte inferior)
      const popupHeight = 140;
      const viewportHeight = window.innerHeight;
      if (top + popupHeight > viewportHeight - 16) {
        top = rect.top - popupHeight - 6;
      }
      
      this.popupPosition = {
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`
      };
      
      console.log('[Documents] Popup positioned at', { 
        buttonRect: { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right },
        popupPosition: { top, left },
        viewport: { width: viewportWidth, height: viewportHeight }
      });
    } catch (e) {
      console.warn('Erro ao posicionar popup', e);
    }
  }

  formatDocumentType(type: any) {
    if (!type) return 'Documento';
    const t = String(type).toUpperCase();
    if (t.includes('CHECKLIST') || t.includes('INSPECAO') || t.includes('INSPEÇÃO')) return 'Check-List';
    if (t.includes('RELATORIO') || t.includes('VISITA')) return 'Relatório';
    if (t.includes('AEP')) return 'AEP';
    return String(type);
  }

  formatDate(d: any) {
    if (!d) return '';
    try {
      const s = String(d).substring(0,10);
      if (!s) return '';
      const parts = s.split('-'); if (parts.length>=3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return s;
    } catch(_) { return String(d); }
  }

  async loadDocumentsList() {
    this.allDocuments = [];
    this.documents = [];
    // show loading row
    try {
      const params = new URLSearchParams();
      const q = (this.filters.q || '').trim();
      if (q) params.set('title', q);
      if (this.filters.type && this.filters.type !== 'all') params.set('type', this.filters.type);
      if (this.filters.date) params.set('date', this.filters.date);
      const url = `${this.legacy.apiBaseUrl}/documents${params.toString()?('?'+params.toString()):''}`;
      const resp = await fetch(url, { headers: this.legacy.authHeaders() });
      if (resp.ok) {
        const list = await resp.json();
        this.allDocuments = Array.isArray(list) ? list : (list ? [list] : []);
        this.updateDisplayedDocuments();
        // sync local storage (keep drafts)
        try {
          const serverIds = new Set(this.allDocuments.map(it => String(it.id || it.reportId || '')).filter(Boolean));
          const localAll = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
          const newLocal = localAll.filter((x:any) => { const xid = String(x.id || x.reportId || ''); return !xid || serverIds.has(xid); });
          if (JSON.stringify(newLocal) !== JSON.stringify(localAll)) localStorage.setItem('savedInspectionReports', JSON.stringify(newLocal));
        } catch(_){ }
        return;
      }
    } catch (e:any) {
      console.warn('fetch documents failed', e && e.message);
    }
    // fallback: show drafts from localStorage
    try {
      const local = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
      const drafts = local.filter((it:any) => !(it.id || it.reportId));
      const filtered = drafts.filter((it:any) => {
        if (this.filters.q) { const ql = this.filters.q.toLowerCase(); if (!((it.title||'').toLowerCase().includes(ql) || (it.companyName||'').toLowerCase().includes(ql))) return false; }
        if (this.filters.type && this.filters.type !== 'all' && it.type && it.type !== this.filters.type) return false;
        if (this.filters.date && it.createdAt && !it.createdAt.startsWith(this.filters.date)) return false;
        return true;
      });
      this.ui.showToast('Servidor indisponível — exibindo apenas rascunhos locais.', 'info', 5000);
      this.allDocuments = filtered;
      this.updateDisplayedDocuments();
    } catch (e) { this.allDocuments = []; this.documents = []; }
  }

  private updateDisplayedDocuments(): void {
    this.documents = this.allDocuments.slice(0, this.itemsPerPage);
  }

  changeItemsPerPage(count: number): void {
    this.itemsPerPage = count;
    this.updateDisplayedDocuments();
  }

  async downloadDocument(d:any) {
    try {
  const typeSlug = this.documentTypeToSlug(d.documentType || d.type || '');
      const id = d.id || d.reportId || '';
      if (!id) throw new Error('ID ausente');
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}/pdf`, { headers: this.legacy.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao baixar PDF');
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('pdf')) throw new Error('Resposta não é PDF');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `document-${id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      this.ui.showToast('Download iniciado.', 'success');
      return;
    } catch (err:any) { console.warn('download failed', err); this.ui.showToast(err?.message || 'Não foi possível obter PDF do documento.', 'error'); }
  }

  async viewDocument(d:any) {
    try {
  const typeSlug = this.documentTypeToSlug(d.documentType || d.type || '');
      const id = d.id || d.reportId || '';
      if (!id) throw new Error('ID ausente');
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}/pdf`, { headers: this.legacy.authHeaders() });
      if (!resp || !resp.ok) throw new Error('Erro ao obter PDF');
      const ct = (resp.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('pdf')) throw new Error('Servidor não retornou PDF');
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(()=>window.URL.revokeObjectURL(url), 5000);
      return;
    } catch (err:any) { console.error('view failed', err); this.ui.showToast(err?.message || 'Não foi possível carregar PDF para visualização.', 'error'); }
  }

  async deleteDocument(d:any) {
    try {
      const confirm = window.confirm('Confirma exclusão do documento?');
      if (!confirm) return;
      
  const typeSlug = this.documentTypeToSlug(d.documentType || d.type || '');
      const id = d.id || d.reportId || '';
      
      if (!id) {
        // remove local draft
        const all = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
        const filtered = all.filter((x:any)=> String(x.id||x.reportId||'') !== String(id));
        localStorage.setItem('savedInspectionReports', JSON.stringify(filtered));
        this.loadDocumentsList();
        return;
      }
      
      // DELETE /documents/{type}/{id}
      const resp = await fetch(`${this.legacy.apiBaseUrl}/documents/${encodeURIComponent(typeSlug)}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.legacy.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao excluir documento');
      this.ui.showToast('Documento excluído.', 'success');
      this.loadDocumentsList();
    } catch (err:any) { this.ui.showToast(err?.message || 'Erro ao excluir documento', 'error'); }
  }

  editDocument(d:any) {
    try {
      const id = d.id || d.reportId || '';
      if (!id) { this.ui.showToast('Documento não possui ID para edição', 'error'); return; }
      // salvar rascunho temporário para acelerar o preenchimento no AEP
      try { localStorage.setItem('aepDraft', JSON.stringify(d)); } catch(_) {}
      // navegar para a rota AEP com query param id
      this.router.navigate(['/aep'], { queryParams: { id } });
    } catch (err:any) { this.ui.showToast(err?.message || 'Não foi possível iniciar edição', 'error'); }
  }

  documentTypeToSlug(type: any) {
    if (!type) return 'document';
    const raw = String(type || '');
    const normalized = raw.normalize ? raw.normalize('NFD').replace(/\p{Diacritic}/gu, '') : raw;
    const up = normalized.toUpperCase();
    // Map common full-text document types to canonical slugs
    if (up.includes('CHECKLIST') || up.includes('INSPECAO') || up.includes('INSPECAO') || up.includes('INSPECC')) return 'checklist';
    if (up.includes('RELATORIO') || up.includes('RELAT') || (up.includes('VISITA') && up.includes('RELAT'))) return 'visit';
    if (up.includes('VISITA') && !up.includes('CHECK')) return 'visit';
    // Recognize full phrase for Avaliação Ergonômica Preliminar (with or without accents)
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
