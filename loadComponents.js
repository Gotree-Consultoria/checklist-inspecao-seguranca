// loadComponents.js
// Importa a função de renderização do script.js
import { renderChecklistForm } from './script.js';

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
            }
        })
        .catch(error => console.error('Erro:', error));
}

// Inicia a aplicação carregando os componentes iniciais
document.addEventListener('DOMContentLoaded', () => {
    loadComponent('headerPageContainer', 'headerPage');
    loadComponent('footerPageContainer', 'footerPage');
    
    // Altere esta linha para carregar o formsPage para testes
    // loadComponent('mainContent', 'formsPage');

    // Altere esta linha para carregar o loginPage para testes
    loadComponent('mainContent', 'loginPage');
});