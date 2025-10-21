// Página: checklist
// Contém renderChecklistForm, addCollapsibleListeners e handlers de submissão
import { checklistData } from '../data.js';

export function renderChecklistForm() {
    const checklistContainer = document.getElementById('checklistContainer');
    if (!checklistContainer) return;

    let formContent = '';
    checklistData.forEach(section => {
        const isNaOption = section.naOption;
        formContent += `
            <div class="section-container">
                <div class="section-header">
                    <span class="section-number">${section.sectionId}</span>
                    <h3 class="section-title"> ${section.sectionTitle}</h3>
                    ${isNaOption ? `
                        <div class="na-option">
                            <input type="checkbox" id="na-${section.sectionId}" name="na-${section.sectionId}">
                            <label for="na-${section.sectionId}">Não se Aplica</label>
                        </div>
                    ` : ''}
                </div>
                <div class="section-items ${isNaOption ? 'collapsible' : ''}" id="items-${section.sectionId}">
        `;
        section.items.forEach(item => {
            const itemNa = item.naOption ? `<label class="item-na"><input type="checkbox" class="item-na-checkbox" id="na-item-${item.id}" data-item="${item.id}" /> Não se Aplica</label>` : '';
            formContent += `
                <div class="checklist-item">
                    <p class="question-text">${item.id} - ${item.text}</p>
                    <div class="radio-options">
                        <input type="radio" id="q-${item.id}-sim" name="q-${item.id}" value="sim" required>
                        <label for="q-${item.id}-sim">Sim</label>
                        <input type="radio" id="q-${item.id}-nao" name="q-${item.id}" value="nao">
                        <label for="q-${item.id}-nao">Não</label>
                        ${itemNa}
                    </div>
                </div>
            `;
        });
        formContent += `
                </div>
            </div>
        `;
    });
    checklistContainer.innerHTML = formContent;
    addCollapsibleListeners();
    document.querySelectorAll('.item-na-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const itemId = cb.dataset.item;
            if (!itemId) return;
            const radios = document.querySelectorAll(`input[name="q-${itemId}"]`);
            if (cb.checked) {
                radios.forEach(r => { r.checked = false; r.disabled = true; r.removeAttribute('required'); });
            } else {
                radios.forEach(r => { r.disabled = false; r.setAttribute('required','required'); });
            }
        });
    });
    // evitar import estático para prevenir dependência circular com script.js
    (async () => {
        try {
            const m = await import('../script.js');
            if (m && m.loadCompanyHierarchyForChecklist) m.loadCompanyHierarchyForChecklist();
        } catch (e) {
            console.warn("Couldn't load company hierarchy handler from script.js", e);
        }
    })();
}

export function addCollapsibleListeners() {
    document.querySelectorAll('.na-option input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const sectionId = event.target.id.split('-')[1];
            const sectionItems = document.getElementById(`items-${sectionId}`);
            if (event.target.checked) {
                sectionItems.style.display = 'none';
                const radioButtons = sectionItems.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => { radio.checked = false; radio.disabled = true; radio.removeAttribute('required'); });
            } else {
                sectionItems.style.display = 'block';
                const radioButtons = sectionItems.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => { radio.disabled = false; radio.setAttribute('required','required'); });
            }
        });
    });
}

// Mantemos handlers globais expostos para compatibilidade com partials injetados
export async function handleChecklistSubmit(event) {
    event.preventDefault();
    const form = document.getElementById('checklistForm');
    if (form) form.noValidate = true;
    // abrimos modal de assinaturas via script.js (central) para reutilizar código existente
    try {
        const mod = await import('../script.js');
        if (mod.openSignatureModal) return mod.openSignatureModal({
            modalId: '#signatureModal',
            techCanvasSelector: '#techSignatureCanvas',
            clientCanvasSelector: '#clientSignatureCanvas',
            techNameSelector: '#techName',
            clientNameSelector: '#clientName',
            clearAllBtnId: '#clearAllSignaturesBtn',
            clearTechBtnId: '#clearTechSignatureBtn',
            clearClientBtnId: '#clearClientSignatureBtn',
            confirmBtnId: '#confirmSignaturesBtn',
            cancelBtnId: '#cancelSignaturesBtn'
        });
    } catch (e) {
        console.warn('Não foi possível abrir modal de assinatura via script.js', e);
    }
}

export async function handleDownloadPdf(reportId) {
    try {
        const mod = await import('../script.js');
        if (mod.handleDownloadPdf) return mod.handleDownloadPdf(reportId);
    } catch (e) { console.warn('Erro download PDF', e); }
}

// Expor para uso por loadComponents.js quando importado diretamente de script.js
window.handleChecklistSubmit = handleChecklistSubmit;
window.handleDownloadPdf = handleDownloadPdf;
