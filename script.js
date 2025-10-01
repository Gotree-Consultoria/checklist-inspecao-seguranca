// =======================================================
// VARIÁVEIS GLOBAIS
// =======================================================

// Configuração da API
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = "http://localhost:8081";
} else {
    API_BASE_URL = "";
}

// =======================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =======================================================
import { initTopNav } from './loadComponents.js';


document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }


});

/**
 * Lida com o processo de login do usuário.
 * @param {Event} event - O evento de envio do formulário.
 */
async function handleLogin(event) {

    console.log("handleLogin foi chamada.");
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        // Substitua o alert por uma mensagem em um elemento HTML
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('jwtToken', data.token);
            localStorage.setItem('loggedInUserEmail', data.email);
            // tenta extrair role do token
            try {
                const role = extractRoleFromToken(data.token) || data.role || data.roles?.[0];
                if (role) {
                    localStorage.setItem('userRole', role);
                }
            } catch (e) {
                console.warn('Não foi possível extrair role do token', e);
            }
            // fallback: tenta buscar role se ainda não definida
            if (!localStorage.getItem('userRole')) {
                await ensureUserRole();
            }
            // Redireciona para a página de grupos após o login bem-sucedido
            const headerContainer = document.getElementById('headerPageContainer');
            if (headerContainer) {
                headerContainer.innerHTML = '';
                // injeta navbar dinâmica pós-login
                fetch('partials/navbar.html')
                  .then(r=>r.text())
                  .then(html => { headerContainer.innerHTML = html; if (typeof initTopNav === 'function') initTopNav(); });
            }
            if (typeof loadComponent === 'function') {
                loadComponent('mainContent', 'groupPage');
            } else {
                window.location.reload(); // fallback
            }
        } else {
            const errorData = await response.json();
            // Substitua o alert por uma mensagem em um elemento HTML
        }
    } catch (error) {
        // Substitua o alert por uma mensagem em um elemento HTML
        console.error('Erro no handleLogin:', error);
    }
}

