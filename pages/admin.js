import { authHeaders, fetchCompanies } from '../lib/api.js';
import { showToast, confirmDialog } from '../lib/ui.js';
import { getUserRole } from '../lib/auth.js';

export function initAdminPage() {
    console.debug('[adminPage] initAdminPage called');
    const role = getUserRole();
    if (!(role && role.toLowerCase().includes('admin'))) {
        const container = document.querySelector('.admin-page .container');
        if (container) {
            container.innerHTML = '<h1>Acesso Negado</h1><p>Você não possui permissão para acessar este painel.</p>';
        }
        return;
    }
    const form = document.getElementById('adminCreateUserForm');
    const msg = document.getElementById('adminCreateUserMsg');
    const listContainer = document.getElementById('adminUsersList');
    const companiesContainer = document.getElementById('adminCompaniesList');
    if (!form || !listContainer) return;

    async function loadUsers() {
        listContainer.textContent = 'Carregando...';
        try {
            const resp = await fetch(`${window.location.hostname.includes('localhost') ? 'http://localhost:8081' : ''}/users`, { headers: authHeaders() });
            if (!resp.ok) throw new Error('Falha ao carregar usuários');
            const users = await resp.json();
            if (!Array.isArray(users) || !users.length) { listContainer.textContent = 'Nenhum usuário.'; return; }
            const html = [`<table><thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Sigla</th><th>Conselho</th><th>Especialidade</th><th>Ações</th></tr></thead><tbody>`];
            users.forEach(u => {
                const canDelete = (u.role || '').toUpperCase() !== 'ADMIN';
                const deleteBtn = canDelete && u.id ? `<button type="button" class="btn btn-compact btn-danger" data-action="del-user" data-id="${escapeHtml(u.id.toString())}">Excluir</button>` : '';
                html.push(`<tr>
                    <td>${escapeHtml(u.name || '')}</td>
                    <td>${escapeHtml(u.email || '')}</td>
                    <td><span class=\"badge-role ${u.role==='ADMIN'?'admin':''}\">${escapeHtml(u.role || '')}</span></td>
                    <td>${escapeHtml(u.siglaConselhoClasse || u.councilAcronym || '')}</td>
                    <td>${escapeHtml(u.conselhoClasse || u.councilNumber || '')}</td>
                    <td>${escapeHtml(u.especialidade || u.specialty || '')}</td>
                    <td>${deleteBtn}</td>
                </tr>`);
            });
            html.push('</tbody></table>');
            listContainer.innerHTML = html.join('');
            const table = listContainer.querySelector('table');
            if (table && !table.__deleteBound) {
                table.__deleteBound = true;
                table.addEventListener('click', async (ev) => {
                    const btn = ev.target.closest('button[data-action="del-user"]');
                    if (!btn) return;
                    const userId = btn.getAttribute('data-id');
                    if (!userId) return;
                    const me = window.__cachedUserMe;
                    if (me && me.id && String(me.id) === String(userId)) {
                        alert('Você não pode excluir seu próprio usuário.');
                        return;
                    }
                    const proceed = await confirmDialog({ message: 'Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.', title: 'Confirmar Exclusão', confirmText: 'Excluir', cancelText: 'Cancelar', variant: 'danger' });
                    if (!proceed) return;
                    btn.disabled = true; btn.textContent = 'Excluindo...';
                    try {
                        const delResp = await fetch(`${window.location.hostname.includes('localhost') ? 'http://localhost:8081' : ''}/users/${encodeURIComponent(userId)}`, { method: 'DELETE', headers: authHeaders() });
                        if (!delResp.ok) { const t = await delResp.text(); throw new Error(t || 'Falha ao excluir usuário'); }
                        loadUsers();
                    } catch(err) {
                        showToast(err.message || 'Erro ao excluir', 'error');
                        btn.disabled = false; btn.textContent = 'Excluir';
                    }
                });
            }
        } catch (e) {
            listContainer.textContent = e.message;
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';
        const name = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value || '';
        const roleSel = document.getElementById('newUserRole').value;
        // novos campos
        let birthDateRaw = document.getElementById('newUserBirth') ? document.getElementById('newUserBirth').value : '';
        let birthDate = null;
        if (birthDateRaw) {
            birthDateRaw = birthDateRaw.trim();
            // formatos aceitos: yyyy-MM-dd (input date), dd/MM/yyyy, ou ddMMyyyy
            if (/^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw)) {
                const [y,m,d] = birthDateRaw.split('-'); birthDate = `${d}/${m}/${y}`;
            } else if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(birthDateRaw)) {
                birthDate = birthDateRaw;
            } else if (/^\d{8}$/.test(birthDateRaw)) {
                // exemplo 06081994 -> 06/08/1994
                birthDate = `${birthDateRaw.slice(0,2)}/${birthDateRaw.slice(2,4)}/${birthDateRaw.slice(4,8)}`;
            }
        }
        const phone = document.getElementById('newUserPhone') ? document.getElementById('newUserPhone').value.trim() : '';
        const cpf = document.getElementById('newUserCPF') ? document.getElementById('newUserCPF').value.trim() : '';
        const siglaConselhoClasse = document.getElementById('newUserCouncilAcronym') ? document.getElementById('newUserCouncilAcronym').value.trim() : '';
        const conselhoClasse = document.getElementById('newUserCouncilNumber') ? document.getElementById('newUserCouncilNumber').value.trim() : '';
        const especialidade = document.getElementById('newUserSpecialty') ? document.getElementById('newUserSpecialty').value.trim() : '';

        // validações básicas compatíveis com UserRequestDTO
        if (!name) { msg.textContent = 'Nome é obrigatório.'; return; }
        if (!email) { msg.textContent = 'Email é obrigatório.'; return; }
        const simpleEmailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!simpleEmailRe.test(email)) { msg.textContent = 'Email em formato inválido.'; return; }
        if (!password) { msg.textContent = 'Senha é obrigatória.'; return; }
        if (password.length < 8) { msg.textContent = 'Senha deve ter no mínimo 8 caracteres.'; return; }
        if (!birthDate) { msg.textContent = 'Data de nascimento obrigatória (use dd/MM/yyyy ou ddMMyyyy).'; return; }
        if (!phone || phone.replace(/\D/g,'').length < 8 || phone.replace(/\D/g,'').length > 20) { msg.textContent = 'Telefone inválido (8-20 dígitos).'; return; }
        if (!cpf || cpf.replace(/\D/g,'').length === 0) { msg.textContent = 'CPF é obrigatório.'; return; }

        // normalizar cpf/phone para apenas dígitos antes de enviar
        const normalizedCpf = cpf.replace(/\D/g,'');
        const normalizedPhone = phone.replace(/\D/g,'');

        const payload = { name, email, password, birthDate, phone: normalizedPhone, cpf: normalizedCpf, role: roleSel || null, siglaConselhoClasse, conselhoClasse, especialidade };
        console.debug('[adminPage] creating user payload:', payload);

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

        try {
            const resp = await fetch(`${window.location.hostname.includes('localhost') ? 'http://localhost:8081' : ''}/users/insert`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(payload) });
            const respText = await resp.text().catch(()=>'');
            console.debug('[adminPage] create user response:', resp.status, respText);
            if (!resp.ok) { throw new Error(respText || `Erro ao criar usuário (status ${resp.status})`); }
            msg.textContent = 'Usuário criado com sucesso.'; form.reset(); loadUsers();
        } catch (err) { console.error('[adminPage] create user error', err); msg.textContent = err.message || String(err); }
        finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Usuário'; } }
    });

    loadUsers();
        // Montar formulário de criação de empresa (unidades e setores dinâmicos)
        if (document.getElementById('adminCreateCompanyForm')) {
            console.debug('[adminPage] company form present, wiring dynamic unit handlers');
        const companyForm = document.getElementById('adminCreateCompanyForm');
        const companyMsg = document.getElementById('adminCreateCompanyMsg');
        // Estado dinâmico
        const unitsContainerEl = document.getElementById('companyUnitsContainer');
        const addUnitBtn = document.getElementById('addCompanyUnitBtn');
        const sectorNameInput = document.getElementById('sectorNameInput');
        const addSectorBtn = document.getElementById('addSectorBtn');
        const sectorsContainer = document.getElementById('companySectorsContainer');
        let dynamicUnits = []; // { id, name, cnpj }
        let dynamicSectors = []; // { id, name }

        function onlyDigits(v) { return (v||'').replace(/\D+/g,''); }
        function formatCNPJ(v) {
            const d = onlyDigits(v).slice(0,14);
            if (!d) return '';
            let out = d;
            if (d.length > 2) out = d.slice(0,2)+'.'+d.slice(2);
            if (d.length > 5) out = out.slice(0,6)+'.'+out.slice(6);
            if (d.length > 8) out = out.slice(0,10)+'/'+out.slice(10);
            if (d.length > 12) out = out.slice(0,15)+'-'+out.slice(15);
            return out;
        }
        function validateCNPJ(cnpj) {
            const str = onlyDigits(cnpj);
            if (str.length !== 14) return false;
            if (/^(\d)\1+$/.test(str)) return false;
            const calc = (base) => {
                let factor = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
                const sum = base.split('').reduce((acc, cur, idx) => acc + parseInt(cur,10)*factor[idx], 0);
                const mod = sum % 11;
                return (mod < 2) ? 0 : 11 - mod;
            };
            const d1 = calc(str.slice(0,12));
            const d2 = calc(str.slice(0,12)+d1);
            return str.endsWith(String(d1)+String(d2));
        }
        function attachCnpjMask(input, optional=false) {
            if (!input) return;
            input.addEventListener('input', () => {
                input.value = formatCNPJ(input.value);
                input.setSelectionRange(input.value.length, input.value.length);
            });
            input.addEventListener('blur', () => {
                const val = input.value.trim();
                if (!val) { input.classList.toggle('cnpj-invalid', false); return; }
                if (!validateCNPJ(val)) { input.classList.add('cnpj-invalid'); input.title = optional ? 'CNPJ inválido (campo opcional, pode ser limpo)' : 'CNPJ inválido'; }
                else { input.classList.remove('cnpj-invalid'); input.title = ''; }
            });
        }

        function renderUnits() {
            if (!unitsContainerEl) return;
            unitsContainerEl.innerHTML = '';
            if (!dynamicUnits.length) {
                const empty = document.createElement('p'); empty.className = 'empty-sub'; empty.textContent = 'Nenhuma unidade adicionada.'; unitsContainerEl.appendChild(empty); return;
            }
            dynamicUnits.forEach((u, idx) => {
                const row = document.createElement('div'); row.className = 'unit-row';
                row.innerHTML = `
                    <div class="fg">
                      <label>Nome</label>
                      <input type="text" data-field="name" value="${u.name || ''}" placeholder="Nome da unidade" />
                    </div>
                    <div class="fg">
                      <label>CNPJ (opcional)</label>
                      <input type="text" data-field="cnpj" value="${u.cnpj || ''}" placeholder="CNPJ da unidade (se houver)" />
                    </div>
                    <button type="button" class="unit-remove" data-index="${idx}" aria-label="Remover unidade">&times;</button>
                `;
                row.querySelectorAll('input').forEach(inp => {
                    inp.addEventListener('input', () => {
                        const field = inp.getAttribute('data-field'); dynamicUnits[idx][field] = inp.value.trim();
                    });
                });
                const cnpjInp = row.querySelector('input[data-field="cnpj"]'); attachCnpjMask(cnpjInp, true);
                row.querySelector('.unit-remove').addEventListener('click', () => { dynamicUnits.splice(idx,1); renderUnits(); });
                unitsContainerEl.appendChild(row);
            });
        }

        function renderSectors() {
            if (!sectorsContainer) return; sectorsContainer.innerHTML = '';
            if (!dynamicSectors.length) { const empty = document.createElement('p'); empty.className = 'empty-sub'; empty.textContent = 'Nenhum setor adicionado.'; sectorsContainer.appendChild(empty); return; }
            dynamicSectors.forEach((s, idx) => {
                const chip = document.createElement('div'); chip.className = 'sector-chip'; chip.innerHTML = `<span>${s.name}</span><button type="button" data-index="${idx}" aria-label="Remover setor">×</button>`;
                chip.querySelector('button').addEventListener('click', () => { dynamicSectors.splice(idx,1); renderSectors(); }); sectorsContainer.appendChild(chip);
            });
        }

        function addUnit() { console.debug('[adminPage] addUnit invoked'); dynamicUnits.push({ name:'', cnpj:'' }); renderUnits(); }
        function addSector() { const val = (sectorNameInput?.value || '').trim(); if (!val) return; if (dynamicSectors.some(s => s.name.toLowerCase() === val.toLowerCase())) return; dynamicSectors.push({ name: val }); sectorNameInput.value=''; renderSectors(); }

        if (addUnitBtn) { console.debug('[adminPage] addUnitBtn present (delegation used)', addUnitBtn); }
            // Delegation: garante captura mesmo se o botão for re-renderizado
            if (companyForm && !companyForm.__unitDelegation) {
                companyForm.__unitDelegation = true;
                companyForm.addEventListener('click', (e) => {
                    const btn = e.target.closest('#addCompanyUnitBtn, .add-unit-btn');
                    if (!btn) return;
                    e.preventDefault();
                    addUnit();
                });
            }
        if (addSectorBtn) addSectorBtn.addEventListener('click', addSector);
        if (sectorNameInput) sectorNameInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); addSector(); } });

        renderUnits(); renderSectors();

        const companyCnpjInput = document.getElementById('newCompanyCnpj'); attachCnpjMask(companyCnpjInput, false);

        companyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (companyMsg) companyMsg.textContent = '';
            const name = (document.getElementById('newCompanyName')?.value || '').trim();
            const rawCnpj = (document.getElementById('newCompanyCnpj')?.value || '').trim();
            const normalizedCompanyCnpj = onlyDigits(rawCnpj);

            if (!name) {
                if (companyMsg) companyMsg.textContent = 'Informe o nome da empresa.';
                return;
            }
            if (!normalizedCompanyCnpj) {
                if (companyMsg) companyMsg.textContent = 'Informe o CNPJ da empresa.';
                return;
            }
            if (!validateCNPJ(normalizedCompanyCnpj)) {
                if (companyMsg) companyMsg.textContent = 'CNPJ inválido.';
                return;
            }
            if (!dynamicSectors.length) {
                if (companyMsg) companyMsg.textContent = 'Informe ao menos um setor.';
                return;
            }

            const units = [];
            for (let i = 0; i < dynamicUnits.length; i++) {
                const u = dynamicUnits[i];
                if (!(u.name && u.name.trim())) continue;
                const nm = u.name.trim();
                const rawUnitCnpj = (u.cnpj || '').trim();
                if (rawUnitCnpj) {
                    const normUnit = onlyDigits(rawUnitCnpj);
                    if (normUnit && !validateCNPJ(normUnit)) {
                        if (companyMsg) companyMsg.textContent = `CNPJ inválido na unidade "${nm}".`;
                        return;
                    }
                    units.push(normUnit ? { name: nm, cnpj: normUnit } : { name: nm, cnpj: null });
                } else {
                    units.push({ name: nm, cnpj: null });
                }
            }

            const sectors = dynamicSectors.map(s => s.name.trim());
            const payload = { name, cnpj: normalizedCompanyCnpj, units, sectors };
            const submitBtn = companyForm.querySelector('button[type="submit"]');

            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }
                const base = window.location.hostname.includes('localhost') ? 'http://localhost:8081' : '';
                const resp = await fetch(`${base}/companies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...authHeaders() },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) {
                    const t = await resp.text();
                    throw new Error(t || 'Falha ao salvar empresa');
                }
                if (companyMsg) companyMsg.textContent = 'Empresa criada com sucesso.';
                companyForm.reset(); dynamicUnits = []; dynamicSectors = []; renderUnits(); renderSectors();
                if (companiesContainer) loadCompanies(companiesContainer);
            } catch (err) {
                if (companyMsg) companyMsg.textContent = err.message;
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Empresa'; }
            }
        });

        if (companiesContainer) loadCompanies(companiesContainer);
    }
}

function escapeHtml(str) { return (str||'').replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }

async function loadCompanies(container) {
    container.textContent = 'Carregando...';
    try {
        const empresas = await fetchCompanies();
        if (!Array.isArray(empresas) || !empresas.length) { container.textContent = 'Nenhuma empresa cadastrada.'; return; }
        const blocks = empresas.map(emp => {
            const nome = escapeHtml(emp.name || emp.nome || emp.razaoSocial || 'Sem nome');
            const unidades = Array.isArray(emp.units) ? emp.units : (Array.isArray(emp.unidades) ? emp.unidades : []);
            const setoresDiretos = Array.isArray(emp.sectors) ? emp.sectors : (Array.isArray(emp.setores) ? emp.setores : []);
            const unidadesList = unidades.length ? unidades.map(u => {
                const setores = Array.isArray(u.sectors) ? u.sectors : (Array.isArray(u.setores) ? u.setores : []);
                const setoresHtml = setores.length ? `<ul class="emp-setores">${setores.map(s => `<li>${escapeHtml(s.name || s.nome || s)}</li>`).join('')}</ul>` : '<p class="empty-sub">Sem setores</p>';
                return `<li class="emp-unidade"><strong>${escapeHtml(u.name || u.nome || 'Unidade')}</strong>${setoresHtml}</li>`;
            }).join('') : '<p class="empty-sub">Sem unidades</p>';
            const setoresDiretosHtml = setoresDiretos.length ? `<div class="empresa-direta-setores"><p><strong>Setores:</strong></p><ul class="emp-setores">${setoresDiretos.map(s => `<li>${escapeHtml(s.name || s.nome || s)}</li>`).join('')}</ul></div>` : '';
            return `<div class="empresa-bloco">
                <h3 class="empresa-nome">${nome}</h3>
                <div class="empresa-detalhes">
                  <p><strong>Unidades:</strong></p>
                  ${unidades.length ? `<ul class="emp-unidades">${unidadesList}</ul>` : unidadesList}
                  ${setoresDiretosHtml}
                </div>
            </div>`;
        });
        container.innerHTML = blocks.join('');
    } catch (e) {
        container.textContent = e.message || 'Erro ao carregar empresas';
    }
}

export default { initAdminPage };
