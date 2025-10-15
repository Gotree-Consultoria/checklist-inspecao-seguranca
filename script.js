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
        const password = document.getElementById('newUserPassword').value || '';
        const roleSel = document.getElementById('newUserRole').value;
        let birthDateRaw = document.getElementById('newUserBirth').value;
        let birthDate = null;
        if (birthDateRaw) {
            // Input type=date retorna yyyy-MM-dd. Backend espera dd/MM/yyyy.
            const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw);
            if (isoMatch) {
                const [y,m,d] = birthDateRaw.split('-');
                birthDate = `${d}/${m}/${y}`; // dd/MM/yyyy
            } else {
                const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthDateRaw);
                if (brMatch) birthDate = birthDateRaw; // já está no formato correto
            }
        }
        const phone = document.getElementById('newUserPhone').value.trim();
        const cpf = document.getElementById('newUserCPF').value.trim();
        const siglaConselhoClasse = document.getElementById('newUserCouncilAcronym').value.trim();
        const conselhoClasse = document.getElementById('newUserCouncilNumber').value.trim();
        const especialidade = document.getElementById('newUserSpecialty').value.trim();

    // Validações conforme UserRequestDTO
        if (!name) { msg.textContent = 'Nome é obrigatório.'; return; }
        if (!email) { msg.textContent = 'Email é obrigatório.'; return; }
    // validação simples de formato de email para reduzir requests desnecessários
    const simpleEmailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!simpleEmailRe.test(email)) { msg.textContent = 'Email em formato inválido.'; return; }
        if (!password) { msg.textContent = 'Senha é obrigatória.'; return; }
        if (password.length < 8) { msg.textContent = 'Senha deve ter no mínimo 8 caracteres.'; return; }
        if (!birthDate) { msg.textContent = 'Data de nascimento obrigatória (formato dd/MM/yyyy).'; return; }
        if (!phone || phone.length < 8 || phone.length > 20) { msg.textContent = 'Telefone inválido (8-20 caracteres).'; return; }
        if (!cpf) { msg.textContent = 'CPF é obrigatório.'; return; }

    // Preparar payload: role pode ser enum nome ou null
    const payload = { name, email, password, birthDate, phone, cpf, role: roleSel || null, siglaConselhoClasse, conselhoClasse, especialidade };

    // debug: log payload antes de enviar (ajuda a ver o formato enviado ao backend)
    console.debug('[adminCreateUser] payload:', payload);

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...'; }

        try {
            const resp = await fetch(`${API_BASE_URL}/users/insert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(payload)
            });
            // debug: mostrar status e corpo para diagnóstico
            const respText = await resp.text().catch(() => '');
            console.debug('[adminCreateUser] response status:', resp.status, 'body:', respText);
            if (!resp.ok) {
                throw new Error(respText || `Erro ao criar usuário (status ${resp.status})`);
            }
            msg.textContent = 'Usuário criado com sucesso.';
            form.reset();
            loadUsers();
        } catch (err) {
            // mostrar texto de erro retornado pelo backend para facilitar correção
            msg.textContent = err.message || String(err);
            console.error('[adminCreateUser] erro:', err);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar Usuário'; }
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
// initAepPage foi movido para `pages/aep.js` para modularização.
// Mantemos um stub que delega dinamicamente ao novo módulo para
// compatibilidade com chamadas existentes que importam initAepPage de script.js.
export async function initAepPage() {
    try {
        const mod = await import('./pages/aep.js');
        if (mod && mod.initAepPage) return mod.initAepPage();
    } catch (e) {
        console.warn('Falha ao delegar initAepPage para pages/aep.js', e);
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
            // normalize sectors to objects { id, name }
            sectors: Array.isArray(c.sectors) ? c.sectors.map(s => {
                if (s && typeof s === 'object') return { id: s.id || null, name: s.name || s.nome || '' };
                return { id: null, name: (s || '') };
            }) : [],
            units: Array.isArray(c.units) ? c.units.map(u => ({
                id: u.id,
                name: u.name || u.nome || 'Unidade',
                cnpj: u.cnpj || '',
                sectors: Array.isArray(u.sectors) ? u.sectors.map(s => {
                    if (s && typeof s === 'object') return { id: s.id || null, name: s.name || s.nome || '' };
                    return { id: null, name: (s || '') };
                }) : []
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
        // preencher automaticamente o CNPJ conforme a empresa selecionada
        try {
            const cnpjInput = document.getElementById('empresaCnpj');
            const companyCnpj = sel && sel.dataset && sel.dataset.cnpj ? sel.dataset.cnpj : '';
            if (cnpjInput) cnpjInput.value = companyCnpj || '';
        } catch (e) {
            // silencioso - evita quebrar se elemento ausente
        }
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
                    // Adiciona a opção APENAS se existir um ID válido
                    if (s && s.id != null) { 
                        const os = document.createElement('option');
                        os.value = s.id; // Garante que é o ID
                        os.textContent = s.name;
                        setorSel.appendChild(os);
                    }
                });
            }
        }
    });
    // Preenche automaticamente o responsável com o usuário logado (se disponível)
    (async () => {
        try {
            const me = await fetchUserProfile();
            const respInput = document.getElementById('responsavel');
            const siglaInput = document.getElementById('responsavelSigla');
            const regInput = document.getElementById('responsavelRegistro');
            if (me) {
                if (respInput && !respInput.value) respInput.value = me.name || '';
                if (siglaInput && !siglaInput.value) siglaInput.value = me.siglaConselhoClasse || me.councilAcronym || '';
                if (regInput && !regInput.value) regInput.value = me.conselhoClasse || me.councilNumber || '';
                return;
            }
            // Fallback: tentar derivar do token JWT ou do localStorage
            const token = localStorage.getItem('jwtToken');
            let payload = null;
            if (token) payload = decodeJwt(token);
            const candidateName = (payload && (payload.name || payload.preferred_username || payload.given_name || payload.sub)) || localStorage.getItem('loggedInUserEmail') || '';
            if (respInput && !respInput.value && candidateName) respInput.value = candidateName;
            // sem dados confiáveis para sigla/registro no token - deixamos em branco
        } catch (e) {
            // silencioso
        }
    })();
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
                    so.value = s && s.id ? s.id : (s || '');
                    so.textContent = s && s.name ? s.name : (s || '');
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
                    so.value = s && s.id ? s.id : (s || '');
                    so.textContent = s && s.name ? s.name : (s || '');
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
    
    // Adiciona o evento de clique após a renderização
    addCollapsibleListeners();
    // listeners para checkbox 'Não se Aplica' de cada item
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
                radioButtons.forEach(radio => { radio.checked = false; radio.disabled = true; radio.removeAttribute('required'); });
            } else {
                sectionItems.style.display = 'block';
                const radioButtons = sectionItems.querySelectorAll('input[type="radio"]');
                radioButtons.forEach(radio => { radio.disabled = false; radio.setAttribute('required','required'); });
            }
        });
    });
}

// Fnção acessível globalmente
window.handleLogin = handleLogin;
import { loadComponent } from './loadComponents.js';

// =======================================================
// Submissão do Checklist - fluxo de salvar e depois baixar PDF
// =======================================================
async function handleChecklistSubmit(event) {
    // Abrir modal de assinatura em vez de enviar imediatamente
    event.preventDefault();
    const form = document.getElementById('checklistForm');
    // Desabilita validação nativa temporariamente para evitar erros do tipo
    // "An invalid form control ... is not focusable" quando muitos controles
    // estão desabilitados por "Não se Aplica".
    if (form) form.noValidate = true;
    console.log('[Checklist] handleChecklistSubmit invoked');
    await openSignatureModal();
}

// Modal de assinatura: gerenciamento
let techSignaturePad = null;
let clientSignaturePad = null;

// A funcionalidade de assinatura foi movida para um módulo em modules/signature.js

async function openSignatureModal() {
    // garantir modal existe (criar fallback se necessário)
    ensureSignatureModalExists();
    // diagnóstico: logar para entender por que modal pode não estar presente
    let modal = document.getElementById('signatureModal');
    let techCanvas = document.getElementById('techSignatureCanvas');
    let clientCanvas = document.getElementById('clientSignatureCanvas');
    console.log('[Signature] trying to open modal:', { modalExists: !!modal, techCanvasExists: !!techCanvas, clientCanvasExists: !!clientCanvas });
    // fallback: às vezes os elementos estão dentro de um container injetado; tentar buscar por seletor genérico
    if (!modal) modal = document.querySelector('.modal-overlay#signatureModal') || document.querySelector('#mainContent #signatureModal') || document.querySelector('.modal-overlay');
    if (!techCanvas) techCanvas = document.querySelector('canvas#techSignatureCanvas') || document.querySelector('#signatureModal canvas.signature-canvas');
    if (!clientCanvas) clientCanvas = document.querySelector('canvas#clientSignatureCanvas') || (document.querySelectorAll('canvas.signature-canvas')[1] || null);
    if (!modal || !techCanvas || !clientCanvas) {
        console.warn('[Signature] Modal or canvases not found after fallback attempts', { modal, techCanvas, clientCanvas });
        // mostrar aviso ao usuário para diagnóstico
        showToast('Não foi possível abrir o modal de assinatura. Elementos não encontrados.', 'error');
        return;
    }
    // forçar exibição do modal (CSS usa display:flex for .modal-overlay.open)
    try {
        if (modal.parentElement !== document.body) document.body.appendChild(modal);
    } catch (_) {}
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    try { modal.classList.add('open'); } catch(_) {}
    try { modal.setAttribute('aria-hidden', 'false'); } catch(_) {}
    // garantir que canvases possam receber toque/gesto
    try { techCanvas.style.touchAction = techCanvas.style.touchAction || 'none'; clientCanvas.style.touchAction = clientCanvas.style.touchAction || 'none'; } catch(_) {}
    console.log('[Signature] modal displayed and appended to body');
    // Preencher dados do técnico automaticamente a partir do usuário logado
    try {
        const me = await fetchUserProfile();
        const techInput = document.getElementById('techName');
        const siglaInput = document.getElementById('responsavelSigla');
        const regInput = document.getElementById('responsavelRegistro');
        const mainResp = document.getElementById('responsavel');
        if (me) {
            if (techInput && !techInput.value) { techInput.value = me.name || ''; techInput.readOnly = true; }
            if (mainResp && !mainResp.value) { mainResp.value = me.name || ''; mainResp.readOnly = true; }
            if (siglaInput && !siglaInput.value) siglaInput.value = me.siglaConselhoClasse || me.councilAcronym || '';
            if (regInput && !regInput.value) regInput.value = me.conselhoClasse || me.councilNumber || '';
        } else {
            // tentar derivar do token
            const token = localStorage.getItem('jwtToken');
            if (token) {
                try {
                    const payload = decodeJwt(token) || {};
                    const candidate = payload.name || payload.preferred_username || payload.given_name || payload.sub || '';
                    const techInput2 = document.getElementById('techName');
                    if (techInput2 && !techInput2.value) { techInput2.value = candidate; techInput2.readOnly = true; }
                    if (mainResp && !mainResp.value) { mainResp.value = candidate; mainResp.readOnly = true; }
                } catch (_) {}
            }
        }
    } catch (e) {
        console.warn('Não foi possível preencher dados do técnico automaticamente', e);
    }

    // Use o módulo de assinatura (modules/signature.js) que tenta carregar a
    // biblioteca externa e fornece fallback offline.
    try {
        const mod = await import('./modules/signature.js');
        const pads = await mod.initSignaturePads(techCanvas, clientCanvas, { backgroundColor: 'rgba(255,255,255,0)', penColor: 'black' });
        techSignaturePad = pads.tech;
        clientSignaturePad = pads.client;
    } catch (e) {
        console.warn('Signature module init failed', e);
        showToast('Erro ao inicializar assinatura: ' + (e && e.message), 'error', 6000);
        const confirmBtnErr = document.getElementById('confirmSignaturesBtn');
        if (confirmBtnErr) confirmBtnErr.disabled = true;
    }
    // bind
    const clearAll = document.getElementById('clearAllSignaturesBtn');
    const clearTechBtn = document.getElementById('clearTechSignatureBtn');
    const clearClientBtn = document.getElementById('clearClientSignatureBtn');
    const confirmBtn = document.getElementById('confirmSignaturesBtn');
    const cancelBtn = document.getElementById('cancelSignaturesBtn');
    // limpar apenas a assinatura técnica
    clearTechBtn && (clearTechBtn.onclick = () => { techSignaturePad && techSignaturePad.clear(); });
    // limpar apenas a assinatura do cliente
    clearClientBtn && (clearClientBtn.onclick = () => { clientSignaturePad && clientSignaturePad.clear(); });
    // botão original limpa todas
    clearAll && (clearAll.onclick = () => { techSignaturePad && techSignaturePad.clear(); clientSignaturePad && clientSignaturePad.clear(); });
    // usar o encerramento que também restaura a validação do formulário
    cancelBtn && (cancelBtn.onclick = closeSignatureModalAndRestore);
    confirmBtn && (confirmBtn.onclick = confirmSignaturesAndSave);
}

function closeSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) modal.style.display = 'none';
    // restaurar campos de responsavel que foram tornados readonly
    try { const r = document.getElementById('responsavel'); if (r) r.readOnly = false; const t = document.getElementById('techName'); if (t) t.readOnly = false; } catch(_) {}
}

// Cria um modal de assinatura básico se não existir no DOM (fallback)
function ensureSignatureModalExists() {
    if (document.getElementById('signatureModal')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'signatureModal';
    wrapper.className = 'modal-overlay';
    wrapper.style.display = 'none';
    wrapper.innerHTML = `
        <div class="modal">
            <div class="modal-header"><h3>Assinaturas</h3></div>
            <div class="modal-body">
                <p>Por favor, colete a assinatura do Técnico e do Cliente.</p>
                <div class="sign-block">
                    <h4>Técnico</h4>
                    <div class="fg">
                        <label for="techName">Nome do Técnico</label>
                        <input type="text" id="techName" class="form-control" />
                    </div>
                    <div class="fg">
                        <label>Assinatura do Técnico</label>
                        <canvas id="techSignatureCanvas" width="600" height="150" class="signature-canvas"></canvas>
                        <div class="clear-btn-row"><button type="button" id="clearTechSignatureBtn" class="btn-secondary">Limpar Assinatura (Técnico)</button></div>
                    </div>
                </div>
                <hr />
                <div class="sign-block">
                    <h4>Cliente</h4>
                    <div class="fg">
                        <label for="clientName">Nome do Cliente</label>
                        <input type="text" id="clientName" class="form-control" />
                    </div>
                    <div class="fg">
                        <label>Assinatura do Cliente</label>
                        <canvas id="clientSignatureCanvas" width="600" height="150" class="signature-canvas"></canvas>
                        <div class="clear-btn-row"><button type="button" id="clearClientSignatureBtn" class="btn-secondary">Limpar Assinatura (Cliente)</button></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" id="clearAllSignaturesBtn" class="btn-secondary">Limpar</button>
                <button type="button" id="confirmSignaturesBtn" class="btn-submit">Confirmar e Salvar</button>
                <button type="button" id="cancelSignaturesBtn" class="btn-secondary">Cancelar</button>
            </div>
        </div>`;
    document.body.appendChild(wrapper);
}

// Garante restauração de validação ao fechar modal
function closeSignatureModalAndRestore() {
    closeSignatureModal();
    restoreFormValidation();
}

// Ao fechar o modal (cancelar ou após salvar), restaura a validação nativa
// do formulário para que o comportamento padrão volte a funcionar.
function restoreFormValidation() {
    const form = document.getElementById('checklistForm');
    if (form) form.noValidate = false;
}

async function confirmSignaturesAndSave() {
    const techName = document.getElementById('techName')?.value?.trim() || '';
    const clientName = document.getElementById('clientName')?.value?.trim() || '';
    if (!techName) { showToast('Informe o nome do técnico.', 'error'); return; }
    if (!clientName) { showToast('Informe o nome do cliente.', 'error'); return; }
    if (!techSignaturePad || techSignaturePad.isEmpty()) { showToast('Assinatura do técnico vazia. Por favor assine.', 'error'); return; }
    if (!clientSignaturePad || clientSignaturePad.isEmpty()) { showToast('Assinatura do cliente vazia. Por favor assine.', 'error'); return; }

    // Captura as assinaturas como DataURL
    const techDataUrl = techSignaturePad.toDataURL('image/png');
    const clientDataUrl = clientSignaturePad.toDataURL('image/png');

    // Extrai apenas o código Base64 da DataURL
    const techImage = techDataUrl ? techDataUrl.split(',')[1] : null;
    const clientImage = clientDataUrl ? clientDataUrl.split(',')[1] : null;

    // geolocalização (promisify)
    const geo = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve({ latitude: null, longitude: null });
        navigator.geolocation.getCurrentPosition(pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }), err => resolve({ latitude: null, longitude: null }), { timeout: 10000 });
    });

    // coleta os demais dados do formulário
    const empresa = document.getElementById('empresaCliente')?.value || null;
    const unidade = document.getElementById('empresaUnidade')?.value || null;
    const setor = document.getElementById('empresaSetor')?.value || null;
    const dataInspecao = document.getElementById('dataInspecao')?.value || '';
    const local = document.getElementById('localInspecao')?.value || '';
    const anotacoes = document.getElementById('anotacoes')?.value || '';
    const observacoes = document.getElementById('observacoes')?.value || '';
    const title = document.getElementById('reportTitle')?.value?.trim() || `Checklist ${new Date().toLocaleDateString()}`;
    // Ler tipo de documento (de acordo com enum do backend). Se não existir, usar CHECKLIST_INSPECAO
    const docType = (document.getElementById('reportType')?.value) ? document.getElementById('reportType').value : 'CHECKLIST_INSPECAO';
    const responsavel = document.getElementById('responsavel')?.value || '';
    const responsavelSigla = document.getElementById('responsavelSigla')?.value || '';
    const responsavelRegistro = document.getElementById('responsavelRegistro')?.value || '';

    // LÓGICA ATUALIZADA PARA COLETAR SEÇÕES E ITENS
    const sections = [];
    document.querySelectorAll('.section-container').forEach(sectionEl => {
        const sectionTitle = sectionEl.querySelector('.section-title')?.textContent?.trim() || 'Seção sem título';
        const isSectionNa = sectionEl.querySelector('.na-option input[type="checkbox"]')?.checked || false;

        const items = [];
        sectionEl.querySelectorAll('.checklist-item').forEach(itemEl => {
            const idTxt = itemEl.querySelector('.question-text')?.textContent?.trim() || '';
            const radios = itemEl.querySelectorAll('input[type="radio"]');
            let checked = null;
            radios.forEach(r => { if (r.checked) checked = (r.value === 'sim'); });
            const isItemNa = itemEl.querySelector('.item-na-checkbox')?.checked || false;

            items.push({ 
                description: idTxt, 
                checked: isItemNa ? false : !!checked, 
                na: isItemNa 
            });
        });

        sections.push({
            title: sectionTitle,
            na: isSectionNa,
            items: items
        });
    });

    const payload = {
        title: title,
        // O campo 'type' não existe no seu DTO, então foi removido.
        companyId: empresa,
        unitId: unidade,
        sectorId: setor, // LEMBRE-SE: Este valor deve ser um NÚMERO (ID), não texto.
        inspectionDate: dataInspecao,
        local: local,
        responsavelSigla: responsavelSigla,
        responsavelRegistro: responsavelRegistro,
        notes: anotacoes,
        observations: observacoes,
        sections: sections,
    

        // Objeto de assinatura do técnico CORRIGIDO (só a imagem)
        technicianSignature: {
            imageBase64: techImage 
        },

        // Objeto de assinatura do cliente CORRIGIDO (com todos os campos)
        clientSignature: {
            signerName: clientName,
            imageBase64: clientImage,
            latitude: geo.latitude,
            longitude: geo.longitude
        },
        
        // Campo booleano adicionado conforme o DTO
        useDigitalSignature: false
    };

    // validação mínima antes do envio
    if (!clientName || !clientImage) {
        showToast('Nome do cliente e assinatura são obrigatórios antes de salvar.', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Prosseguir para Assinatura'; }
        return;
    }

    // Envio final para novo endpoint /inspection-reports
    const submitBtn = document.getElementById('submitChecklistBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }
    try {
        // construir query/headers como JSON POST
        const resp = await fetch(`${API_BASE_URL}/inspection-reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            const body = await resp.json().catch(()=>({}));
            const reportId = body.reportId || body.id || null;
            showToast('Relatório salvo com sucesso. Você pode visualizá-lo em Documentos.', 'success');
            // opcional: armazenar no localStorage para histórico local
            const all = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
            all.push({ id: reportId, title: payload.title, type: payload.type, companyId: payload.companyId, createdAt: new Date().toISOString() });
            localStorage.setItem('savedInspectionReports', JSON.stringify(all));
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Finalizado'; }
            // fechar modal e restaurar validação
            closeSignatureModalAndRestore();
        } else {
            const txt = await resp.text();
            throw new Error(txt || 'Falha ao salvar relatório');
        }
    } catch (e) {
        showToast(e.message || 'Erro ao salvar relatório', 'error');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Prosseguir para Assinatura'; }
        // restaura validação mesmo em erro
        restoreFormValidation();
    }
}

