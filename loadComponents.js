import { getUserRole, ensureUserRole, renderFullProfilePage, performLogout, fetchUserProfile } from './script.js';
import { initAepPage } from './pages/aep.js';
import { renderChecklistForm } from './pages/checklist.js';
import { renderReportForm, setupReportCompanySelectors } from './pages/report.js';
import { initAdminPage } from './pages/admin.js';

function initTopNav() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('.nav-links a');
    links.forEach(link => {
        if (link.__bound) return;
        link.__bound = true;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-nav');
            switch(target) {
                case 'group': loadComponent('mainContent', 'groupPage'); break;
                case 'dashboard': loadComponent('mainContent', 'dashboardPage'); break;
                case 'documents': loadComponent('mainContent', 'documentsPage'); break;
                case 'report': loadComponent('mainContent', 'reportPage'); break; // fallback se chamado via botão interno
                case 'profile': loadComponent('mainContent', 'profilePage'); break;
                case 'admin': loadComponent('mainContent', 'adminPage'); break;
            }
            setActiveNav(target);
        });
    });
    // Dropdown usuário
    const trigger = document.getElementById('userTrigger');
    const menu = nav.querySelector('.user-menu');
    if (trigger && !trigger.__bound) {
        trigger.__bound = true;
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = menu.classList.toggle('open');
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
        });
        document.addEventListener('click', (ev) => {
            if (!nav.contains(ev.target)) {
                menu.classList.remove('open');
                trigger.setAttribute('aria-expanded','false');
                menu.setAttribute('aria-hidden','true');
            }
        });
        menu.addEventListener('click', (ev) => {
            const action = ev.target.getAttribute('data-action');
            if (!action) return;
            if (action === 'profile') {
                loadComponent('mainContent', 'profilePage');
                setActiveNav('profile');
            } else if (action === 'logout') {
                performLogout();
                const headerContainer = document.getElementById('headerPageContainer');
                setActiveNav(null);
                if (headerContainer) {
                    headerContainer.innerHTML = '';
                    fetch('partials/headerPage.html')
                        .then(r=>r.text())
                        .then(html => { headerContainer.innerHTML = html; });
                }
                loadComponent('mainContent', 'loginPage');
            }
            menu.classList.remove('open');
            trigger.setAttribute('aria-expanded','false');
            menu.setAttribute('aria-hidden','true');
        });
    }
    fetchUserProfile().then(data => {
        if (!data) return;
        const initials = (data.name||'?').split(/\s+/).slice(0,2).map(p=>p[0]?.toUpperCase()||'').join('');
        const miniInit = document.querySelector('.mini-initials');
        if (miniInit) miniInit.textContent = initials;
        const nameEl = document.querySelector('.mini-name');
        if (nameEl) nameEl.textContent = data.name || '';
        const roleEl = document.querySelector('.mini-role');
        if (roleEl) roleEl.textContent = data.especialidade || data.role || '';
    });
    (async () => {
        let role = getUserRole();
        if (!role) role = await ensureUserRole();
        // diagnostic logs removed
        const adminLi = nav.querySelector('.admin-only');
        if (adminLi) {
            // remove classe e controle explícito de display como fallback
            adminLi.classList.remove('admin-visible');
            const isAdmin = role && String(role).toUpperCase().includes('ADMIN');
            if (isAdmin) {
                adminLi.classList.add('admin-visible');
                adminLi.style.display = '';
            } else {
                // garantir que não fique visível por engano
                adminLi.style.display = 'none';
            }
        }
    })();
}

function setActiveNav(key) {
    document.querySelectorAll('.top-nav .nav-links a').forEach(a => {
        if (key && a.getAttribute('data-nav') === key) a.classList.add('active'); else a.classList.remove('active');
    });
}

