export const checklistData = [
    {
        sectionId: '01',
        sectionTitle: 'ESTRUTURA FÍSICA',
        naOption: true, // Campo adicionado para indicar que esta seção não se aplica e será recolhida
        items: [
            { id: '1.1', text: 'Área de passagem definida e sinalizada?' },
            { id: '1.2', text: 'Área de passagem tem largura suficiente p/ todos os movimentos?' },
            { id: '1.3', text: 'Área de passagem estão limpas e desobstruídas?' },
            { id: '1.4', text: 'Área de passagem livre de saliências?' },
            { id: '1.5', text: 'Área de passagem livre de escorregões?' },
            { id: '1.6', text: 'Área de passagem livre na ocorrência de evasão rápida?' },
            { id: '1.7', text: 'Plataforma de trabalho tem piso apropriado?' },
            { id: '1.8', text: 'Plataforma de trabalho está limpa, livre de produtos escorregadios?' },
            { id: '1.9', text: 'As rampas e escadas possuem antiderrapantes?' },
            { id: '1.10', text: 'Existem rachaduras ou infiltrações?' },
            { id: '1.11', text: 'Se no local existirem escadas, possuem corrimãos?' },
            { id: '1.12', text: 'Há a proteção ou anteparo contra queda de pessoas (Guarda-corpo)?' },
            { id: '1.13', text: 'As portas apresentam estado de conservação ?' },
            { id: '1.14', text: 'As câmaras de refrigeração e congelados apresentam as paredes conservadas?(NA)' }
        ]
    },
    {
        sectionId: '02',
        sectionTitle: 'INSTALAÇÕES ELÉTRICAS',
        naOption: true,
        items: [
            { id: '2.1', text: 'Existem condutores soltos?' },
            { id: '2.2', text: 'Existem condutores fora dos eletrodutos?' },
            { id: '2.3', text: 'Existem extensões com emendas?' },
            { id: '2.4', text: 'Existe plugues nas máquinas?'},
            { id: '2.5', text: 'A luminárias de iluminação estão limpas?'},
            { id: '2.6', text: 'Área de trabalho está adequadamente iluminada durante o período de trabalho?'},
            { id: '2.7', text: 'Painéis de distribuições elétricas estão fechados, sinalizados e seguros?'},
            { id: '2.8', text: 'Os condutores elétricos estão enrolados?'}

        ]
    },

    {
        sectionId: '03',
        sectionTitle: 'ÁREA DE ARMAZENAMENTO / MATERIAL ARMAZENADO',
        naOption: true,
        items: [
            { id: '3.1', text: 'A área de armazenamento está limpa?' },
            { id: '3.2', text: 'Os materiais armazenados estão separados e identificados?' },
            { id: '3.3', text: 'Os produtos químicos estão estocados em local seguro e longe do calor?' },
            { id: '3.4', text: 'Existe aviso de proibição de fumo afixado nestes locais?' },
            { id: '3.5', text: 'As prateleiras estão em bom estado de conservação?' },
            { id: '3.6', text: 'O material está adequadamente empilhado?' }, 
            { id: '3.7', text: 'A altura do empilhamento atende ás Normas de Segurança?' },
            { id: '3.8', text: 'O material empilhado está com afastamento de 50 cm da parede?' }
        ]
    },

    {
        sectionId: '04',
        sectionTitle: 'MÁQUINAS E COMPRESSORES',
        naOption: true,
        items: [
            { id: '4.1', text: 'As máquinas estão aterradas?' },
            { id: '4.2', text: 'As máquinas estão isoladas da área de circulação?' },
            { id: '4.3', text: 'As polias e roldanas estão protegidas por grades?' },
            { id: '4.4', text: 'As partes vivas estão protegidas evitando o contato manual?' },
            { id: '4.5', text: 'Os locais onde ficam as máquinas estão limpos?' },
            { id: '4.6', text: 'Estão lubrificadas?' },
            { id: '4.7', text: 'Na área destinada aos compressores é restrita à entrada?' },
            { id: '4.8', text: 'No local existem cartazes indicando a obrigatoriedade quanto ao uso de EPI?' },
            { id: '4.9', text: 'O piso está limpo?' }
        ]
    },

    {
        sectionId: '05',
        sectionTitle: 'FERRAMENTAS MANUAIS',
        naOption: true,
        items: [
            { id: '5.1', text: 'As ferramentas estão em bom estado de conservação?' },
            { id: '5.2', text: 'Existe local para guarda quando não utilizadas?' },
            { id: '5.3', text: 'Estão com isolamento ou material que evite que fiquem escorregadias?' },
            { id: '5.4', text: 'São adequadas ao tipo de atividade realizada?' },
        ]
    },

    {
        sectionId: '06',
        sectionTitle: 'PONTES ROLANTES / CORRENTES / CABOS',
        naOption: true,
        items: [
            { id: '6.1', text: 'É bom o estado de conservação do elevador ?' },
            { id: '6.2', text: 'Estão limpos internamente?' },
            { id: '6.3', text: 'As correntes e cabos estão lubrificados?' },
            { id: '6.4', text: 'O limite de carga do elevador está afixado e visível?' },
            { id: '6.5', text: 'Gancho não deformado ou danificado?' },
            { id: '6.6', text: 'Cabos de aço usado na suspensão de cargas estão em bom estado?' },
            { id: '6.7', text: 'As correntes estão livres de torções?' },
            { id: '6.8', text: 'Os cabos elétricos estão enrolados?' }
        ]
    },

    {
        sectionId: '07',
        sectionTitle: 'INSTALAÇÕES SANITÁRIAS / VESTIÁRIOS',
        naOption: true,
        items: [
            { id: '7.1', text: 'Encontram-se em número suficiente por associado?' },
            { id: '7.2', text: 'Há toalheiro ou outro dispositivo para enxugar as mãos?' },
            { id: '7.3', text: 'Os cestos estão com tampas?' },
            { id: '7.4', text: 'Os armários estão em número suficiente por associado?' },
            { id: '7.5', text: 'Existe a identificação masculino e feminino?' },
            { id: '7.6', text: 'Estão higienizados normalmente?' },
            { id: '7.7', text: 'Existe sabão para lavar as mãos?' },
            { id: '7.8', text: 'As portas dos armários são teladas para entrada de ventilação?' },
            { id: '7.9', text: 'Os chuveiros, válvulas, torneiras apresentam conservados?' }
        ]
    },

    {
        sectionId: '08',
        sectionTitle: 'INFLAMÁVEIS',
        naOption: true,
        items: [
            { id: '8.1', text: 'A central de GLP está bem sinalizada?' },
            { id: '8.2', text: 'Os cilindros estão amarrados com correntes?' },
            { id: '8.3', text: 'Estão armazenados adequadamente e em local ventilado?' }
        ]
    },

    {
        sectionId: '09',
        sectionTitle: 'EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL',
        naOption: true,
        items: [
            { id: '9.1', text: 'Estão sendo utilizados durante a atividade?' },
            { id: '9.2', text: 'Estão higienizados?' },
            { id: '9.3', text: 'Estão em bom estado de conservação?' },
            { id: '9.4', text: 'Possuem o Certificado de Aprovação (C.A)?' },
            { id: '9.5', text: 'As fichas de Equipamento de Proteção Individual estão atualizadas e assinadas?' },
            { id: '9.6', text: 'Os associados foram treinados quanto ao uso correto?' }
        ]
    },

    {
        sectionId: '10',
        sectionTitle: 'EMPILHADEIRA',
        naOption: true,
        items: [
            { id: '10.1', text: 'A empilhadeira fica inclinada quando parada?' },
            { id: '10.2', text: 'Há sinais de vazamento de óleo ou água?' },
            { id: '10.3', text: 'Existe algum componente solto ou que faça ruído?' },
            { id: '10.4', text: 'Os pneus estão bem calibrados?' },
            { id: '10.5', text: 'Estão deteriorados ou desgastados em excesso ?' },
            { id: '10.6', text: 'Existem deformações nos aros?' },
            { id: '10.7', text: 'As porcas do cubo estão apertadas?' },
            { id: '10.8', text: 'Freio de estacionamento: a alavanca está efetiva com percurso e jogos corretos?' },
            { id: '10.9', text: 'A buzina está funcionando?' },
            { id: '10.10', text: 'O som está normal?' },
            { id: '10.11', text: 'O extintor de incêndio está carregado?' },
            { id: '10.12', text: 'O lacre apresenta-se inviolado?' },
            { id: '10.13', text: 'A mangueira do extintor está em boas condições de uso?' }
        ]
    },

    {
        sectionId: '11',
        sectionTitle: 'EXTINTORES DE INCÊNDIO',
        naOption: true,
        items: [
            { id: '11.1', text: 'Estão obstruídos?' },
            { id: '11.2', text: 'A área abaixo possui dimensões de 1m x 1m e pintada na cor vermelha?' },
            { id: '11.3', text: 'Possui disco de sinalização adequado ao tipo de extintor?' },
            { id: '11.4', text: 'O lacre e o selo estão violados?' },
            { id: '11.5', text: 'O extintor está carregado?' },
            { id: '11.6', text: 'Está com a carga dentro do prazo de validade?' },
            { id: '11.7', text: 'Apresenta boa conservação e limpeza?' },
            { id: '11.8', text: 'As inspeções estão sendo realizadas periodicamente?' }
        ]
    },

    {
        sectionId: '12',
        sectionTitle: 'HIDRANTES',
        naOption: true,
        items: [
            { id: '12.1', text: 'O motor-bomba está funcionando?' },
            { id: '12.2', text: 'Na caixa de mangueira possui 1(um) esguicho, 2 (duas) chaves e 2 (dois) lances de mangueiras?' },
            { id: '12.3', text: 'A caixa de mangueira apresenta-se em bom estado de conservação?' },
            { id: '12.4', text: 'A caixa de mangueira está obstruída?' }
        ]
    },

    {
        sectionId: '13',
        sectionTitle: 'SISTEMA DE DETECÇÃO E ALARME',
        naOption: true,
        items: [
            { id: '13.1', text: 'A central de alarme está funcionando?' },
            { id: '13.2', text: 'O acionadores estão bem sinalizados?' },
            { id: '13.3', text: 'A sirene pode ser ouvida por todos os associados?' },
            { id: '13.4', text: 'Há sinal luminoso e esta funcionando?' }
        ]
    },

    {
        sectionId: '14',
        sectionTitle: 'SINALIZAÇÃO DE SEGURANÇA',
        naOption: true,
        items: [
            { id: '14.1', text: 'Existem placas de advertência em locais perigosos?' },
            { id: '14.2', text: 'Existem áreas demarcadas?' },
            { id: '14.3', text: 'Há a colocação de cartazes educativos?' },
            { id: '14.4', text: 'As tubulações estão pintadas conforme as Normas de Segurança?' }
        ]
    },
];