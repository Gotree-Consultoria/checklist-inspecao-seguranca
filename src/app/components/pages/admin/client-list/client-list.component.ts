import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService, Client } from '../../../../services/client.service';
import { UiService } from '../../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-client-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './client-list.component.html',
  styleUrls: ['./client-list.component.css']
})
export class ClientListComponent implements OnInit {
  private clientService = inject(ClientService);
  private ui = inject(UiService);
  private router = inject(Router);

  clients: Client[] = [];
  isLoading = false;
  currentPage = 0;
  itemsPerPage = 10;
  totalElements = 0;
  totalPages = 0;
  pageNumbers: number[] = [];

  ngOnInit(): void {
    this.loadClients();
  }

  async loadClients(): Promise<void> {
    try {
      this.isLoading = true;
      const response = await this.clientService.getAll(this.currentPage, this.itemsPerPage);

      this.clients = response.content || [];
      this.totalElements = response.page.totalElements;
      this.totalPages = response.page.totalPages;

      this.updatePageNumbers();
      console.log('[ClientList] Clientes carregados:', this.clients);
    } catch (err: any) {
      console.error('[ClientList] Erro ao carregar clientes:', err);
      this.ui.showToast('Erro ao carregar clientes', 'error');
      this.clients = [];
    } finally {
      this.isLoading = false;
    }
  }

  private updatePageNumbers(): void {
    const maxButtons = 5;
    const pages: number[] = [];

    if (this.totalPages <= maxButtons) {
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(0, this.currentPage - 2);
      let endPage = Math.min(this.totalPages - 1, startPage + maxButtons - 1);

      if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(0, endPage - maxButtons + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    this.pageNumbers = pages;
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadClients();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadClients();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadClients();
    }
  }

  changeItemsPerPage(count: number): void {
    this.itemsPerPage = count;
    this.currentPage = 0;
    this.loadClients();
  }

  newClient(): void {
    this.router.navigate(['/admin/clients/new']);
  }

  editClient(client: Client): void {
    if (client.id) {
      this.router.navigate(['/admin/clients/edit', client.id]);
    }
  }

  async deleteClient(client: Client): Promise<void> {
    if (!client.id) return;

    const confirmed = window.confirm(`Deseja excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
      this.isLoading = true;
      await this.clientService.delete(client.id);
      this.ui.showToast('Cliente excluído com sucesso!', 'success');
      this.loadClients();
    } catch (err: any) {
      console.error('[ClientList] Erro ao deletar cliente:', err);
      this.ui.showToast(err?.message || 'Erro ao excluir cliente', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  getCompanyNames(client: Client): string {
    // Primeiro tenta usar companyNames (do backend)
    if (client.companyNames && client.companyNames.length > 0) {
      return client.companyNames.join(', ');
    }

    // Se não houver, tenta usar companies (array de objetos)
    if (client.companies && client.companies.length > 0) {
      return client.companies
        .map((c: any) => c.name || c.id)
        .join(', ');
    }

    return '-';
  }
}
