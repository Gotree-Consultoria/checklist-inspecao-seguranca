// Página: AEP (Avaliação Ergonômica Preliminar)
// Extraída de script.js para modularização

function escapeHtml(str) {
    return (str||'').replace(/[&<>"]+/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

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

    // Carrega perfil para avaliador (via script.js)
    try {
        const core = await import('../script.js');
        if (core && core.fetchUserProfile) {
            const me = await core.fetchUserProfile();
            if (me && evaluatorInput) evaluatorInput.value = me.name || '';
        }
    } catch (_) {}

    // Carregar hierarquia de empresas/unidades/setores (via script.js)
    try {
        const core = await import('../script.js');
        if (core && core.loadCompanyHierarchyForAEP) await core.loadCompanyHierarchyForAEP();
    } catch (e) {
        console.warn('Erro ao carregar hierarquia para AEP', e);
    }

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

export default { initAepPage };
