import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentsComponent } from './documents.component';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';

describe('DocumentsComponent', () => {
  let component: DocumentsComponent;
  let fixture: ComponentFixture<DocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsComponent],
      providers: [
        { provide: LegacyService, useValue: { apiBaseUrl: '/api', authHeaders: () => ({}) } },
        { provide: UiService, useValue: { showToast: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
  });

  it('deve carregar documentos do servidor (mock)', async () => {
    const mockResponse = {
      content: [{ id: '1', title: 'Doc 1', documentType: 'visit' }],
      totalElements: 1,
      totalPages: 1
    };
    spyOn(window as any, 'fetch').and.returnValue(Promise.resolve(new Response(JSON.stringify(mockResponse), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    await component.loadDocumentsList();
    expect(component.documents.length).toBeGreaterThan(0);
    expect(component.documents[0].title).toBe('Doc 1');
  });
});
