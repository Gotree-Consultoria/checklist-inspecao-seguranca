import { TestBed } from '@angular/core/testing';
import { ChecklistService } from './checklist.service';

describe('ChecklistService', () => {
  let service: ChecklistService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ChecklistService] });
    service = TestBed.inject(ChecklistService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not have duplicate ids', () => {
    const res = service.validateUniqueIds();
    expect(res.duplicateIds).toBeDefined();
    expect(res.duplicateIds.length).toBe(0);
  });

  it('should have no missing text fields', () => {
    const res = service.validatePresence();
    expect(res.missingText).toBeDefined();
    expect(res.missingText.length).toBe(0);
  });
});
