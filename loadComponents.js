// loadComponents.js
// Importa a função de renderização do script.js
import { renderChecklistForm } from './script.js';
// Importa a função do novo script, se ela existir
// import { addGroupPageListeners } from './groupScript.js';

// Função para adicionar listeners para o menu
function addMenuListeners() {
    const menuToggleBtn = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (menuToggleBtn && sidebar && overlay) {
        // Evento de clique para o botão do menu
        menuToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        // Evento de clique para o overlay (fechar o menu)
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// **NOVA FUNÇÃO** para adicionar listeners de navegação da groupPage
function addGroupPageListeners() {
    const createChecklistBtn = document.querySelector('.create-checklist .btn-primary');
    const createReportBtn = document.querySelector('.create-report .btn-primary');
    const dashboardLink = document.querySelector('.sidebar-menu a[href="#dashboard"]');
    const profileLink = document.querySelector('.sidebar-menu a[href="#profile"]');
    const documentsLink = document.querySelector('.sidebar-menu a[href="#documents"]');
    
    if (createChecklistBtn) {
        createChecklistBtn.addEventListener('click', () => {
            loadComponent('mainContent', 'formsPage');
        });
    }

    if (createReportBtn) {
        createReportBtn.addEventListener('click', () => {
            console.log('Botão "Criar Novo Relatório" clicado. Funcionalidade a ser implementada.');
            alert('A funcionalidade de criação de relatórios será adicionada em breve!');
        });
    }
    
    // Listener para o link do dashboard
    if (dashboardLink) {
        dashboardLink.addEventListener('click', (event) => {
            event.preventDefault(); // Impede o comportamento padrão do link
            loadComponent('mainContent', 'dashboardPage');
            
            // Fecha o menu após a navegação
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }

    // Listener para o link do perfil
    if (profileLink) { // Adicione este novo bloco
        profileLink.addEventListener('click', (event) => {
            event.preventDefault();
            loadComponent('mainContent', 'profilePage');
            
            // Fecha o menu após a navegação
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }

     // Listener para o link de Gerenciar Documentos
    if (documentsLink) { // Adicione este novo bloco
        documentsLink.addEventListener('click', (event) => {
            event.preventDefault();
            loadComponent('mainContent', 'documentsPage');
            
            // Fecha o menu após a navegação
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }

    // Listener para o botão de sair (Logout)
    const logoutLink = document.querySelector('.sidebar-menu a[href="#logout"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            loadComponent('mainContent', 'loginPage'); // Volta para a página de login
            
            // Fecha o menu
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }
}  


// Função para carregar um componente em um contêiner
function loadComponent(containerId, componentName) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`O elemento com o ID "${containerId}" não foi encontrado.`);
        return;
    }

    fetch(`partials/${componentName}.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro ao carregar o componente: ${componentName}.html, status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            container.innerHTML = html;
            // Se a página carregada for o formulário, chame a função de renderização
            if (componentName === 'formsPage') {
                renderChecklistForm();
            } else if (componentName === 'groupPage') {
                // Se a página for a de grupo, adicione os listeners do menu
                addMenuListeners();
                // adicione também a função de listeners do groupPage, se existir
                // addGroupPageListeners();
            }
        })
        .catch(error => console.error('Erro:', error));
}

// Inicia a aplicação carregando os componentes iniciais
document.addEventListener('DOMContentLoaded', () => {
    loadComponent('headerPageContainer', 'headerPage');
    loadComponent('footerPageContainer', 'footerPage');
    loadComponent('mainContent', 'loginPage');

    // UTILIZAR OS COMPONENTES ABAIXO APENAS PARA TESTES
    
    // Altere esta linha para carregar o formsPage para testes
    // loadComponent('mainContent', 'formsPage');

    // Altere esta linha para carregar o groupPage para testes
    // loadComponent('mainContent', 'groupPage');

    // Carrega o dashboardPage por padrão
    // loadComponent('mainContent', 'dashboardPage');

    // Carrega o profilePage por padrão
    // loadComponent('mainContent', 'profilePage');

    // Carrega o documentsPage por padrão
    // loadComponent('mainContent', 'documentsPage');
});
