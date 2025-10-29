import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegacyService } from '../../../services/legacy.service';

@Component({
  standalone: true,
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private legacy = inject(LegacyService);

  // dados do perfil
  profile: any = null;

  async ngOnInit(): Promise<void> {
    this.profile = await this.legacy.fetchUserProfile().catch(()=>null) || {};
  }

  initials(): string {
    if (!this.profile) return '';
    if (this.profile.initials) return this.profile.initials;
    const name = this.profile.name || '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + (parts[1][0] || '')).toUpperCase();
  }

  formatDate(d: string|undefined|null): string {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return d as string;
      return dt.toLocaleDateString();
    } catch {
      return d as string;
    }
  }
}
