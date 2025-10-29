import { Injectable } from '@angular/core';
import { checklistData, ChecklistSection, ChecklistItem } from '../data/checklist.data';

@Injectable({ providedIn: 'root' })
export class ChecklistService {
  private data: ChecklistSection[] = checklistData;

  getAllSections(): ChecklistSection[] {
    return this.data;
  }

  getSection(sectionId: string): ChecklistSection | undefined {
    return this.data.find(s => s.sectionId === sectionId);
  }

  findItemById(itemId: string): { section: ChecklistSection; item: ChecklistItem } | undefined {
    for (const section of this.data) {
      const item = section.items.find(i => i.id === itemId);
      if (item) return { section, item };
    }
    return undefined;
  }

  validateUniqueIds(): { duplicateIds: string[] } {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const section of this.data) {
      if (seen.has(section.sectionId)) duplicates.push(section.sectionId);
      seen.add(section.sectionId);
      for (const item of section.items) {
        if (seen.has(item.id)) duplicates.push(item.id);
        seen.add(item.id);
      }
    }
  return { duplicateIds: Array.from(new Set(duplicates)) };
  }

  validatePresence(): { missingText: string[] } {
    const missing: string[] = [];
    for (const section of this.data) {
      if (!section.sectionTitle || section.sectionTitle.trim() === '') missing.push(`section:${section.sectionId}`);
      for (const item of section.items) {
        if (!item.text || item.text.trim() === '') missing.push(item.id);
      }
    }
    return { missingText: missing };
  }
}