// =======================================================
// UTIL: Decodificação de JWT e extração de role
// =======================================================
function decodeJwt(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(atob(payload).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

function extractRoleFromToken(token) {
    const payload = decodeJwt(token);
    if (!payload) return null;
    // Possíveis chaves comuns
    if (payload.role) return payload.role;
    if (Array.isArray(payload.roles) && payload.roles.length) return payload.roles[0];
    if (Array.isArray(payload.authorities) && payload.authorities.length) return payload.authorities[0];
    if (payload.auth) return payload.auth; // fallback genérico
    return null;
}

export function getUserRole() {
    const cached = localStorage.getItem('userRole');
    if (cached) return cached;
    const token = localStorage.getItem('jwtToken');
    const role = extractRoleFromToken(token);
    if (role) localStorage.setItem('userRole', role);
    return role;
}

// Tenta obter e armazenar a role consultando endpoints padrão
export async function ensureUserRole() {
    const existing = localStorage.getItem('userRole');
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;

    // Debug override via query string
    const forced = new URLSearchParams(window.location.search).get('forceRole');
    if (forced) { localStorage.setItem('userRole', forced.toUpperCase()); return forced.toUpperCase(); }

    // Se já temos role armazenada, validar consistência (evitar falso ADMIN)
    if (existing) {
        if (existing === 'ADMIN') {
            const payload = decodeJwt(token) || {};
            const collected = [];
            if (payload.role) collected.push(payload.role);
            if (Array.isArray(payload.roles)) collected.push(...payload.roles);
            if (Array.isArray(payload.authorities)) collected.push(...payload.authorities);
            if (payload.auth) collected.push(payload.auth);
            const hasAdmin = collected.some(r => typeof r === 'string' && r.toUpperCase().includes('ADMIN'));
            if (!hasAdmin) {
                // Verifica endpoint /users/me para confirmar ou rebaixar
                try {
                    const meResp = await fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders() });
                    if (meResp.ok) {
                        const me = await meResp.json().catch(()=>({}));
                        const roleField = (me.role || me.perfil || me.tipo || '').toString().toUpperCase();
                        if (!roleField.includes('ADMIN')) {
                            localStorage.setItem('userRole', 'USER');
                            return 'USER';
                        }
                        return 'ADMIN';
                    }
                } catch(_) { /* ignora */ }
                // Se não confirmou admin, define USER
                localStorage.setItem('userRole', 'USER');
                return 'USER';
            }
        }
        return existing;
    }

    // Deriva a partir do token
    const payload = decodeJwt(token) || {};
    let derived = null;
    const candidates = [];
    if (payload.role) candidates.push(payload.role);
    if (Array.isArray(payload.roles)) candidates.push(...payload.roles);
    if (Array.isArray(payload.authorities)) candidates.push(...payload.authorities);
    if (payload.auth) candidates.push(payload.auth);
    if (candidates.length) {
        const upper = candidates.map(r => (r||'').toString().toUpperCase());
        if (upper.some(r => r.includes('ADMIN'))) derived = 'ADMIN'; else derived = 'USER';
    }

    if (!derived) {
        // Consulta leve a /users/me para obter role
        try {
            const meResp = await fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders() });
            if (meResp.ok) {
                const me = await meResp.json().catch(()=>({}));
                const roleField = (me.role || me.perfil || me.tipo || '').toString().toUpperCase();
                derived = roleField.includes('ADMIN') ? 'ADMIN' : 'USER';
            }
        } catch(_) {}
    }

    if (!derived) derived = 'USER';
    localStorage.setItem('userRole', derived);
    return derived;
}
// ADMIN: Gestão de Usuários (frontend simples)
// =======================================================
export function initAdminPage() {
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
            const resp = await fetch(`${API_BASE_URL}/users`, { headers: authHeaders() });
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
            // Delegação para botões de exclusão
            const table = listContainer.querySelector('table');
            if (table && !table.__deleteBound) {
                table.__deleteBound = true;
                table.addEventListener('click', async (ev) => {
                    const btn = ev.target.closest('button[data-action="del-user"]');
                    if (!btn) return;
                    const userId = btn.getAttribute('data-id');
                    if (!userId) return;
                    // Evita excluir a si mesmo (opcional)
                    const me = window.__cachedUserMe;
                    if (me && me.id && String(me.id) === String(userId)) {
                        alert('Você não pode excluir seu próprio usuário.');
                        return;
                    }
                    const proceed = await confirmDialog({
                        message: 'Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.',
                        title: 'Confirmar Exclusão',
                        confirmText: 'Excluir',
                        cancelText: 'Cancelar',
                        variant: 'danger'
                    });
                    if (!proceed) return;
                    btn.disabled = true;
                    btn.textContent = 'Excluindo...';
                    try {
                        const delResp = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}`, {
                            method: 'DELETE',
                            headers: authHeaders()
                        });
                        if (!delResp.ok) {
                            const t = await delResp.text();
                            throw new Error(t || 'Falha ao excluir usuário');
                        }
                        loadUsers();
                    } catch(err) {
                        showToast(err.message || 'Erro ao excluir', 'error');
                        btn.disabled = false;
                        btn.textContent = 'Excluir';
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
        const password = document.getElementById('newUserPassword').value;
        const roleSel = document.getElementById('newUserRole').value;
        let birthDateRaw = document.getElementById('newUserBirth').value;
        let birthDate = '';
        if (birthDateRaw) {
            // Input type=date retorna yyyy-MM-dd. Backend espera dd/MM/yyyy.
            // Validar rapidamente e converter.
            const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw);
            if (isoMatch) {
                const [y,m,d] = birthDateRaw.split('-');
                birthDate = `${d}/${m}/${y}`; // dd/MM/yyyy
            } else {
                // Caso o usuário digite manualmente em outro formato, tentar normalizar se vier dd/MM/yyyy já.
                const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthDateRaw);
                if (brMatch) {
                    birthDate = birthDateRaw; // já está no formato correto
                } else {
                    birthDate = ''; // força envio vazio se inválido
                }
            }
        }
        const phone = document.getElementById('newUserPhone').value.trim();
        const cpf = document.getElementById('newUserCPF').value.trim();
        const siglaConselhoClasse = document.getElementById('newUserCouncilAcronym').value.trim();
        const conselhoClasse = document.getElementById('newUserCouncilNumber').value.trim();
        const especialidade = document.getElementById('newUserSpecialty').value.trim();
        if (!name || !email || !password) { msg.textContent = 'Preencha os campos obrigatórios.'; return; }
        try {
            const resp = await fetch(`${API_BASE_URL}/users/insert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ name, email, password, birthDate, phone, cpf, role: roleSel, siglaConselhoClasse, conselhoClasse, especialidade })
            });
            if (!resp.ok) {
                const t = await resp.text();
                throw new Error(t || 'Erro ao criar usuário');
            }
            msg.textContent = 'Usuário criado com sucesso.';
            form.reset();
            loadUsers();
        } catch (err) {
            msg.textContent = err.message;
        }
    });

    loadUsers();
    if (companiesContainer) loadCompanies(companiesContainer);
    if (document.getElementById('adminCreateCompanyForm')) {
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

        // =============================
        // Helpers CNPJ (normalizar, validar, formatar)
        // =============================
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
            if (/^(\d)\1+$/.test(str)) return false; // todos iguais
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
                const caretEnd = input.selectionEnd; // simples (não restaura perfeitamente, mas ok)
                input.value = formatCNPJ(input.value);
                input.setSelectionRange(input.value.length, input.value.length);
            });
            input.addEventListener('blur', () => {
                const val = input.value.trim();
                if (!val) {
                    input.classList.toggle('cnpj-invalid', false);
                    return;
                }
                if (!validateCNPJ(val)) {
                    input.classList.add('cnpj-invalid');
                    input.title = optional ? 'CNPJ inválido (campo opcional, pode ser limpo)' : 'CNPJ inválido';
                } else {
                    input.classList.remove('cnpj-invalid');
                    input.title = '';
                }
            });
        }

        function renderUnits() {
            if (!unitsContainerEl) return;
            unitsContainerEl.innerHTML = '';
            if (!dynamicUnits.length) {
                const empty = document.createElement('p');
                empty.className = 'empty-sub';
                empty.textContent = 'Nenhuma unidade adicionada.';
                unitsContainerEl.appendChild(empty);
                return;
            }
            dynamicUnits.forEach((u, idx) => {
                const row = document.createElement('div');
                row.className = 'unit-row';
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
                // Eventos
                row.querySelectorAll('input').forEach(inp => {
                    inp.addEventListener('input', () => {
                        const field = inp.getAttribute('data-field');
                        dynamicUnits[idx][field] = inp.value.trim();
                    });
                });
                // Aplica máscara/validação ao CNPJ da unidade (opcional)
                const cnpjInp = row.querySelector('input[data-field="cnpj"]');
                attachCnpjMask(cnpjInp, true);
                row.querySelector('.unit-remove').addEventListener('click', () => {
                    dynamicUnits.splice(idx,1);
                    renderUnits();
                });
                unitsContainerEl.appendChild(row);
            });
        }

        function renderSectors() {
            if (!sectorsContainer) return;
            sectorsContainer.innerHTML = '';
            if (!dynamicSectors.length) {
                const empty = document.createElement('p');
                empty.className = 'empty-sub';
                empty.textContent = 'Nenhum setor adicionado.';
                sectorsContainer.appendChild(empty);
                return;
            }
            dynamicSectors.forEach((s, idx) => {
                const chip = document.createElement('div');
                chip.className = 'sector-chip';
                chip.innerHTML = `<span>${s.name}</span><button type="button" data-index="${idx}" aria-label="Remover setor">×</button>`;
                chip.querySelector('button').addEventListener('click', () => {
                    dynamicSectors.splice(idx,1);
                    renderSectors();
                });
                sectorsContainer.appendChild(chip);
            });
        }

        function addUnit() {
            dynamicUnits.push({ name:'', cnpj:'' });
            renderUnits();
        }
        function addSector() {
            const val = (sectorNameInput?.value || '').trim();
            if (!val) return;
            if (dynamicSectors.some(s => s.name.toLowerCase() === val.toLowerCase())) return; // evita duplicados
            dynamicSectors.push({ name: val });
            sectorNameInput.value='';
            renderSectors();
        }

        if (addUnitBtn) addUnitBtn.addEventListener('click', addUnit);
        if (addSectorBtn) addSectorBtn.addEventListener('click', addSector);
        if (sectorNameInput) sectorNameInput.addEventListener('keydown', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); addSector(); } });

        // Render inicial
        renderUnits();
        renderSectors();

        // Aplica máscara ao CNPJ principal da empresa
        const companyCnpjInput = document.getElementById('newCompanyCnpj');
        attachCnpjMask(companyCnpjInput, false);

        companyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (companyMsg) companyMsg.textContent = '';
            const name = document.getElementById('newCompanyName').value.trim();
            const rawCnpj = document.getElementById('newCompanyCnpj').value.trim();
            const normalizedCompanyCnpj = onlyDigits(rawCnpj);
            if (!name) { if (companyMsg) companyMsg.textContent = 'Informe o nome da empresa.'; return; }
            if (!normalizedCompanyCnpj) { if (companyMsg) companyMsg.textContent = 'Informe o CNPJ da empresa.'; return; }
            if (!validateCNPJ(normalizedCompanyCnpj)) {
                if (companyMsg) companyMsg.textContent = 'CNPJ da empresa inválido.';
                return;
            }
            if (!dynamicSectors.length) { if (companyMsg) companyMsg.textContent = 'Informe ao menos um setor.'; return; }
            // Construção das unidades conforme DTO (UnitDTO: name obrigatório, cnpj opcional)
            const units = [];
            for (let i=0;i<dynamicUnits.length;i++) {
                const u = dynamicUnits[i];
                if (!(u.name && u.name.trim())) continue; // ignora sem nome
                const nm = u.name.trim();
                const rawUnitCnpj = (u.cnpj||'').trim();
                if (rawUnitCnpj) {
                    const normUnit = onlyDigits(rawUnitCnpj);
                    if (normUnit && !validateCNPJ(normUnit)) {
                        if (companyMsg) companyMsg.textContent = `CNPJ inválido na unidade "${nm}".`;
                        return; // aborta envio inteiro
                    }
                    units.push(normUnit ? { name: nm, cnpj: normUnit } : { name: nm, cnpj: null });
                } else {
                    units.push({ name: nm, cnpj: null });
                }
            }
            // Sectors: lista de strings
            const sectors = dynamicSectors.map(s => s.name.trim());
            const payload = { name, cnpj: normalizedCompanyCnpj, units, sectors };
            const submitBtn = companyForm.querySelector('button[type="submit"]');
            try {
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }
                console.log('[Company] Enviando payload DTO CompanyRequestDTO:', payload);
                const resp = await fetch(`${API_BASE_URL}/companies`, {
                    method:'POST',
                    headers:{ 'Content-Type':'application/json', ...authHeaders() },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) {
                    const t = await resp.text();
                    throw new Error(t || 'Falha ao salvar empresa');
                }
                if (companyMsg) companyMsg.textContent = 'Empresa criada com sucesso.';
                companyForm.reset();
                dynamicUnits = [];
                dynamicSectors = [];
                renderUnits();
                renderSectors();
                if (companiesContainer) loadCompanies(companiesContainer);
            } catch(err) {
                if (companyMsg) companyMsg.textContent = err.message;
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Empresa'; }
            }
        });
    }
}

