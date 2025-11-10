// Legacy nested checklist page removed - stubbed
export function renderChecklistForm() {
    const c = document.getElementById('checklistContainer');
    if (c) c.innerHTML = '<div class="removed-note">Página de Checklist removida.</div>';
}

export function addCollapsibleListeners() { /* no-op */ }

export async function handleChecklistSubmit(event) { event.preventDefault(); /* no-op */ }
export async function handleDownloadPdf(reportId) { /* no-op */ }

// maintain globals for legacy partials
window.handleChecklistSubmit = window.handleChecklistSubmit || handleChecklistSubmit;
window.handleDownloadPdf = window.handleDownloadPdf || handleDownloadPdf;
