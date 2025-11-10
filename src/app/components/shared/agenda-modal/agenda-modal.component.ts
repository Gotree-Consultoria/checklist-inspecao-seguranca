import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../../services/ui.service';

export type AgendaModalMode = 'create' | 'edit' | 'reschedule';

export interface AgendaModalData {
  mode: AgendaModalMode;
  title: string;
  description?: string | null;
  date?: string;
  reason?: string | null;
}

@Component({
  selector: 'app-agenda-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="cancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ getModalTitle() }}</h3>
          <button class="close-btn" (click)="cancel()" aria-label="Fechar">×</button>
        </div>

        <div class="modal-body">
          <!-- CREATE / EDIT: Evento -->
          <ng-container *ngIf="mode === 'create' || mode === 'edit'">
            <div class="form-group">
              <label for="modalTitle">Título *</label>
              <input
                id="modalTitle"
                type="text"
                [(ngModel)]="formData.title"
                placeholder="Digite o título do evento"
                required
              />
              <small class="error" *ngIf="errors['title']">{{ errors['title'] }}</small>
            </div>

            <div class="form-group">
              <label for="modalDescription">Descrição</label>
              <textarea
                id="modalDescription"
                [(ngModel)]="formData.description"
                placeholder="Digite uma descrição (opcional)"
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="modalDate">Data *</label>
              <input
                id="modalDate"
                type="date"
                [(ngModel)]="formData.date"
                required
              />
              <small class="error" *ngIf="errors['date']">{{ errors['date'] }}</small>
            </div>
          </ng-container>

          <!-- RESCHEDULE: Visita -->
          <ng-container *ngIf="mode === 'reschedule'">
            <div class="form-group">
              <label for="rescheduleDate">Nova Data *</label>
              <input
                id="rescheduleDate"
                type="date"
                [(ngModel)]="formData.date"
                required
              />
              <small class="error" *ngIf="errors['date']">{{ errors['date'] }}</small>
            </div>

            <div class="form-group">
              <label for="rescheduleReason">Motivo do Reagendamento</label>
              <textarea
                id="rescheduleReason"
                [(ngModel)]="formData.reason"
                placeholder="Explique o motivo do reagendamento (opcional)"
                rows="3"
              ></textarea>
            </div>
          </ng-container>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" (click)="cancel()">Cancelar</button>
          <button type="button" class="btn-primary" (click)="confirm()" [disabled]="isSubmitting">
            {{ isSubmitting ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #eee;
    }
    .modal-header h3 { margin: 0; font-size: 1.2rem; }
    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: #666;
    }
    .modal-body {
      padding: 16px;
    }
    .form-group {
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 4px;
      color: #333;
    }
    input, textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: inherit;
      font-size: 0.95rem;
      box-sizing: border-box;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #666;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
    }
    .error {
      color: #d32f2f;
      display: block;
      margin-top: 2px;
      font-size: 0.85rem;
    }
    .modal-footer {
      padding: 12px 16px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn-primary, .btn-secondary {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.95rem;
    }
    .btn-primary {
      background-color: #bfd83a;
      color: white;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-secondary {
      background-color: #e65f3c;
      color: white;
    }
  `]
})
export class AgendaModalComponent {
  private ui = inject(UiService);

  @Output() confirmAction = new EventEmitter<AgendaModalData>();
  @Output() cancelAction = new EventEmitter<void>();

  isOpen = false;
  mode: AgendaModalMode = 'create';
  isSubmitting = false;

  formData: AgendaModalData = {
    mode: 'create',
    title: '',
    description: null,
    date: '',
    reason: null
  };

  errors: Record<string, string> = {};

  getModalTitle(): string {
    const titles = {
      create: 'Criar Novo Evento',
      edit: 'Editar Evento',
      reschedule: 'Reagendar Visita'
    };
    return titles[this.mode];
  }

  open(mode: AgendaModalMode, initialData?: Partial<AgendaModalData>): void {
    this.mode = mode;
    this.isOpen = true;
    this.errors = {};
    this.isSubmitting = false;
    this.formData = {
      mode,
      title: initialData?.title || '',
      description: initialData?.description || null,
      date: initialData?.date || '',
      reason: initialData?.reason || null
    };
    setTimeout(() => {
      try {
        const firstInput = document.querySelector('.modal-content input') as HTMLInputElement;
        if (firstInput) firstInput.focus();
      } catch (_) {}
    }, 100);
  }

  cancel(): void {
    this.isOpen = false;
    this.errors = {};
    this.formData = { mode: 'create', title: '', description: null, date: '', reason: null };
    this.cancelAction.emit();
  }

  confirm(): void {
    this.errors = {};

    if (this.mode === 'create' || this.mode === 'edit') {
      if (!this.formData.title?.trim()) {
        this.errors['title'] = 'Título é obrigatório';
      }
      if (!this.formData.date?.trim()) {
        this.errors['date'] = 'Data é obrigatória';
      }
    }

    if (this.mode === 'reschedule') {
      if (!this.formData.date?.trim()) {
        this.errors['date'] = 'Nova data é obrigatória';
      }
    }

    if (Object.keys(this.errors).length > 0) {
      this.ui.showToast('Preencha os campos obrigatórios', 'warning');
      return;
    }

    this.isSubmitting = true;
    this.confirmAction.emit({ ...this.formData });
    // reset após emitir
    setTimeout(() => {
      this.isOpen = false;
      this.isSubmitting = false;
      this.errors = {};
    }, 300);
  }
}