async function handleDownloadPdf(reportId) {
    if (!reportId) return showToast('ReportId inválido', 'error');
    try {
        const resp = await fetch(`${API_BASE_URL}/reports/download/${encodeURIComponent(reportId)}`, {
            method: 'GET',
            headers: { ...authHeaders() }
        });
        if (!resp.ok) throw new Error('Falha ao baixar PDF');
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `checklist-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showToast('Download iniciado.', 'success');
    } catch (e) {
        showToast(e.message || 'Erro ao baixar PDF', 'error');
    }
}

// Expor globalmente para o onsubmit do formulário
window.handleChecklistSubmit = handleChecklistSubmit;
window.handleDownloadPdf = handleDownloadPdf;
// Exportar referências para módulos que importam estas funções
export { loadCompanyHierarchyForChecklist, openSignatureModal, handleChecklistSubmit, handleDownloadPdf };

// =======================================================
// Documentos: carregar lista e aplicar filtros
// =======================================================
export async function loadDocumentsList() {
    const container = document.querySelector('.documents-table-container tbody');
    if (!container) return;
    container.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    // coletar filtros da UI
    const q = document.getElementById('search-input')?.value?.trim() || '';
    const type = document.getElementById('type-filter')?.value || 'all';
    const date = document.getElementById('date-filter')?.value || '';
    // Tentar buscar do backend /inspection-reports com query params, se falhar usar localStorage
    try {
        const params = new URLSearchParams();
    if (q) params.set('title', q);
        if (type && type !== 'all') params.set('type', type);
        if (date) params.set('date', date);
        const url = `${API_BASE_URL}/inspection-reports${params.toString()?('?'+params.toString()):''}`;
        const resp = await fetch(url, { headers: authHeaders() });
        if (resp.ok) {
            const list = await resp.json();
            renderDocumentsListRows(list, container);
            // sincronizar localStorage: remover cópias locais obsoletas que não existem mais no servidor
            try {
                const serverIds = new Set((list||[]).map(it => String(it.id || it.reportId || '')).filter(Boolean));
                const localAll = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
                const newLocal = localAll.filter(x => {
                    const xid = String(x.id || x.reportId || '');
                    // manter rascunhos (sem id) ou registros que o servidor também retorna
                    return !xid || serverIds.has(xid);
                });
                if (JSON.stringify(newLocal) !== JSON.stringify(localAll)) {
                    localStorage.setItem('savedInspectionReports', JSON.stringify(newLocal));
                }
            } catch (e) {
                console.warn('sync local savedInspectionReports failed', e && e.message);
            }
            return;
        }
    } catch (e) {
        console.warn('fetch inspection-reports failed', e.message);
    }
    // fallback localStorage: servidor indisponível -> mostrar apenas rascunhos locais (sem id)
    const local = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
    // manter apenas entradas sem id (rascunhos) para evitar exibir itens que não existem mais no servidor
    const drafts = local.filter(it => !(it.id || it.reportId));
    const filtered = drafts.filter(it => {
        if (q) {
            const qL = q.toLowerCase();
            const title = (it.title||'').toLowerCase();
            const comp = (it.companyName||'').toLowerCase();
            if (!title.includes(qL) && !comp.includes(qL)) return false;
        }
        if (type && type !== 'all' && it.type && it.type !== type) return false;
        if (date && it.createdAt && !(it.createdAt.startsWith(date))) return false;
        return true;
    });
    showToast('Servidor indisponível — exibindo apenas rascunhos locais.', 'info', 5000);
    renderDocumentsListRows(filtered, container);
}

// Carrega histórico para a página de gerenciamento (groupPage)
export async function loadHistoryForGroupPage(limit = 10) {
    const tbody = document.getElementById('groupHistoryTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
        const resp = await fetch(`${API_BASE_URL}/inspection-reports/latest`, { headers: authHeaders() });
        if (!resp.ok) throw new Error('Nenhum histórico disponível');
        const data = await resp.json();
        // aceitar tanto array quanto objeto único
        const items = Array.isArray(data) ? data : (data ? [data] : []);
        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum histórico encontrado.</td></tr>';
            return;
        }
        tbody.innerHTML = items.slice(0, limit).map(item => {
            const typeRaw = item.type || item.documentType || '';
            const type = escapeHtml(formatDocumentType(typeRaw));
            const title = escapeHtml(item.title || item.type || 'Documento');
            const company = escapeHtml(item.companyName || item.company || '');
            const date = escapeHtml(formatDateToBrazil(item.inspectionDate || item.createdAt || '')) || '';
            const idRaw = item.id || item.reportId || '';
            const id = encodeURIComponent(idRaw);
            const viewBtn = id ? `<button type="button" data-id="${idRaw}" class="btn-visual-pdf btn-view-doc">Visualizar</button>` : '<em>Sem link</em>';
            const downloadBtn = id ? `<button type="button" data-id="${idRaw}" class="btn-primary btn-download-doc">Baixar</button>` : '';
            return `<tr data-doc-id="${idRaw}"><td>${type}</td><td>${title}</td><td>${company}</td><td>${date}</td><td>${downloadBtn} ${viewBtn}</td></tr>`;
        }).join('');
        // bind download/view handlers for group history table
        tbody.querySelectorAll('.btn-download-doc').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = btn.dataset.id;
                if (!id) return showToast('ID do documento ausente', 'error');
                try {
                    const resp = await fetch(`${API_BASE_URL}/reports/download/${encodeURIComponent(id)}`, { headers: authHeaders() });
                    if (resp.ok) {
                        const blob = await resp.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a'); link.href = url; link.download = `document-${id}.pdf`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
                        return;
                    }
                } catch (_) {}
                showToast('Não foi possível obter PDF do documento.', 'error');
            });
        });
        tbody.querySelectorAll('.btn-view-doc').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const id = btn.dataset.id;
                if (!id) return showToast('ID do documento ausente', 'error');
                try {
                    const resp = await fetch(`${API_BASE_URL}/reports/download/${encodeURIComponent(id)}`, { headers: authHeaders() });
                    if (!resp.ok) throw new Error('Erro ao obter PDF');
                    const blob = await resp.blob();
                    showPdfModal(blob);
                } catch (err) {
                    console.error('Visualizar (group) falhou', err);
                    showToast('Não foi possível carregar PDF para visualização.', 'error');
                }
            });
        });
    } catch (e) {
        console.warn('loadHistoryForGroupPage failed', e && e.message);
        tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar histórico.</td></tr>';
    }
}

// Formata o tipo de documento para rótulo legível
export function formatDocumentType(type) {
    if (!type) return 'Documento';
    const t = String(type).toUpperCase();
    switch (t) {
        case 'CHECKLIST_INSPECAO': return 'Check-List de Inspeção de Segurança';
        case 'RELATORIO_VISITA': return 'Relatório de Visita Técnica';
        case 'AEP': return 'Avaliação Ergônomica Preliminar (AEP)';
        default: return (type && String(type)) || 'Documento';
    }
}

// Formata string de data ISO (YYYY-MM-DD ou ISO full) para DD/MM/YYYY
export function formatDateToBrazil(dateStr) {
    if (!dateStr) return '';
    try {
        const s = String(dateStr).trim();
        // extrair a parte YYYY-MM-DD se for ISO
        const match = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, y, m, d] = match;
            return `${d}/${m}/${y}`;
        }
        // tentar criar Date e formatar
        const dt = new Date(s);
        if (!isNaN(dt.getTime())) {
            const dd = String(dt.getDate()).padStart(2,'0');
            const mm = String(dt.getMonth()+1).padStart(2,'0');
            const yy = dt.getFullYear();
            return `${dd}/${mm}/${yy}`;
        }
        return s;
    } catch (e) { return '' + dateStr; }
}

// Bind simples do filtro (botão) presente na documentsPage
export function bindDocumentsFilters() {
    const btn = document.getElementById('documentsFilterBtn');
    if (!btn) return;
    btn.addEventListener('click', () => loadDocumentsList());
}

function renderDocumentsListRows(list, container) {
    if (!Array.isArray(list) || !list.length) {
        container.innerHTML = '<tr><td colspan="5">Nenhum documento encontrado.</td></tr>';
        return;
    }
    // dedupe: evitar duplicação entre dados do servidor e registros locais
    const normalized = [];
    const seenIds = new Set();
    const seenKeys = new Set();
    for (const item of list) {
        const idVal = item.id || item.reportId || '';
        const titleVal = item.title || item.name || 'Sem título';
        const companyVal = item.companyName || '';
    const dateVal = formatDateToBrazil(item.inspectionDate || item.createdAt || item.date || '');
        if (idVal) {
            if (seenIds.has(String(idVal))) continue;
            seenIds.add(String(idVal));
            normalized.push(item);
        } else {
            const key = `${titleVal}|${companyVal}|${dateVal}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            normalized.push(item);
        }
    }

    container.innerHTML = normalized.map(item => {
        const type = escapeHtml(formatDocumentType(item.type || item.documentType || ''));
        const title = escapeHtml(item.title || item.name || 'Sem título');
        const company = escapeHtml(item.companyName || '');
    const dateRaw = item.inspectionDate || item.createdAt || item.date || '';
    const date = escapeHtml(formatDateToBrazil(dateRaw));
        const id = item.id || item.reportId || '';
        return `<tr data-doc-id="${id}">
            <td>${type}</td>
            <td>${title}</td>
            <td>${company}</td>
            <td>${date}</td>
            <td>
                <button type="button" data-id="${id}" class="btn-primary btn-download-doc">Baixar</button>
                <button type="button" data-id="${id}" class="btn-visual-pdf btn-view-doc" style="margin-left:8px;">Visualizar</button>
            </td>
        </tr>`;
    }).join('');
    // bind download buttons (baixar PDF)
    container.querySelectorAll('.btn-download-doc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = btn.dataset.id;
            if (!id) return showToast('ID do documento ausente', 'error');
            try {
                const resp = await fetch(`${API_BASE_URL}/reports/download/${encodeURIComponent(id)}`, { headers: authHeaders() });
                if (resp.ok) {
                    const blob = await resp.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a'); link.href = url; link.download = `document-${id}.pdf`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
                    return;
                }
            } catch (_) {}
            showToast('Não foi possível obter PDF do documento.', 'error');
        });
    });
    // bind view buttons (abrir em nova aba a página do relatório)
    container.querySelectorAll('.btn-view-doc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = btn.dataset.id;
            if (!id) return showToast('ID do documento ausente', 'error');
            try {
                const resp = await fetch(`${API_BASE_URL}/reports/download/${encodeURIComponent(id)}`, { headers: authHeaders() });
                if (!resp.ok) throw new Error('Erro ao obter PDF');
                const blob = await resp.blob();
                showPdfModal(blob);
            } catch (err) {
                console.error('Visualizar falhou', err);
                showToast('Não foi possível carregar PDF para visualização.', 'error');
            }
        });
    });
    // bind delete buttons
    container.querySelectorAll('.btn-delete-doc').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = btn.dataset.id;
            if (!id) return showToast('ID do documento ausente', 'error');
            if (!confirm('Confirma exclusão deste documento?')) return;
            try {
                const mod = await import('./lib/api.js');
                const resp = await mod.deleteInspectionReport(id);
                if (resp.ok) {
                    showToast('Documento excluído com sucesso', 'success');
                    // remover do localStorage se presente
                    const all = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
                    const filtered = all.filter(x => (x.id||x.reportId||'') !== id);
                    localStorage.setItem('savedInspectionReports', JSON.stringify(filtered));
                    // remover linha da tabela
                    const tr = btn.closest('tr[data-doc-id]');
                    if (tr && tr.parentNode) tr.parentNode.removeChild(tr);
                    return;
                } else {
                    const txt = await resp.text().catch(()=>null) || '';
                    // tentar extrair ID do corpo e remover localmente
                    if (tryRemoveReportedIdFromErrorBody(txt)) return;
                    if (resp.status === 404 || resp.status === 410) {
                        // status sem corpo legível: remover local e informar
                        removeLocalReportById(id);
                        showToast('Documento não encontrado no servidor — removendo cópia local.', 'info');
                        return;
                    }
                    throw new Error(txt || 'Falha ao excluir documento');
                }
            } catch (err) {
                console.error('delete doc failed', err);
                showToast(err.message || 'Erro ao excluir documento', 'error');
            }
        });
    });
}

