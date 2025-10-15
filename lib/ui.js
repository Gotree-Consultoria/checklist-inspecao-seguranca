// UI utilities: toast and confirmation dialog
function ensureUiContainers() {
    if (!document.getElementById('ui-root')) {
        const root = document.createElement('div');
        root.id = 'ui-root';
        document.body.appendChild(root);
    }
    if (!document.getElementById('toast-container')) {
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        document.body.appendChild(tc);
    }
}

export function showToast(message, type = 'info', timeout = 4000) {
    ensureUiContainers();
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, timeout);
}

export function confirmDialog({ title = 'Confirmação', message = 'Tem certeza?', confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'default' } = {}) {
    ensureUiContainers();
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const modal = document.createElement('div');
        modal.className = `modal ${variant==='danger'?'modal-danger':''}`;
        modal.innerHTML = `
            <div class="modal-header">
              <h3>${title}</h3>
            </div>
            <div class="modal-body">
              <p>${message}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-action="cancel">${cancelText}</button>
              <button type="button" class="btn btn-danger" data-action="confirm">${confirmText}</button>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        function cleanup(result) {
            overlay.classList.add('closing');
            setTimeout(() => overlay.remove(), 250);
            resolve(result);
        }
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup(false);
        });
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
        modal.querySelector('[data-action="confirm"]').addEventListener('click', () => cleanup(true));
        const escHandler = (ev) => { if (ev.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', escHandler);} };
        document.addEventListener('keydown', escHandler);
        requestAnimationFrame(() => overlay.classList.add('open'));
    });
}

// Exports for backwards compatibility
window.showToast = showToast;
window.confirmDialog = confirmDialog;

export default { showToast, confirmDialog };