async function loadCompanies(container) {
    container.textContent = 'Carregando...';
    try {
        const resp = await fetch(`${API_BASE_URL}/companies`, { headers: authHeaders() });
        if (!resp.ok) throw new Error('Falha ao carregar empresas');
        const empresas = await resp.json();
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
        container.textContent = e.message;
    }
}

function authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function escapeHtml(str) {
    return str.replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

// =======================================================
// Perfil do Usuário (/users/me)
// =======================================================
export async function fetchUserProfile(force = false) {
    // Cache leve em memória (window.__cachedUserMe)
    if (!force && window.__cachedUserMe) return window.__cachedUserMe;
    try {
        const resp = await fetch(`${API_BASE_URL}/users/me`, { headers: authHeaders() });
        if (!resp.ok) throw new Error('Falha ao carregar perfil');
        const data = await resp.json();
        window.__cachedUserMe = data;
        return data;
    } catch (e) {
        console.warn('fetchUserProfile erro:', e.message);
        return null;
    }
}


export async function renderFullProfilePage() {
    const root = document.querySelector('.profile-page');
    if (!root) return;
    const data = await fetchUserProfile();
    if (!data) return;
    // Campos alvo
    const nameEls = root.querySelectorAll('[data-prof="name"]');
    nameEls.forEach(el => el.textContent = data.name || '');
    const espEls = root.querySelectorAll('[data-prof="especialidade"]');
    espEls.forEach(el => el.textContent = data.especialidade || '');
    const emailEl = root.querySelector('[data-prof="email"]');
    if (emailEl) emailEl.textContent = data.email || '';
    const phoneEl = root.querySelector('[data-prof="phone"]');
    if (phoneEl) phoneEl.textContent = data.phone || '';
    const cpfEl = root.querySelector('[data-prof="cpf"]');
    if (cpfEl) cpfEl.textContent = data.cpf || '';
    const birthEl = root.querySelector('[data-prof="birthDate"]');
    if (birthEl) birthEl.textContent = data.birthDate || '';
    const siglaEl = root.querySelector('[data-prof="siglaConselhoClasse"]');
    if (siglaEl) siglaEl.textContent = data.siglaConselhoClasse || '';
    const regEl = root.querySelector('[data-prof="conselhoClasse"]');
    if (regEl) regEl.textContent = data.conselhoClasse || '';
    // Avatar iniciais
    const avatarInitials = root.querySelector('.avatar-initials');
    if (avatarInitials) avatarInitials.textContent = (data.name || '?').split(/\s+/).slice(0,2).map(p=>p.charAt(0).toUpperCase()).join('');
}

// =======================================================
// Logout
// =======================================================
export function performLogout() {
    try {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('loggedInUserEmail');
        window.__cachedUserMe = null;
    } catch(_) {}
}

// =======================================================
// Página AEP (Avaliação Ergonômica Preliminar) - inicialização
// =======================================================
export async function initAepPage() {
    const root = document.querySelector('.aep-page');
    if (!root) return;

    // Campos
    const companySelect = root.querySelector('#aepCompany');
    const evaluatorInput = root.querySelector('#aepEvaluator');
    const dateInput = root.querySelector('#aepDate');
    const roleInput = root.querySelector('#aepFunction');
    const risksContainer = root.querySelector('#aepRisks');

    // Preenche data padrão (hoje)
    if (dateInput) {
        const today = new Date();
        dateInput.value = today.toISOString().substring(0,10);
    }

    // Carrega perfil para avaliador
    try {
        const me = await fetchUserProfile();
        if (me && evaluatorInput) evaluatorInput.value = me.name || '';
    } catch(_) {}

    // Carregar hierarquia de empresas/unidades/setores
    await loadCompanyHierarchyForAEP();

    // Lista de fatores de risco (ergonômicos)
    const riskFactors = [
        'Trabalho em posturas incômodas ou pouco confortáveis por longos períodos',
        'Postura sentada por longos períodos',
        'Postura de pé por longos períodos',
        'Frequente deslocamento a pé durante a jornada de trabalho',
        'Trabalho com esforço físico intenso',
        'Levantamento e transporte manual de cargas ou volumes',
        'Frequente ação de puxar/empurrar cargas ou volumes',
        'Frequente execução de movimentos repetitivos',
        'Manuseio de ferramentas e/ou objetos pesados por longos períodos',
        'Exigência de uso frequente de força, pressão, preensão, flexão, extensão ou torção dos segmentos corporais',
        'Compressão de partes do corpo por superfícies rígidas ou com quinas',
        'Exigência de flexões de coluna vertebral frequentes',
        'Uso frequente de pedais',
        'Uso frequente de alavancas',
        'Exigência de elevação frequente de membros superiores',
        'Manuseio ou movimentação de cargas e volumes sem pega ou com “pega pobre”',
        'Uso frequente de escadas',
        'Trabalho intensivo com teclado ou outros dispositivos de entrada de dados',
        'Posto de trabalho improvisado',
        'Mobiliário sem meios de regulagem de ajuste',
        'Equipamentos e/ou máquinas sem meios de regulagem de ajuste ou sem condições de uso',
        'Posto de trabalho não planejado/adaptado para a posição sentada',
        'Assento inadequado',
        'Encosto do assento inadequado ou ausente',
        'Mobiliário ou equipamento sem espaço para movimentação de segmentos corporais',
        'Trabalho com necessidade de alcançar objetos, documentos, controles ou qualquer ponto além das zonas de alcance ideais para as características antropométricas do trabalhador',
        'Equipamentos ou mobiliários não adaptados à antropometria do trabalhador',
        'Condições de trabalho com níveis de pressão sonora fora dos parâmetros de conforto',
        'Condições de trabalho com índice de temperatura efetiva fora dos parâmetros de conforto',
        'Condições de trabalho com velocidade do ar fora dos parâmetros de conforto',
        'Condições de trabalho com umidade do ar fora dos parâmetros de conforto',
        'Condições de trabalho com Iluminação diurna inadequada',
        'Condições de trabalho com Iluminação noturna inadequada',
        'Presença de reflexos em telas, painéis, vidros, monitores ou qualquer superfície, que causem desconforto ou prejudiquem a visualização',
        'Piso escorregadio e/ou irregular'
    ];

    if (risksContainer) {
        risksContainer.innerHTML = riskFactors.map((rf, idx) => {
            const id = `risk_${idx}`;
            return `<tr>
                <td class="chk"><input type="checkbox" id="${id}" name="risks" value="${escapeHtml(rf)}"></td>
                <td class="tipo">ERGONÔMICO</td>
                <td class="fator"><label for="${id}">${escapeHtml(rf)}</label></td>
            </tr>`;
        }).join('');
    }
}

// =======================================================
// Função para buscar as empresas da API
// =======================================================

function carregarEmpresas() {
    // Depreciado: agora usaremos /companies. Mantido apenas para compat até remover.
    loadCompanyHierarchyForChecklist();
}

// =============================
// Carregamento hierárquico de Empresas / Unidades / Setores (endpoint /companies)
// =============================
async function fetchCompaniesHierarchy() {
    try {
        const resp = await fetch(`${API_BASE_URL}/companies`, { headers: authHeaders() });
        if (!resp.ok) throw new Error('Falha ao buscar empresas.');
        const data = await resp.json();
        if (!Array.isArray(data)) return [];
        return data.map(c => ({
            id: c.id,
            name: c.name || c.nome || 'Sem nome',
            cnpj: c.cnpj || '',
            sectors: Array.isArray(c.sectors) ? c.sectors.map(s => (s.name || s.nome || s)) : [],
            units: Array.isArray(c.units) ? c.units.map(u => ({
                id: u.id,
                name: u.name || u.nome || 'Unidade',
                cnpj: u.cnpj || '',
                sectors: Array.isArray(u.sectors) ? u.sectors.map(s => (s.name || s.nome || s)) : []
            })) : []
        }));
    } catch (e) {
        console.warn('fetchCompaniesHierarchy:', e.message);
        return [];
    }
}

// Usado por formsPage (checklist)
async function loadCompanyHierarchyForChecklist() {
    const empresaSel = document.getElementById('empresaCliente');
    const unidadeSel = document.getElementById('empresaUnidade');
    const setorSel = document.getElementById('empresaSetor');
    if (!empresaSel) return; // página não presente
    empresaSel.innerHTML = '<option value="">Carregando empresas...</option>';
    if (unidadeSel) { unidadeSel.disabled = true; unidadeSel.innerHTML = '<option value="">Selecione uma empresa primeiro</option>'; }
    if (setorSel) { setorSel.disabled = true; setorSel.innerHTML = '<option value="">Selecione uma empresa primeiro</option>'; }
    const companies = await fetchCompaniesHierarchy();
    empresaSel.innerHTML = '<option value="">Selecione a empresa</option>';
    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        opt.dataset.cnpj = c.cnpj || '';
        opt.dataset.units = JSON.stringify(c.units || []);
        opt.dataset.sectors = JSON.stringify(c.sectors || []);
        empresaSel.appendChild(opt);
    });
    empresaSel.addEventListener('change', () => {
        const sel = empresaSel.options[empresaSel.selectedIndex];
        const units = sel && sel.dataset.units ? JSON.parse(sel.dataset.units) : [];
        const sectors = sel && sel.dataset.sectors ? JSON.parse(sel.dataset.sectors) : [];
        if (unidadeSel) {
            unidadeSel.disabled = !sel || !sel.value;
            unidadeSel.innerHTML = sel && sel.value ? '<option value="">(Todas / Nenhuma)</option>' : '<option value="">Selecione uma empresa primeiro</option>';
            if (sel && sel.value) {
                units.forEach(u => {
                    const o = document.createElement('option');
                    o.value = u.id;
                    o.textContent = u.name;
                    o.dataset.cnpj = u.cnpj || '';
                    unidadeSel.appendChild(o);
                });
            }
        }
        if (setorSel) {
            setorSel.disabled = !sel || !sel.value;
            setorSel.innerHTML = sel && sel.value ? '<option value="">(Todos / Nenhum)</option>' : '<option value="">Selecione uma empresa primeiro</option>';
            if (sel && sel.value) {
                sectors.forEach(s => {
                    const os = document.createElement('option');
                    os.value = s;
                    os.textContent = s;
                    setorSel.appendChild(os);
                });
            }
        }
    });
}

