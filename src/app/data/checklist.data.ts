export interface ChecklistItem {
  id: string;
  text: string;
  naOption?: boolean;
}

export interface ChecklistSection {
  sectionId: string;
  sectionTitle: string;
  naOption?: boolean;
  items: ChecklistItem[];
}

export const checklistData: ChecklistSection[] = [
    {
        sectionId: '01',
        sectionTitle: 'ESTRUTURA FÍSICA',
        naOption: true,
        items: [
            { id: '1.1', text: 'Área de passagem definida e sinalizada?', naOption: true },
            { id: '1.2', text: 'Área de passagem tem largura suficiente p/ todos os movimentos?', naOption: true },
            { id: '1.3', text: 'Área de passagem estão limpas e desobstruídas?', naOption: true },
            { id: '1.4', text: 'Área de passagem livre de saliências?', naOption: true },
            { id: '1.5', text: 'Área de passagem livre de escorregões?', naOption: true },
            { id: '1.6', text: 'Área de passagem livre na ocorrência de evasão rápida?', naOption: true },
            { id: '1.7', text: 'Plataforma de trabalho tem piso apropriado?', naOption: true },
            { id: '1.8', text: 'Plataforma de trabalho está limpa, livre de produtos escorregadios?', naOption: true },
            { id: '1.9', text: 'As rampas e escadas possuem antiderrapantes?', naOption: true },
            { id: '1.10', text: 'Existem rachaduras ou infiltrações?', naOption: true },
            { id: '1.11', text: 'Se no local existirem escadas, possuem corrimãos?', naOption: true },
            { id: '1.12', text: 'Há a proteção ou anteparo contra queda de pessoas (Guarda-corpo)?', naOption: true },
            { id: '1.13', text: 'As portas apresentam estado de conservação ?', naOption: true },
            { id: '1.14', text: 'As câmaras de refrigeração e congelados apresentam as paredes conservadas?(NA)', naOption: true }
        ]
    },
    {
        sectionId: '02',
        sectionTitle: 'INSTALAÇÕES ELÉTRICAS',
        naOption: true,
        items: [
            { id: '2.1', text: 'Existem condutores soltos?', naOption: true },
            { id: '2.2', text: 'Existem condutores fora dos eletrodutos?', naOption: true },
            { id: '2.3', text: 'Existem extensões com emendas?', naOption: true },
            { id: '2.4', text: 'Existe plugues nas máquinas?', naOption: true },
            { id: '2.5', text: 'A luminárias de iluminação estão limpas?', naOption: true },
            { id: '2.6', text: 'Área de trabalho está adequadamente iluminada durante o período de trabalho?', naOption: true },
            { id: '2.7', text: 'Painéis de distribuições elétricas estão fechados, sinalizados e seguros?', naOption: true },
            { id: '2.8', text: 'Os condutores elétricos estão enrolados?', naOption: true }
        ]
    },
    {
        sectionId: '03',
        sectionTitle: 'ÁREA DE ARMAZENAMENTO / MATERIAL ARMAZENADO',
        naOption: true,
        items: [
            { id: '3.1', text: 'A área de armazenamento está limpa?', naOption: true },
            { id: '3.2', text: 'Os materiais armazenados estão separados e identificados?', naOption: true },
            { id: '3.3', text: 'Os produtos químicos estão estocados em local seguro e longe do calor?', naOption: true },
            { id: '3.4', text: 'Existe aviso de proibição de fumo afixado nestes locais?', naOption: true },
            { id: '3.5', text: 'As prateleiras estão em bom estado de conservação?', naOption: true },
            { id: '3.6', text: 'O material está adequadamente empilhado?', naOption: true },
            { id: '3.7', text: 'A altura do empilhamento atende ás Normas de Segurança?', naOption: true },
            { id: '3.8', text: 'O material empilhado está com afastamento de 50 cm da parede?', naOption: true }
        ]
    },
    {
        sectionId: '04',
        sectionTitle: 'MÁQUINAS E COMPRESSORES',
        naOption: true,
        items: [
            { id: '4.1', text: 'As máquinas estão aterradas?', naOption: true },
            { id: '4.2', text: 'As máquinas estão isoladas da área de circulação?', naOption: true },
            { id: '4.3', text: 'As polias e roldanas estão protegidas por grades?', naOption: true },
            { id: '4.4', text: 'As partes vivas estão protegidas evitando o contato manual?', naOption: true },
            { id: '4.5', text: 'Os locais onde ficam as máquinas estão limpos?', naOption: true },
            { id: '4.6', text: 'Estão lubrificadas?', naOption: true },
            { id: '4.7', text: 'Na área destinada aos compressores é restrita à entrada?', naOption: true },
            { id: '4.8', text: 'No local existem cartazes indicando a obrigatoriedade quanto ao uso de EPI?', naOption: true },
            { id: '4.9', text: 'O piso está limpo?', naOption: true }
        ]
    },
    {
        sectionId: '05',
        sectionTitle: 'FERRAMENTAS MANUAIS',
        naOption: true,
        items: [
            { id: '5.1', text: 'As ferramentas estão em bom estado de conservação?', naOption: true },
            { id: '5.2', text: 'Existe local para guarda quando não utilizadas?', naOption: true },
            { id: '5.3', text: 'Estão com isolamento ou material que evite que fiquem escorregadias?', naOption: true },
            { id: '5.4', text: 'São adequadas ao tipo de atividade realizada?', naOption: true }
        ]
    },
    {
        sectionId: '06',
        sectionTitle: 'PONTES ROLANTES / CORRENTES / CABOS',
        naOption: true,
        items: [
            { id: '6.1', text: 'É bom o estado de conservação do elevador ?', naOption: true },
            { id: '6.2', text: 'Estão limpos internamente?', naOption: true },
            { id: '6.3', text: 'As correntes e cabos estão lubrificados?', naOption: true },
            { id: '6.4', text: 'O limite de carga do elevador está afixado e visível?', naOption: true },
            { id: '6.5', text: 'Gancho não deformado ou danificado?', naOption: true },
            { id: '6.6', text: 'Cabos de aço usado na suspensão de cargas estão em bom estado?', naOption: true },
            { id: '6.7', text: 'As correntes estão livres de torções?', naOption: true },
            { id: '6.8', text: 'Os cabos elétricos estão enrolados?', naOption: true }
        ]
    },
    {
        sectionId: '07',
        sectionTitle: 'INSTALAÇÕES SANITÁRIAS / VESTIÁRIOS',
        naOption: true,
        items: [
            { id: '7.1', text: 'Encontram-se em número suficiente por associado?', naOption: true },
            { id: '7.2', text: 'Há toalheiro ou outro dispositivo para enxugar as mãos?', naOption: true },
            { id: '7.3', text: 'Os cestos estão com tampas?', naOption: true },
            { id: '7.4', text: 'Os armários estão em número suficiente por associado?', naOption: true },
            { id: '7.5', text: 'Existe a identificação masculino e feminino?', naOption: true },
            { id: '7.6', text: 'Estão higienizados normalmente?', naOption: true },
            { id: '7.7', text: 'Existe sabão para lavar as mãos?', naOption: true },
            { id: '7.8', text: 'As portas dos armários são teladas para entrada de ventilação?', naOption: true },
            { id: '7.9', text: 'Os chuveiros, válvulas, torneiras apresentam conservados?', naOption: true }
        ]
    },
    {
        sectionId: '08',
        sectionTitle: 'INFLAMÁVEIS',
        naOption: true,
        items: [
            { id: '8.1', text: 'A central de GLP está bem sinalizada?', naOption: true },
            { id: '8.2', text: 'Os cilindros estão amarrados com correntes?', naOption: true },
            { id: '8.3', text: 'Estão armazenados adequadamente e em local ventilado?', naOption: true }
        ]
    },
    {
        sectionId: '09',
        sectionTitle: 'EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL',
        naOption: true,
        items: [
            { id: '9.1', text: 'Estão sendo utilizados durante a atividade?', naOption: true },
            { id: '9.2', text: 'Estão higienizados?', naOption: true },
            { id: '9.3', text: 'Estão em bom estado de conservação?', naOption: true },
            { id: '9.4', text: 'Possuem o Certificado de Aprovação (C.A)?', naOption: true },
            { id: '9.5', text: 'As fichas de Equipamento de Proteção Individual estão atualizadas e assinadas?', naOption: true },
            { id: '9.6', text: 'Os associados foram treinados quanto ao uso correto?', naOption: true }
        ]
    },
    {
        sectionId: '10',
        sectionTitle: 'EMPILHADEIRA',
        naOption: true,
        items: [
            { id: '10.1', text: 'A empilhadeira fica inclinada quando parada?', naOption: true },
            { id: '10.2', text: 'Há sinais de vazamento de óleo ou água?', naOption: true },
            { id: '10.3', text: 'Existe algum componente solto ou que faça ruído?', naOption: true },
            { id: '10.4', text: 'Os pneus estão bem calibrados?', naOption: true },
            { id: '10.5', text: 'Estão deteriorados ou desgastados em excesso ?', naOption: true },
            { id: '10.6', text: 'Existem deformações nos aros?', naOption: true },
            { id: '10.7', text: 'As porcas do cubo estão apertadas?', naOption: true },
            { id: '10.8', text: 'Freio de estacionamento: a alavanca está efetiva com percurso e jogos corretos?', naOption: true },
            { id: '10.9', text: 'A buzina está funcionando?', naOption: true },
            { id: '10.10', text: 'O som está normal?', naOption: true },
            { id: '10.11', text: 'O extintor de incêndio está carregado?', naOption: true },
            { id: '10.12', text: 'O lacre apresenta-se inviolado?', naOption: true },
            { id: '10.13', text: 'A mangueira do extintor está em boas condições de uso?', naOption: true }
        ]
    },
    {
        sectionId: '11',
        sectionTitle: 'EXTINTORES DE INCÊNDIO',
        naOption: true,
        items: [
            { id: '11.1', text: 'Estão obstruídos?', naOption: true },
            { id: '11.2', text: 'A área abaixo possui dimensões de 1m x 1m e pintada na cor vermelha?', naOption: true },
            { id: '11.3', text: 'Possui disco de sinalização adequado ao tipo de extintor?', naOption: true },
            { id: '11.4', text: 'O lacre e o selo estão violados?', naOption: true },
            { id: '11.5', text: 'O extintor está carregado?', naOption: true },
            { id: '11.6', text: 'Está com a carga dentro do prazo de validade?', naOption: true },
            { id: '11.7', text: 'Apresenta boa conservação e limpeza?', naOption: true },
            { id: '11.8', text: 'As inspeções estão sendo realizadas periodicamente?', naOption: true }
        ]
    },
    {
        sectionId: '12',
        sectionTitle: 'HIDRANTES',
        naOption: true,
        items: [
            { id: '12.1', text: 'O motor-bomba está funcionando?', naOption: true },
            { id: '12.2', text: 'Na caixa de mangueira possui 1(um) esguicho, 2 (duas) chaves e 2 (dois) lances de mangueiras?', naOption: true },
            { id: '12.3', text: 'A caixa de mangueira apresenta-se em bom estado de conservação?', naOption: true },
            { id: '12.4', text: 'A caixa de mangueira está obstruída?', naOption: true }
        ]
    },
    {
        sectionId: '13',
        sectionTitle: 'SISTEMA DE DETECÇÃO E ALARME',
        naOption: true,
        items: [
            { id: '13.1', text: 'A central de alarme está funcionando?', naOption: true },
            { id: '13.2', text: 'O acionadores estão bem sinalizados?', naOption: true },
            { id: '13.3', text: 'A sirene pode ser ouvida por todos os associados?', naOption: true },
            { id: '13.4', text: 'Há sinal luminoso e esta funcionando?', naOption: true }
        ]
    },
    {
        sectionId: '14',
        sectionTitle: 'SINALIZAÇÃO DE SEGURANÇA',
        naOption: true,
        items: [
            { id: '14.1', text: 'Existem placas de advertência em locais perigosos?', naOption: true },
            { id: '14.2', text: 'Existem áreas demarcadas?', naOption: true },
            { id: '14.3', text: 'Há a colocação de cartazes educativos?', naOption: true },
            { id: '14.4', text: 'As tubulações estão pintadas conforme as Normas de Segurança?', naOption: true }
        ]
    }
];
