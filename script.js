// =======================================================
// VARIÁVEIS GLOBAIS
// =======================================================
let currentPage = "index";

// Configuração da API
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = "http://localhost:8082";
} else {
    API_BASE_URL = "";
}

// =======================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =======================================================

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
        alert('Preencha todos os campos!');
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
            
            alert('Login realizado com sucesso!');
            
        } else {
            const errorData = await response.json();
            alert(errorData.erro || errorData.message || 'E-mail ou senha inválidos.');
        }
    } catch (error) {
        alert('Erro de conexão com o servidor.');
        console.error('Erro no handleLogin:', error);
    }
}

// =======================================================
// Função para buscar as empresas da API
// =======================================================

function carregarEmpresas() {
    const urlApi = `${API_BASE_URL}/api/empresas`;
    const selectEmpresas = document.getElementById('empresaCliente');

    if (!selectEmpresas) return; // Prevent errors if the element doesn't exist yet

    fetch(urlApi)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar as empresas.');
            }
            return response.json();
        })
        .then(empresas => {
            selectEmpresas.innerHTML = '<option value="">Selecione a empresa</option>';
            empresas.forEach(empresa => {
                const option = document.createElement('option');
                option.value = empresa.id;
                option.textContent = empresa.nome;
                selectEmpresas.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Erro:', error);
        });
}


// =======================================================
// LÓGICA DE RENDERIZAÇÃO DO FORMULÁRIO E INTERATIVIDADE
// =======================================================

// Importa os dados do seu arquivo
import { checklistData } from './data.js';

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
    carregarEmpresas();
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