// Usado por reportPage
export async function loadCompanyHierarchyForReport() {
    const empresaSel = document.getElementById('reportEmpresa');
    const unidadeSel = document.getElementById('reportUnit');
    const setorSel = document.getElementById('reportSector');
    const cnpjInput = document.getElementById('reportCNPJ');
    if (!empresaSel) return;
    empresaSel.innerHTML = '<option value="">Carregando empresas...</option>';
    if (unidadeSel) { unidadeSel.disabled = true; unidadeSel.innerHTML = '<option value="">Selecione empresa</option>'; }
    if (setorSel) { setorSel.disabled = true; setorSel.innerHTML = '<option value="">Selecione empresa</option>'; }
    const companies = await fetchCompaniesHierarchy();
    empresaSel.innerHTML = '<option value="">Selecione a empresa</option>';
    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        opt.dataset.cnpj = c.cnpj || '';
        opt.dataset.units = JSON.stringify(c.units || []);
        opt.dataset.sectors = JSON.stringify(c.sectors || []);
        empresaSel.appendChild(opt);
    });
    empresaSel.addEventListener('change', () => {
        const sel = empresaSel.options[empresaSel.selectedIndex];
        const units = sel && sel.dataset.units ? JSON.parse(sel.dataset.units) : [];
        const sectors = sel && sel.dataset.sectors ? JSON.parse(sel.dataset.sectors) : [];
        if (cnpjInput) cnpjInput.value = sel ? (sel.dataset.cnpj || '') : '';
        if (unidadeSel) {
            unidadeSel.disabled = !sel || !sel.value;
            unidadeSel.innerHTML = sel && sel.value ? '<option value="">(Todas / Nenhuma)</option>' : '<option value="">Selecione empresa</option>';
            if (sel && sel.value) {
                units.forEach(u => {
                    const o = document.createElement('option');
                    o.value = u.id;
                    o.textContent = u.name;
                    o.dataset.cnpj = u.cnpj || '';
                    unidadeSel.appendChild(o);
                });
            }
        }
        if (setorSel) {
            setorSel.disabled = !sel || !sel.value;
            setorSel.innerHTML = sel && sel.value ? '<option value="">(Todos / Nenhum)</option>' : '<option value="">Selecione empresa</option>';
            if (sel && sel.value) {
                sectors.forEach(s => {
                    const so = document.createElement('option');
                    so.value = s;
                    so.textContent = s;
                    setorSel.appendChild(so);
                });
            }
        }
    });
}

