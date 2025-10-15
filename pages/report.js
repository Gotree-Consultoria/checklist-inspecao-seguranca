// Página: report
// Contém renderReportForm e setupReportCompanySelectors (extraídas de script.js)
// evitar import estático para prevenir dependência circular com script.js

export function renderReportForm() {
    const addRecordBtn = document.getElementById('addRecordBtn');
    const recordsContainer = document.getElementById('recordsContainer');
    const saveReportBtn = document.getElementById('saveReportBtn');

    if (!recordsContainer || !addRecordBtn || !saveReportBtn) return;

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
                    <div><label style="display:flex;align-items:center"><input type="checkbox" class="rec-done" ${rec.done?'checked':''}/>&nbsp;Permanece Inalterado</label></div>
                </div>
                <div class="record-photo">
                    <img src="${rec.photo || ''}" alt="foto" class="rec-img" />
                    <input type="file" accept="image/*" class="rec-file" />
                    <button type="button" class="btn-capture">Usar Câmera</button>
                    <button type="button" class="btn-remove-photo">Remover Foto</button>
                    <button type="button" class="btn-remove-record">Remover Registro</button>
                </div>
            `;

            const fileInput = el.querySelector('.rec-file');
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    reportDraft.records[idx].photo = reader.result;
                    saveDraft();
                    renderRecords();
                };
                reader.readAsDataURL(file);
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
                        reportDraft.records[idx].photo = reader.result;
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
                reportDraft.records[idx].photo = '';
                saveDraft();
                renderRecords();
            });

            const btnRemoveRecord = el.querySelector('.btn-remove-record');
            btnRemoveRecord.addEventListener('click', () => {
                reportDraft.records.splice(idx,1);
                saveDraft();
                renderRecords();
            });

            el.querySelectorAll('.rec-desc, .rec-conseq, .rec-legal, .rec-penal, .rec-resp, .rec-priority, .rec-deadline, .rec-done').forEach(input => {
                input.addEventListener('input', () => {
                    reportDraft.records[idx].description = el.querySelector('.rec-desc').value;
                    reportDraft.records[idx].consequences = el.querySelector('.rec-conseq').value;
                    reportDraft.records[idx].legal = el.querySelector('.rec-legal').value;
                    reportDraft.records[idx].penalties = el.querySelector('.rec-penal').value;
                    reportDraft.records[idx].responsible = el.querySelector('.rec-resp').value;
                    reportDraft.records[idx].priority = el.querySelector('.rec-priority').value;
                    reportDraft.records[idx].deadline = el.querySelector('.rec-deadline').value;
                    reportDraft.records[idx].done = !!el.querySelector('.rec-done').checked;
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

    addRecordBtn.addEventListener('click', () => {
        reportDraft.records.push({ photo: '', description: '', consequences: '', legal: '', penalties: '', responsible: '', priority: 'Media', deadline: '', done: false });
        saveDraft();
        renderRecords();
    });

    saveReportBtn.addEventListener('click', () => {
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
        const report = {
            title: finalTitle,
            month: document.getElementById('reportMonth').value,
            date: document.getElementById('reportDate').value,
            duration: document.getElementById('reportDuration').value,
            cnpj: document.getElementById('reportCNPJ').value,
            unit: document.getElementById('reportUnit').value,
            sector: document.getElementById('reportSector').value,
            references: Array.from(document.querySelectorAll('#referencesList input[type=checkbox]:checked')).map(i=>i.value),
            summary: document.getElementById('reportSummary').value,
            records: reportDraft.records,
            companyName: baseCompanyName,
            unitName: unitName,
            fullDisplayName: composedName,
            includeCompanyInUnit: includeCompany,
            createdAt: new Date().toISOString()
        };

        const all = JSON.parse(localStorage.getItem('savedReports') || '[]');
        all.push(report);
        localStorage.setItem('savedReports', JSON.stringify(all));
        localStorage.removeItem('draftReport');
        reportDraft = { records: [] };
        renderRecords();
        alert('Relatório salvo localmente.');
    });

    renderRecords();

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
            const list = JSON.parse(localStorage.getItem('generatedReports') || '[]');
            list.push(generated);
            localStorage.setItem('generatedReports', JSON.stringify(list));
            alert(`Relatório preparado (foco: ${focusType}). Título: ${title}`);
        });
    }
}

export function setupReportCompanySelectors() {
    const empresaSelect = document.getElementById('reportEmpresa');
    if (!empresaSelect) return;
    if (!document.getElementById('reportIncludeCompany')) {
        const wrapper = empresaSelect.parentElement;
        if (wrapper) {
            const toggleDiv = document.createElement('div');
            toggleDiv.style.marginTop = '4px';
            toggleDiv.innerHTML = `<label style="display:flex;align-items:center;gap:6px;font-size:.7rem;">
                <input type="checkbox" id="reportIncludeCompany" checked /> Incluir nome da empresa principal ao selecionar unidade
            </label>`;
            wrapper.appendChild(toggleDiv);
        }
    }
    (async () => {
        try {
            const m = await import('../script.js');
            if (m && m.loadCompanyHierarchyForReport) m.loadCompanyHierarchyForReport();
        } catch (e) {
            console.warn("Couldn't load company hierarchy handler from script.js", e);
        }
    })();
}