function loadComponent(containerId, componentName) {
    const container = document.getElementById(containerId);
    if (!container) { console.error(`Elemento ${containerId} não encontrado`); return; }
    fetch(`partials/${componentName}.html`)
        .then(r => { if(!r.ok) throw new Error('Falha ao carregar '+componentName); return r.text(); })
        .then(html => {
            container.innerHTML = html;
            switch(componentName) {
                case 'loginPage':
                    // Envolver dinamicamente o conteúdo de login em um wrapper (login-stack) para layout sem scroll
                    {
                        const existingWrapper = document.querySelector('.login-stack');
                        if (!existingWrapper) {
                            const main = document.getElementById('mainContent');
                            if (main && main.firstElementChild) {
                                const stack = document.createElement('div');
                                stack.className = 'login-stack';
                                // move o conteúdo atual para dentro do stack
                                while (main.firstChild) stack.appendChild(main.firstChild);
                                main.appendChild(stack);
                            }
                        }
                    }
                    const loginForm = document.getElementById('loginForm');
                    if (loginForm) loginForm.addEventListener('submit', handleLogin);
                    document.body.classList.add('body--login');
                    break;
                case 'groupPage':
                        document.body.classList.remove('body--login');
                        if (document.querySelector('.top-nav')) initTopNav();
                    setActiveNav('group');
                    // binds dos novos botões
                    document.querySelectorAll('.action-btn').forEach(btn => {
                        if (btn.__bound) return; btn.__bound = true;
                        btn.addEventListener('click', () => {
                            const act = btn.getAttribute('data-action');
                            if (act === 'new-checklist') {
                                loadComponent('mainContent', 'formsPage');
                            } else if (act === 'new-report') {
                                        // garantir que ao abrir um novo relatório não venham dados do rascunho anterior
                                        try { localStorage.removeItem('draftReport'); } catch(_) {}
                                        loadComponent('mainContent', 'reportPage');
                                    } else if (act === 'new-aep') {
                                loadComponent('mainContent', 'aepPage');
                            }
                        });
                    });
                    // carregar histórico do backend
                    try { import('./script.js').then(m => { if (m.loadHistoryForGroupPage) m.loadHistoryForGroupPage(); }); } catch(_) {}
                    break;
                case 'formsPage':
                    renderChecklistForm();
                    initTopNav();
                    document.body.classList.remove('body--login');
                        // Garantir binding de submit do formulário (fallback se onsubmit inline falhar)
                        try { import('./script.js').then(m => { const form = document.getElementById('checklistForm'); if (form && m.handleChecklistSubmit) { form.addEventListener('submit', m.handleChecklistSubmit); } }); } catch(_) {}
                    // O formulário já possui onsubmit="handleChecklistSubmit(event)", não vincular click aqui
                    break;
                case 'dashboardPage':
                    if (document.querySelector('.top-nav')) initTopNav();
                    setActiveNav('dashboard');
                    document.body.classList.remove('body--login');
                    try { import('./script.js').then(m => { if (m.populateDashboardHistory) m.populateDashboardHistory(); }); } catch(_) {}
                    break;
                case 'documentsPage':
                    if (document.querySelector('.top-nav')) initTopNav();
                    setActiveNav('documents');
                    document.body.classList.remove('body--login');
                    // inicializa lista de documentos e filtros
                    try { import('./script.js').then(m => { if (m.loadDocumentsList) m.loadDocumentsList(); if (m.bindDocumentsFilters) m.bindDocumentsFilters(); if (m.populateDashboardHistory) m.populateDashboardHistory(); }); } catch(_) {}
                    break;
                case 'reportPage':
                    if (document.querySelector('.top-nav')) initTopNav();
                    // não há mais item de menu para relatório, não chama setActiveNav('report')
                    renderReportForm();
                    if (typeof setupReportCompanySelectors === 'function') setupReportCompanySelectors();
                    document.body.classList.remove('body--login');
                    break;
                case 'aepPage':
                    if (document.querySelector('.top-nav')) initTopNav();
                    initAepPage();
                    document.body.classList.remove('body--login');
                    break;
                case 'profilePage':
                    if (document.querySelector('.top-nav')) initTopNav();
                    setActiveNav('profile');
                    renderFullProfilePage();
                    document.body.classList.remove('body--login');
                    break;
                    case 'changePasswordPage':
                        if (document.querySelector('.top-nav')) initTopNav();
                        // don't set active nav — this is a modal/forced page
                        document.body.classList.remove('body--login');
                        try { import('./script.js').then(m => { if (m.initChangePassword) m.initChangePassword(); }); } catch(_) {}
                        break;
                case 'adminPage':
                    if (document.querySelector('.top-nav')) initTopNav();
                    setActiveNav('admin');
                    initAdminPage();
                    document.body.classList.remove('body--login');
                    break;
            }
        })
        .catch(err => console.error(err));
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const headerContainer = document.getElementById('headerPageContainer');
    // Container onde a navbar será injetada (reutilizamos o mesmo header ou criar outro?)
    // Mantemos no mesmo container para evitar alterar index.html.

    // Footer sempre
    fetch('partials/footerPage.html').then(r=>r.text()).then(f=>{
        const footerContainer = document.getElementById('footerPageContainer');
        if (footerContainer) footerContainer.innerHTML = f;
    });

    if (!token) {
        // Estado não autenticado: exibe somente o headerPage (hero) e esconde navbar
        if (headerContainer) {
            fetch('partials/headerPage.html')
                .then(r=>r.text())
                .then(html => { headerContainer.innerHTML = html; })
                .finally(() => loadComponent('mainContent', 'loginPage'));
        } else {
            loadComponent('mainContent', 'loginPage');
        }
    } else {
        // Estado autenticado: remove headerPage hero e insere navbar
        if (headerContainer) {
            headerContainer.innerHTML = '';
            fetch('partials/navbar.html')
                .then(r=>r.text())
                .then(html => { headerContainer.innerHTML = html; initTopNav(); });
        }
        loadComponent('mainContent', 'groupPage');
    }
});

export { loadComponent, initTopNav };