// Usado por aepPage
export async function loadCompanyHierarchyForAEP() {
    const empresaSel = document.getElementById('aepCompany');
    const unidadeSel = document.getElementById('aepUnit');
    const setorSel = document.getElementById('aepSector');
    if (!empresaSel) return;
    empresaSel.innerHTML = '<option value="">Carregando empresas...</option>';
    if (unidadeSel) { unidadeSel.disabled = true; unidadeSel.innerHTML = '<option value="">Selecione empresa</option>'; }
    if (setorSel) { setorSel.disabled = true; setorSel.innerHTML = '<option value="">Selecione empresa</option>'; }
    const companies = await fetchCompaniesHierarchy();
    empresaSel.innerHTML = '<option value="">Selecione a empresa</option>';
    companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        opt.dataset.units = JSON.stringify(c.units || []);
        opt.dataset.sectors = JSON.stringify(c.sectors || []);
        empresaSel.appendChild(opt);
    });
    empresaSel.addEventListener('change', () => {
        const sel = empresaSel.options[empresaSel.selectedIndex];
        const units = sel && sel.dataset.units ? JSON.parse(sel.dataset.units) : [];
        const sectors = sel && sel.dataset.sectors ? JSON.parse(sel.dataset.sectors) : [];
        if (unidadeSel) {
            unidadeSel.disabled = !sel || !sel.value;
            unidadeSel.innerHTML = sel && sel.value ? '<option value="">(Todas / Nenhuma)</option>' : '<option value="">Selecione empresa</option>';
            if (sel && sel.value) {
                units.forEach(u => {
                    const o = document.createElement('option');
                    o.value = u.id;
                    o.textContent = u.name;
                    unidadeSel.appendChild(o);
                });
            }
        }
        if (setorSel) {
            setorSel.disabled = !sel || !sel.value;
            setorSel.innerHTML = sel && sel.value ? '<option value="">(Todos / Nenhum)</option>' : '<option value="">Selecione empresa</option>';
            if (sel && sel.value) {
                sectors.forEach(s => {
                    const so = document.createElement('option');
                    so.value = s;
                    so.textContent = s;
                    setorSel.appendChild(so);
                });
            }
        }
    });
}


