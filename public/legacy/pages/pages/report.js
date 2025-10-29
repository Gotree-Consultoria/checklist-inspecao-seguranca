// Página: report
// Contém renderReportForm e setupReportCompanySelectors (extraídas de script.js)
// evitar import estático para prevenir dependência circular com script.js
export function renderReportForm() {
    // container auxiliar para registros (usado para renderRecords)
    let recordsContainer = document.getElementById('recordsContainer');
    if (!recordsContainer) {
        // fallback: criar e inserir dentro do formulário ou container da página
        recordsContainer = document.createElement('div');
        recordsContainer.id = 'recordsContainer';
        recordsContainer.className = 'records-list';
        const formPlace = document.getElementById('reportForm') || document.querySelector('.report-page .container');
        if (formPlace && formPlace.appendChild) formPlace.appendChild(recordsContainer); else document.body.appendChild(recordsContainer);
    }
    recordsContainer.style.display = 'none';

    // referências a elementos do DOM usados pelo formulário
    const addRecordBtn = document.getElementById('addRecordBtn');
    const saveReportBtn = document.getElementById('saveReportBtn');

    // Carrega registros salvos (se houver)
    const saved = localStorage.getItem('draftReport');
    let reportDraft = saved ? JSON.parse(saved) : { records: [] };

    function renderRecords() {
        if (!reportDraft.records.length) {
            recordsContainer.style.display = 'none';
            recordsContainer.innerHTML = '';
            return;
        }
        recordsContainer.style.display = 'block';
        recordsContainer.innerHTML = '';
        reportDraft.records.forEach((rec, idx) => {
            const el = document.createElement('div');
            el.className = 'report-record record-line';
            el.draggable = true;
            el.dataset.index = idx;
            el.innerHTML = `
                <div class="record-meta">
                    <div><label>Descrição</label><input class="rec-desc form-control" value="${rec.description || ''}" /></div>
                    <div><label>Consequências</label><input class="rec-conseq form-control" value="${rec.consequences || ''}" /></div>
                    <div><label>Orientação legal</label><input class="rec-legal form-control" value="${rec.legal || ''}" /></div>
                    <div><label>Penalidades</label><input class="rec-penal form-control" value="${rec.penalties || ''}" /></div>
                    <div><label>Responsável</label><input class="rec-resp form-control" value="${rec.responsible || ''}" /></div>
                    <div><label>Prioridade</label>
                        <select class="rec-priority form-select">
                            <option value="Alta" ${rec.priority==='Alta'?'selected':''}>Alta</option>
                            <option value="Media" ${rec.priority==='Media'?'selected':''}>Média</option>
                            <option value="Baixa" ${rec.priority==='Baixa'?'selected':''}>Baixa</option>
                        </select>
                    </div>
                    <div><label>Prazo</label><input type="date" class="rec-deadline form-control" value="${rec.deadline || ''}" /></div>
                    <div>
                        <label>Reiscindência</label>
                        <select class="rec-unchanged form-select">
                            <option value="Sim" ${rec.unchanged==='Sim'?'selected':''}>Sim</option>
                            <option value="Não" ${rec.unchanged==='Não'?'selected':''}>Não</option>
                        </select>
                    </div>
                </div>
                <div class="record-photo">
                    <div class="photo-slot">
                        <img src="${(rec.photos && rec.photos[0]) || ''}" alt="foto" class="rec-img" data-index="0" />
                        <input type="file" accept="image/*" class="rec-file" data-index="0" />
                    </div>
                    <div class="photo-slot">
                        <img src="${(rec.photos && rec.photos[1]) || ''}" alt="foto" class="rec-img" data-index="1" />
                        <input type="file" accept="image/*" class="rec-file" data-index="1" />
                    </div>
                    <div style="display:flex;gap:8px;flex-direction:column;">
                        <button type="button" class="btn-capture">Usar Câmera</button>
                        <button type="button" class="btn-remove-photo">Remover Fotos</button>
                        <button type="button" class="btn-remove-record">Remover Registro</button>
                    </div>
                </div>
            `;

            // multiple file inputs (two slots)
            const fileInputs = el.querySelectorAll('.rec-file');
            fileInputs.forEach(input => {
                input.addEventListener('change', (e) => {
                    const slot = parseInt(input.dataset.index,10) || 0;
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                        reportDraft.records[idx].photos = reportDraft.records[idx].photos || [];
                        reportDraft.records[idx].photos[slot] = reader.result;
                        saveDraft();
                        renderRecords();
                    };
                    reader.readAsDataURL(file);
                });
            });

            // style photo slots according to presence
            const slotEls = el.querySelectorAll('.photo-slot');
            slotEls.forEach((slotEl, sidx) => {
                const has = (rec.photos && rec.photos[sidx]);
                if (!has) slotEl.classList.add('empty'); else slotEl.classList.remove('empty');
                // make second slot smaller when empty
                if (sidx === 1 && !has) slotEl.classList.add('small'); else slotEl.classList.remove('small');
                const img = slotEl.querySelector('.rec-img');
                if (img) img.style.display = has ? 'block' : 'none';
            });

            const btnCapture = el.querySelector('.btn-capture');
            btnCapture.addEventListener('click', async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const track = stream.getVideoTracks()[0];
                    const imageCapture = new ImageCapture(track);
                    const blob = await imageCapture.takePhoto();
                    const reader = new FileReader();
                    reader.onload = () => {
                        reportDraft.records[idx].photos = reportDraft.records[idx].photos || [];
                        // push into first empty slot
                        const slot = (reportDraft.records[idx].photos[0] ? 1 : 0);
                        reportDraft.records[idx].photos[slot] = reader.result;
                        saveDraft();
                        renderRecords();
                        track.stop();
                    };
                    reader.readAsDataURL(blob);
                } catch (err) {
                    alert('Não foi possível acessar a câmera: ' + err.message);
                }
            });

            const btnRemovePhoto = el.querySelector('.btn-remove-photo');
            btnRemovePhoto.addEventListener('click', () => {
                reportDraft.records[idx].photos = [];
                saveDraft();
                renderRecords();
            });

            const btnRemoveRecord = el.querySelector('.btn-remove-record');
            btnRemoveRecord.addEventListener('click', () => {
                reportDraft.records.splice(idx,1);
                saveDraft();
                renderRecords();
            });

            el.querySelectorAll('.rec-desc, .rec-conseq, .rec-legal, .rec-penal, .rec-resp, .rec-priority, .rec-deadline, .rec-unchanged').forEach(input => {
                input.addEventListener('input', () => {
                    reportDraft.records[idx].description = el.querySelector('.rec-desc').value;
                    reportDraft.records[idx].consequences = el.querySelector('.rec-conseq').value;
                    reportDraft.records[idx].legal = el.querySelector('.rec-legal').value;
                    reportDraft.records[idx].penalties = el.querySelector('.rec-penal').value;
                    reportDraft.records[idx].responsible = el.querySelector('.rec-resp').value;
                    reportDraft.records[idx].priority = el.querySelector('.rec-priority').value;
                    reportDraft.records[idx].deadline = el.querySelector('.rec-deadline').value;
                    reportDraft.records[idx].unchanged = el.querySelector('.rec-unchanged') ? el.querySelector('.rec-unchanged').value : 'Não';
                    saveDraft();
                });
            });

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', idx);
            });
            el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
            el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData('text/plain'),10);
                const to = parseInt(el.dataset.index,10);
                const [moved] = reportDraft.records.splice(from,1);
                reportDraft.records.splice(to,0,moved);
                saveDraft();
                renderRecords();
            });

            recordsContainer.appendChild(el);
        });
    }

    function saveDraft() {
        localStorage.setItem('draftReport', JSON.stringify(reportDraft));
    }

    if (addRecordBtn) {
        addRecordBtn.addEventListener('click', () => {
            // Limpa o cache e estado do relatório anterior
            localStorage.removeItem('draftReport');
            reportDraft = { records: [] };
            saveDraft();
            renderRecords();
            // Adiciona o primeiro registro vazio
            reportDraft.records.push({ photos: [], description: '', consequences: '', legal: '', penalties: '', responsible: '', priority: 'Media', deadline: '', unchanged: 'Não' });
            saveDraft();
            renderRecords();
        });
    } else {
        // fallback: ensure UI can still add records programmatically if needed
        console.debug('[report] addRecordBtn not found; add via API only');
    }

    saveReportBtn.addEventListener('click', async () => {
        const empresaSelect = document.getElementById('reportEmpresa');
        const unitSelect = document.getElementById('reportUnit');
        const includeToggleExisting = document.getElementById('reportIncludeCompany');
        const includeCompany = includeToggleExisting ? includeToggleExisting.checked : true;
        const empresaOpt = empresaSelect && empresaSelect.options[empresaSelect.selectedIndex];
        const unitOpt = unitSelect && unitSelect.options[unitSelect.selectedIndex];
        const baseCompanyName = empresaOpt ? (empresaOpt.textContent || '').trim() : '';
        const unitName = unitOpt ? (unitOpt.textContent || '').trim() : '';
        let composedName = baseCompanyName;
        if (unitName) {
            composedName = includeCompany && baseCompanyName ? `${baseCompanyName} - ${unitName}` : unitName;
        }
        const manualTitle = document.getElementById('reportTitle')?.value?.trim();
        const finalTitle = manualTitle || composedName || 'Relatório';
        // const reportStart = document.getElementById('reportStartTime') ? document.getElementById('reportStartTime').value : '';
        // const reportEnd = document.getElementById('reportEndTime') ? document.getElementById('reportEndTime').value : '';
        // não salvar o relatório aqui — apenas abrir o modal de assinatura para o relatório atual
        try {
            // atualizar título no formulário (preview) sem persistir
            const titleInput = document.getElementById('reportTitle');
            if (titleInput) titleInput.value = finalTitle;
        } catch (e) { /* ignore */ }

        // preenche nome do técnico se possível e abre modal de assinatura da reportPage
        try {
            const core = await import('../script.js');
            if (core && core.fetchUserProfile) {
                const me = await core.fetchUserProfile();
                const techNameInput = document.getElementById('techNameReport');
                if (me && techNameInput) techNameInput.value = me.name || '';
            }
        } catch (e) { console.debug('profile load failed', e); }

        try {
            const mod = await import('../script.js');
            if (mod && mod.openSignatureModal) {
                const pads = await mod.openSignatureModal({
                    modalId: '#reportSignatureModal',
                    techCanvasSelector: '#techSignatureCanvasReport',
                    clientCanvasSelector: '#clientSignatureCanvasReport',
                    techNameSelector: '#techNameReport',
                    clientNameSelector: '#clientSignerName',
                    clearAllBtnId: '#clearAllSignaturesBtn',
                    clearTechBtnId: '#clearTechSigReport',
                    clearClientBtnId: '#clearClientSigReport',
                    confirmBtnId: '#confirmSendReportBtn',
                    cancelBtnId: '#cancelSendReportBtn',
                    bindConfirm: false
                });
                if (pads) { techPad = pads.tech; clientPad = pads.client; }
            } else {
                // fallback
                const sigModal = document.getElementById('reportSignatureModal');
                if (sigModal) { sigModal.classList.remove('hidden'); document.documentElement.style.overflow = 'hidden'; await initSignaturePads(); }
            }
        } catch (e) { console.debug('could not open report signature modal', e); }
    });

    renderRecords();

    // Ao abrir o formulário de relatório, preenche hora inicial com o horário atual (HH:MM:SS)
    try {
        const startElInit = document.getElementById('reportStartTime');
        if (startElInit && !startElInit.value) {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2,'0');
            const mm = String(now.getMinutes()).padStart(2,'0');
            const ss = String(now.getSeconds()).padStart(2,'0');
            startElInit.value = `${hh}:${mm}:${ss}`;
            // Marcar como somente leitura para impedir edição manual após preenchimento
            startElInit.setAttribute('readonly', 'readonly');
        }
    } catch (e) { console.debug('[report] could not init start time', e); }

    const generateBtn = document.getElementById('generateReportBtn');
    if (generateBtn && !generateBtn.__bound) {
        generateBtn.__bound = true;
        generateBtn.addEventListener('click', () => {
            const empresaSel = document.getElementById('reportEmpresa');
            const unidadeSel = document.getElementById('reportUnit');
            const setorSel = document.getElementById('reportSector');
            const cnpjInput = document.getElementById('reportCNPJ');
            const includeToggleExisting = document.getElementById('reportIncludeCompany');
            const includeCompany = includeToggleExisting ? includeToggleExisting.checked : true;
            const empresaOpt = empresaSel && empresaSel.options[empresaSel.selectedIndex];
            const unidadeOpt = unidadeSel && unidadeSel.options[unidadeSel.selectedIndex];
            const setorOpt = setorSel && setorSel.options[setorSel.selectedIndex];
            if (!empresaOpt || !empresaOpt.value) {
                alert('Selecione uma empresa para gerar o relatório.');
                return;
            }
            const companyName = (empresaOpt.textContent || '').trim();
            const unitName = unidadeOpt && unidadeOpt.value ? (unidadeOpt.textContent || '').trim() : '';
            const sectorName = setorOpt && setorOpt.value ? (setorOpt.textContent || '').trim() : '';
            let focusType = unitName ? 'UNIDADE' : 'EMPRESA';
            const baseName = unitName ? (includeCompany && companyName ? `${companyName} - ${unitName}` : unitName) : companyName;
            const title = sectorName ? `${baseName} / Setor: ${sectorName}` : baseName;
            const generated = {
                focus: focusType,
                companyId: empresaOpt.value,
                unitId: unidadeOpt && unidadeOpt.value ? unidadeOpt.value : null,
                sector: sectorName || null,
                displayTitle: title,
                cnpj: cnpjInput ? cnpjInput.value : '',
                generatedAt: new Date().toISOString()
            };
            // If start time exists, compute end time as now and duration
            try {
                const startEl = document.getElementById('reportStartTime');
                if (startEl && startEl.value) {
                    const now = new Date();
                        const hh = String(now.getHours()).padStart(2,'0');
                        const mm = String(now.getMinutes()).padStart(2,'0');
                        const ss = String(now.getSeconds()).padStart(2,'0');
                        const endVal = `${hh}:${mm}:${ss}`;
                        // set end time field and show container (remove hidden class)
                        const endEl = document.getElementById('reportEndTime');
                        const endContainer = document.getElementById('reportEndContainer');
                        if (endEl) { endEl.value = endVal; }
                        if (endContainer) { endContainer.classList.remove('hidden'); }
                        // compute duration between start and now (handles seconds and crossing midnight)
                        const parts = startEl.value.split(':').map(n=>parseInt(n,10));
                        const sh = parts[0] || 0; const sm = parts[1] || 0; const ssec = parts[2] || 0;
                        const startDate = new Date(); startDate.setHours(sh, sm, ssec, 0);
                    let diffMs = now - startDate;
                    if (diffMs < 0) diffMs += 24*60*60*1000; // next day
                    const diffMin = Math.floor(diffMs / 60000);
                    const durH = Math.floor(diffMin/60); const durM = diffMin % 60;
                    const durStr = `${String(durH).padStart(2,'0')}:${String(durM).padStart(2,'0')}`;
                    generated.endTime = endVal;
                    generated.duration = durStr;
                }
            } catch (_) {}
            const list = JSON.parse(localStorage.getItem('generatedReports') || '[]');
            list.push(generated);
            localStorage.setItem('generatedReports', JSON.stringify(list));
            alert(`Relatório preparado (foco: ${focusType}). Título: ${title}`);
        });
    }

    // --- Envio para backend (POST /technical-visits) com modal de assinatura ---
    const sendBtn = document.getElementById('sendReportBtn');
    const sigModal = document.getElementById('reportSignatureModal');
    const techNameInput = document.getElementById('techNameReport');
    const clientSignerInput = document.getElementById('clientSignerName');
    // const confirmSendBtn = document.getElementById('confirmSendReportBtn');
    // const cancelSendBtn = document.getElementById('cancelSendReportBtn');
    // const clearTechBtn = document.getElementById('clearTechSigReport');
    // const clearAllBtn = document.getElementById('clearAllSignaturesBtn');
    const techCanvas = document.getElementById('techSignatureCanvasReport');
    const clientCanvas = document.getElementById('clientSignatureCanvasReport');
    let techPad = null, clientPad = null;

    async function initSignaturePads() {
        try {
            if (techCanvas && window.SignaturePad) techPad = new window.SignaturePad(techCanvas);
            if (clientCanvas && window.SignaturePad) clientPad = new window.SignaturePad(clientCanvas);
        } catch (e) { console.debug('Could not init SignaturePad', e); }
    }

    // open modal and prefil technician name
    // bind the send handler to the modal confirm button if present, else fall back to legacy sendBtn
    const confirmSendBtn = document.getElementById('confirmSendReportBtn');
    const sendTrigger = confirmSendBtn || sendBtn;
    if (sendTrigger) {
        sendTrigger.addEventListener('click', async () => {
            // load profile
            try {
                const core = await import('../script.js');
                if (core && core.fetchUserProfile) {
                    const me = await core.fetchUserProfile();
                    if (me && techNameInput) techNameInput.value = me.name || '';
                }
            } catch (e) { console.debug('profile load failed', e); }
            const techSigRaw = techPad && !techPad.isEmpty() ? techPad.toDataURL('image/png') : '';
            const clientSigRaw = clientPad && !clientPad.isEmpty() ? clientPad.toDataURL('image/png') : '';

            // normalize startTime to HH:mm (strip seconds if present)
            const rawStart = document.getElementById('reportStartTime') ? document.getElementById('reportStartTime').value : '';
            const startTime = rawStart ? rawStart.split(':').slice(0,2).join(':') : '';

            // validate and normalize visitDate (must be non-empty and in YYYY-MM-DD)
            const rawVisit = document.getElementById('dataInspecao') ? document.getElementById('dataInspecao').value : '';
            const normalizeDateToISO = (v) => {
                if (!v) return '';
                // if already in YYYY-MM-DD and looks valid, return
                const isoLike = /^\d{4}-\d{2}-\d{2}$/;
                if (isoLike.test(v)) return v;
                // try common formats: DD/MM/YYYY or DD-MM-YYYY
                const dm = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
                if (dm) {
                    let day = dm[1].padStart(2,'0');
                    let month = dm[2].padStart(2,'0');
                    let year = dm[3];
                    if (year.length === 2) {
                        // assume 20xx for two-digit years
                        year = '20' + year;
                    }
                    const cand = `${year}-${month}-${day}`;
                    // basic semantic check
                    const d = new Date(cand);
                    if (!isNaN(d.getTime())) return cand;
                }
                // try Date parse fallback
                const parsed = new Date(v);
                if (!isNaN(parsed.getTime())) {
                    const y = parsed.getFullYear();
                    const m = String(parsed.getMonth()+1).padStart(2,'0');
                    const d = String(parsed.getDate()).padStart(2,'0');
                    return `${y}-${m}-${d}`;
                }
                return '';
            };

            const visitDateNormalized = normalizeDateToISO(rawVisit);
            if (!visitDateNormalized) {
                // use toast if available, fallback to alert
                try { window.showToast && window.showToast('Data da visita inválida ou vazia. Por favor informe uma data no formato YYYY-MM-DD.', 'error'); } catch(e) {}
                if (!window.showToast) alert('Data da visita inválida ou vazia. Por favor informe uma data no formato YYYY-MM-DD.');
                return;
            }

        // Garante que o título está definido
        const title = document.getElementById('reportTitle')?.value?.trim() || 'Relatório';
        // obter id da empresa selecionada (campo reportEmpresa)
        const empresaSelectElem = document.getElementById('reportEmpresa');
        const clientCompanyId = empresaSelectElem && empresaSelectElem.value ? empresaSelectElem.value : null;
        // referências técnicas: tentamos extrair da lista se presente, senão vazio
        const technicalReferences = Array.from(document.querySelectorAll('#referencesList li')).map(li => li.textContent.trim()).filter(Boolean);

        // tentar obter geolocation já coletada via navigator, com fallback nulo
        const getGeoSync = () => ({ latitude: null, longitude: null });

        const payload = {
            title: title,
            clientCompanyId: clientCompanyId,
            location: document.getElementById('localInspecao') ? document.getElementById('localInspecao').value : '',
            visitDate: visitDateNormalized,
            startTime: startTime,
            technicalReferences: technicalReferences,
            summary: document.getElementById('reportSummary') ? document.getElementById('reportSummary').value : '',
            findings: [], // Será preenchido abaixo
            technicianSignatureImageBase64: _stripDataUrl(techSigRaw),
            clientSignatureImageBase64: _stripDataUrl(clientSigRaw),
            clientSignerName: clientSignerInput ? clientSignerInput.value : '',

            clientSignatureLatitude: (typeof Geolocation !== 'undefined' && Geolocation && Geolocation.latitude) ? Geolocation.latitude : getGeoSync().latitude,
            clientSignatureLongitude: (typeof Geolocation !== 'undefined' && Geolocation && Geolocation.longitude) ? Geolocation.longitude : getGeoSync().longitude
        };

            // findings from records: include only the fields required by backend
            payload.findings = (reportDraft.records || []).map(r => {
    const p1raw = (r.photos && r.photos[0]) ? r.photos[0] : '';
    const p2raw = (r.photos && r.photos[1]) ? r.photos[1] : '';
    const p1 = _stripDataUrl(p1raw) || null;
    const p2 = _stripDataUrl(p2raw) || null;
    return {
        photoBase64_1: p1,
        photoBase64_2: p2,
        description: r.description || '',
        consequences: r.consequences || '',
        legalGuidance: r.legal || '', // Note que a sua UI usa a classe 'rec-legal'
        responsible: r.responsible || '',
        penalties: r.penalties || '',
        priority: (r.priority || 'MEDIA').toString().toUpperCase(),
        deadline: r.deadline && r.deadline.length ? r.deadline : null,
        recurrence: r.unchanged === 'Sim' // Converte 'Sim'/'Não' para true/false
    };
});

            // send
            try {
                console.log('[report] payload to send', payload);
                // usar helper postTechnicalVisit do módulo API (import dinâmico)
                const modApi = await import('../lib/api.js');
                const resp = await modApi.postTechnicalVisit(payload);
                if (!resp.ok) {
                    const txt = await resp.text().catch(()=>null) || '';
                    throw new Error(txt || ('Status ' + resp.status));
                }
                const data = await resp.json().catch(()=>null);
                // fechar modal
                if (sigModal) { sigModal.classList.add('hidden'); document.documentElement.style.overflow = ''; }

                // tentar extrair id do documento retornado pelo backend
                const docId = data && (data.id || data.reportId || data.documentId || data._id || null);
                // atualizar histórico local (savedInspectionReports) com entrada mínima
                try {
                    const all = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
                    const newEntry = { id: docId || null, title: document.getElementById('reportTitle')?.value || 'Relatório de Visita', type: 'RELATORIO_VISITA', createdAt: new Date().toISOString() };
                    all.push(newEntry);
                    localStorage.setItem('savedInspectionReports', JSON.stringify(all));
                } catch(_) {}

                if (docId) {
                    // buscar o PDF unificado e abrir em nova aba usando helper central (documents/{type}/{id}/pdf)
                    try {
                        const modApi = await import('../lib/api.js');
                        const pdfResp = await modApi.fetchReportPdf(['visit','report','checklist'], docId);
                        if (pdfResp && pdfResp.ok) {
                            const ct = (pdfResp.headers.get('content-type') || '').toLowerCase();
                            if (!ct.includes('pdf')) {
                                const txt = await pdfResp.text().catch(()=>null);
                                console.warn('Esperava PDF, recebeu:', ct, txt);
                                try { window.showToast && window.showToast('Documento criado, mas o servidor não retornou um PDF. Verifique no painel de Documentos.', 'warning'); } catch(e) {}
                                if (!window.showToast) alert('Documento criado, mas o servidor não retornou um PDF. Verifique no painel de Documentos.');
                            } else {
                                const blob = await pdfResp.blob();
                                const url = window.URL.createObjectURL(blob);
                                const w = window.open(url, '_blank');
                                try { w && w.focus(); } catch(_){ }
                                return;
                            }
                        } else {
                            const txt = await (pdfResp ? pdfResp.text().catch(()=>null) : Promise.resolve(null));
                            console.warn('Não foi possível obter PDF após criação; resposta:', pdfResp && pdfResp.status, txt);
                        }
                    } catch (err) {
                        console.warn('Não foi possível obter PDF do documento criado', err);
                    }
                }

                // fallback: notificar sucesso se não temos PDF
                alert('Relatório enviado com sucesso.');
            } catch (e) {
                alert('Falha ao enviar relatório: ' + (e && e.message));
            }
        });
    }
}

export function setupReportCompanySelectors() {
    const empresaSelect = document.getElementById('reportEmpresa');
    if (!empresaSelect) return;
    // O toggle 'reportIncludeCompany' foi removido do UI. Apenas carregamos a hierarquia de empresas.
    (async () => {
        try {
            const m = await import('../script.js');
            if (m && m.loadCompanyHierarchyForReport) m.loadCompanyHierarchyForReport();
        } catch (e) {
            console.warn("Couldn't load company hierarchy handler from script.js", e);
        }
    })();
}
