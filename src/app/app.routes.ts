import { Routes } from '@angular/router';
import { LoginComponent } from './components/pages/login/login.component';
import { DashboardComponent } from './components/pages/dashboard/dashboard.component';
import { ChecklistComponent } from './components/pages/checklist/checklist.component';
import { ChecklistNrComponent } from './components/pages/checklist-nr/checklist-nr.component';
import { ReportComponent } from './components/pages/report/report.component';
import { AdminComponent } from './components/pages/admin/admin.component';
import { AepComponent } from './components/pages/aep/aep.component';
import { AgendaComponent } from './components/pages/agenda/agenda.component';
import { GroupComponent } from './components/pages/group/group.component';
import { DocumentsComponent } from './components/pages/documents/documents.component';
import { ProfileComponent } from './components/pages/profile/profile.component';
import { ChangePasswordComponent } from './components/pages/change-password/change-password.component';
import { AdminGuard } from './guards/admin.guard';
// Forms and ChangePassword pages are not yet migrated; remove their imports for now


export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
	{ path: 'dashboard', component: DashboardComponent },
    { path: 'group', component: GroupComponent },
	{ path: 'checklist', component: ChecklistComponent },
	{ path: 'checklist-nr', component: ChecklistNrComponent },
	{ path: 'report', component: ReportComponent },
	{ path: 'agenda', component: AgendaComponent },
	{ path: 'documents', component: DocumentsComponent },
	{ path: 'profile', component: ProfileComponent },
	// rotas forms/change-password removidas temporariamente até migração completa
	{ path: 'admin', component: AdminComponent, canActivate: [AdminGuard] },
	{ path: 'aep', component: AepComponent },
	{ path: 'change-password', component: ChangePasswordComponent },
	{ path: '**', redirectTo: '' }
];