// =======================================================
// LÓGICA DE RENDERIZAÇÃO DO FORMULÁRIO E INTERATIVIDADE
// =======================================================

// Importa os dados do seu arquivo
import { checklistData } from './data.js';

// =======================================================
// FUNÇÕES DE RELATÓRIO
// =======================================================

/**
 * Renderiza o formulário de relatório e adiciona handlers para registros fotográficos,
 * captura/upload de imagens, reordenação por drag-and-drop e salvamento.
 */
export function renderReportForm() {
    const addRecordBtn = document.getElementById('addRecordBtn');
    const recordsContainer = document.getElementById('recordsContainer');
    const saveReportBtn = document.getElementById('saveReportBtn');

    if (!recordsContainer || !addRecordBtn || !saveReportBtn) return;

    // Carrega registros salvos (se houver)
    const saved = localStorage.getItem('draftReport');
    let reportDraft = saved ? JSON.parse(saved) : { records: [] };

    function renderRecords() {
        // mostra ou oculta o container dependendo se há registros
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

            // listeners
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
                // tenta usar a câmera via getUserMedia
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

            // inputs update
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

            // drag handlers
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
        // coleta dados do formulário com inteligência de composição de nome
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

    // render inicial
    renderRecords();

    // Handler para geração de relatório (foco empresa ou unidade conforme regras)
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
            // Foco: unidade se selecionada, caso contrário empresa
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
            // Armazena em localStorage (histórico de relatórios gerados)
            const list = JSON.parse(localStorage.getItem('generatedReports') || '[]');
            list.push(generated);
            localStorage.setItem('generatedReports', JSON.stringify(list));
            alert(`Relatório preparado (foco: ${focusType}). Título: ${title}`);
        });
    }
}

