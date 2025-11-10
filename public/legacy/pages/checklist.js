// Legacy checklist page removed from project. Functions stubbed to avoid runtime errors if loaded.
export function renderChecklistForm() {
    const c = document.getElementById('checklistContainer');
    if (c) c.innerHTML = '<div class="removed-note">Página de Checklist removida.</div>';
}
export function addCollapsibleListeners() { /* no-op */ }
export async function handleChecklistSubmit(event) { if (event && event.preventDefault) event.preventDefault(); }
export async function handleDownloadPdf(reportId) { console.warn('handleDownloadPdf called for removed checklist page'); }
window.handleChecklistSubmit = handleChecklistSubmit;
window.handleDownloadPdf = handleDownloadPdf;
