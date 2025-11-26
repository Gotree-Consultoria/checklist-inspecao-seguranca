import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientService, Client } from '../../../../services/client.service';
import { CompanyService } from '../../../../services/company.service';
import { UiService } from '../../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-client-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './client-form.component.html',
  styleUrls: ['./client-form.component.css']
})
export class ClientFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientService);
  private companyService = inject(CompanyService);
  private ui = inject(UiService);
  private fb = inject(FormBuilder);

  form: FormGroup;
  isLoading = false;
  isSaving = false;
  clientId: number | null = null;
  companies: any[] = [];
  selectedCompanyIds: Set<number> = new Set();
  pageTitle = 'Novo Cliente';

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadCompanies();
    this.checkForEditMode();
  }

  private async loadCompanies(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.companyService.getAll(0, 1000);  // Buscar todas
      this.companies = response.content || [];
      console.log('[ClientForm] Empresas carregadas:', this.companies);
    } catch (err: any) {
      console.error('[ClientForm] Erro ao carregar empresas:', err);
      this.ui.showToast('Erro ao carregar empresas', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  private checkForEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clientId = parseInt(id, 10);
      this.loadClient(this.clientId);
    }
  }

  private async loadClient(id: number): Promise<void> {
    try {
      this.isLoading = true;
      const client = await this.clientService.getById(id);
      
      console.log('[ClientForm] Cliente carregado:', client);
      
      this.form.patchValue({
        name: client.name,
        email: client.email
      });

      // Marcar empresas selecionadas
      if (client.companyIds && Array.isArray(client.companyIds)) {
        this.selectedCompanyIds = new Set(client.companyIds);
      }

      this.pageTitle = `Editar Cliente: ${client.name}`;
    } catch (err: any) {
      console.error('[ClientForm] Erro ao carregar cliente:', err);
      this.ui.showToast('Erro ao carregar cliente', 'error');
      this.router.navigate(['/admin/clients']);
    } finally {
      this.isLoading = false;
    }
  }

  isCompanySelected(companyId: number): boolean {
    return this.selectedCompanyIds.has(companyId);
  }

  toggleCompanySelection(companyId: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedCompanyIds.add(companyId);
    } else {
      this.selectedCompanyIds.delete(companyId);
    }
    console.log('[ClientForm] Empresas selecionadas:', Array.from(this.selectedCompanyIds));
  }

  getSelectedCompanyNames(): string {
    if (this.selectedCompanyIds.size === 0) {
      return 'Nenhuma empresa selecionada';
    }
    return Array.from(this.selectedCompanyIds)
      .map(id => this.companies.find(c => c.id === id)?.name || `ID: ${id}`)
      .join(', ');
  }

  async onSubmit(): Promise<void> {
    if (!this.form.valid) {
      this.ui.showToast('Por favor, preencha todos os campos corretamente', 'error');
      return;
    }

    try {
      this.isSaving = true;

      const clientData: Client = {
        name: this.form.get('name')?.value || '',
        email: this.form.get('email')?.value || '',
        companyIds: Array.from(this.selectedCompanyIds)
      };

      console.log('[ClientForm] Enviando dados:', clientData);

      if (this.clientId) {
        // Modo edição
        await this.clientService.update(this.clientId, clientData);
        this.ui.showToast('Cliente atualizado com sucesso!', 'success');
      } else {
        // Modo criação
        await this.clientService.create(clientData);
        this.ui.showToast('Cliente criado com sucesso!', 'success');
      }

      // Redirecionar para lista
      setTimeout(() => {
        this.router.navigate(['/admin/clients']);
      }, 1500);
    } catch (err: any) {
      console.error('[ClientForm] Erro ao salvar cliente:', err);
      this.ui.showToast(err?.message || 'Erro ao salvar cliente', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  onCancel(): void {
    this.router.navigate(['/admin/clients']);
  }
}