// Função para carregar empresas/unidades/setores no formulário de relatório
export function setupReportCompanySelectors() {
    // Recria somente toggle adicional; dados virão de loadCompanyHierarchyForReport()
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
    loadCompanyHierarchyForReport();
}

/**
 * Renderiza o formulário do checklist e adiciona os listeners de interação.
 */
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
            formContent += `
                <div class="checklist-item">
                    <p class="question-text">${item.id} - ${item.text}</p>
                    <div class="radio-options">
                        <input type="radio" id="q-${item.id}-sim" name="q-${item.id}" value="sim" required>
                        <label for="q-${item.id}-sim">Sim</label>
                        <input type="radio" id="q-${item.id}-nao" name="q-${item.id}" value="nao">
                        <label for="q-${item.id}-nao">Não</label>
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
    
    // Adiciona o evento de clique após a renderização
    addCollapsibleListeners();
    // Chama a função para carregar as empresas quando o formulário estiver pronto
    // nova hierarquia (empresa/unidade/setor)
    loadCompanyHierarchyForChecklist();
}

function addCollapsibleListeners() {
    document.querySelectorAll('.na-option input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (event) => {
            const sectionId = event.target.id.split('-')[1];
            const sectionItems = document.getElementById(`items-${sectionId}`);
            
            if (event.target.checked) {
                sectionItems.style.display = 'none';
                const radioButtons = sectionItems.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => radio.checked = false);
            } else {
                sectionItems.style.display = 'block';
            }
        });
    });
}

// Fnção acessível globalmente
window.handleLogin = handleLogin;
import { loadComponent } from './loadComponents.js';

// =======================================================
// UI UTILITIES: Modal de Confirmação & Toast
// =======================================================
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
        // Esc para cancelar
        const escHandler = (ev) => { if (ev.key === 'Escape') { cleanup(false); document.removeEventListener('keydown', escHandler);} };
        document.addEventListener('keydown', escHandler);
        requestAnimationFrame(() => overlay.classList.add('open'));
    });
}

// Expor global (opcional)
window.confirmDialog = confirmDialog;
window.showToast = showToast;