// Dashboard histórico rápido
export function populateDashboardHistory() {
    const list = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
    const container = document.getElementById('dashboardHistoryList') || document.querySelector('.dashboard-page .dashboard-card ul');
    if (!container) return;
    if (Array.isArray(list) && list.length) {
        container.innerHTML = list.slice(-5).reverse().map(i => `<li>${escapeHtml(i.title || 'Documento')} - ${escapeHtml((i.createdAt||'').substring(0,10)||'')}</li>`).join('');
        return;
    }
    // Se não há histórico local, tentar buscar do backend
    (async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}/inspection-reports?limit=5`, { headers: authHeaders() });
            if (!resp.ok) throw new Error('no-backend-history');
            const data = await resp.json();
            if (!Array.isArray(data) || !data.length) {
                container.innerHTML = '<li>Nenhum histórico disponível.</li>';
                return;
            }
            container.innerHTML = data.slice(0,5).map(i => {
                const title = i.title || i.type || 'Documento';
                const date = formatDateToBrazil(i.inspectionDate || i.createdAt || '') || '';
                return `<li>${escapeHtml(title)} - ${escapeHtml(date)}</li>`;
            }).join('');
        } catch (e) {
            container.innerHTML = '<li>Nenhum histórico local.</li>';
        }
    })();
}

// Carrega a última inspeção do backend e exibe no dashboard
export async function loadLatestInspectionOnDashboard() {
    const container = document.getElementById('latestInspectionContent');
    if (!container) return;
    container.innerHTML = '<p>Carregando última inspeção...</p>';
    try {
        const resp = await fetch(`${API_BASE_URL}/inspection-reports/latest`, { headers: authHeaders() });
        if (!resp.ok) {
            container.innerHTML = `<p>Nenhuma inspeção encontrada (status ${resp.status}).</p>`;
            return;
        }
        const data = await resp.json();
        // espera-se que o backend retorne objeto com campos: type, inspectionDate, companyName, title (opcional)
        const title = data.title || (data.type || 'Relatório');
    const date = formatDateToBrazil(data.inspectionDate || data.date || '');
        const company = data.companyName || data.company || data.clientName || '';
        container.innerHTML = `
            <p><strong>Título:</strong> ${escapeHtml(title)}</p>
            <p><strong>Data:</strong> ${escapeHtml(date)}</p>
            <p><strong>Empresa:</strong> ${escapeHtml(company)}</p>
        `;
    } catch (e) {
        console.warn('loadLatestInspectionOnDashboard error', e);
        container.innerHTML = '<p>Erro ao carregar última inspeção.</p>';
    }
}

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

// Remove do localStorage a entrada savedInspectionReports cujo id/reportId é igual ao fornecido
function removeLocalReportById(id) {
    if (!id) return false;
    try {
        const all = JSON.parse(localStorage.getItem('savedInspectionReports') || '[]');
        const filtered = all.filter(x => (String(x.id||x.reportId||'') !== String(id)));
        localStorage.setItem('savedInspectionReports', JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.warn('removeLocalReportById failed', e && e.message);
        return false;
    }
}

// Tenta extrair um ID de mensagens de erro do servidor do tipo "Relatório com ID 1 não encontrado"
// e, se encontrado, remove o registro local correspondente e atualiza a UI.
function tryRemoveReportedIdFromErrorBody(bodyText) {
    if (!bodyText || typeof bodyText !== 'string') return false;
    // procurar padrões numéricos simples
    const m = bodyText.match(/ID\s*(\d+)/i) || bodyText.match(/id\s*[:=]?\s*(\d+)/i);
    if (m && m[1]) {
        const badId = m[1];
        removeLocalReportById(badId);
        // remover linha da tabela se existir
        const tr = document.querySelector(`tr[data-doc-id="${badId}"]`);
        if (tr && tr.parentNode) tr.parentNode.removeChild(tr);
        showToast(`Documento ${badId} não encontrado no servidor — cópia local removida.`, 'info');
        return true;
    }
    // tentar json parse se o body for JSON
    try {
        const j = JSON.parse(bodyText);
        const msg = j && (j.message || j.error || j.msg || j.detail);
        if (msg) return tryRemoveReportedIdFromErrorBody(String(msg));
    } catch(_){}
    return false;
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

// Mostra modal com PDF a partir de um Blob. Cria iframe usando URL do blob e cuida da limpeza
export function showPdfModal(blob) {
    if (!blob) return showToast('PDF inválido para visualização', 'error');
    ensureUiContainers();
    const root = document.getElementById('ui-root');
    // criar overlay/modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay pdf-modal-overlay';
    const modal = document.createElement('div');
    modal.className = 'modal pdf-modal';
    const blobUrl = window.URL.createObjectURL(blob);
    modal.innerHTML = `
        <div class="modal-header pdf-modal-header">
            <div class="pdf-header-left"><h3>Visualizar PDF</h3></div>
            <div class="pdf-header-right">
                <button type="button" class="btn-close btn-close-svg btn-icon" data-action="close" aria-label="Fechar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="modal-body pdf-body" style="height:70vh;padding:0;">
            <iframe src="${blobUrl}" frameborder="0" style="width:100%;height:100%;"></iframe>
        </div>
    `;
    overlay.appendChild(modal);
    root.appendChild(overlay);

    function cleanup() {
        const iframe = modal.querySelector('iframe');
        // revogar URL
        try { if (iframe && iframe.src) window.URL.revokeObjectURL(iframe.src); } catch(_){}
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 250);
    }

    // fechar pelo botão
    modal.querySelector('[data-action="close"]').addEventListener('click', cleanup);
    // fechar clicando no fundo
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(); });
    // Esc para fechar
    const escHandler = (ev) => { if (ev.key === 'Escape') { cleanup(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
    requestAnimationFrame(() => overlay.classList.add('open'));
}

// Expor global (opcional)
window.confirmDialog = confirmDialog;
window.showToast = showToast;