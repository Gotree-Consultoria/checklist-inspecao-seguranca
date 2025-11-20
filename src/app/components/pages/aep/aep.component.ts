import { Component, OnInit, inject, ElementRef } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { formatCNPJ } from '../../../utils/formatters';
import { UiService } from '../../../services/ui.service';
import { ReportService } from '../../../services/report.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-aep',
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgForOf, NgIf],
  templateUrl: './aep.component.html',
  styleUrls: ['./aep.component.css']
})
export class AepComponent implements OnInit {
  private legacy = inject(LegacyService);
  private fb = inject(FormBuilder);
  private ui = inject(UiService);
  private report = inject(ReportService);
  private el = inject(ElementRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  form!: FormGroup;
  companies: any[] = [];
  // usado quando carregamos AEP antes das companies estarem disponíveis
  pendingCompanyToSelect: any = null;
  units: any[] = [];
  sectors: any[] = [];
  loadingCompanies = false;
  msg = '';

  // fisioterapeutas
  physiotherapists: any[] = [];
  loadingPhysios = false;
  creatingPhysio = false;
  newPhysioName = '';
  newPhysioCrefito = '';

  riskFactors: string[] = [];
  selectedRisks: string[] = [];

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [''],
      company: ['', Validators.required],
      cnpj: [{ value: '', disabled: true }],
      unit: [{ value: '', disabled: true }],
      sector: [{ value: '', disabled: true }],
      // Avaliador, sigla e registro agora são editáveis: quem emite é técnico logado;
      // a assinatura final será externa (fisioterapeuta) e não é coletada aqui.
      evaluator: ['', Validators.required],
      sigla: [''],
      registro: [''],
      // Especialidade do avaliador (ex: Fisioterapia)
      especialidade: [''],
  // Dados da assinatura externa (preenchimento manual após emissão)
  fisioterapeutaId: [''],
  fisioterapeutaNome: [''],
      date: [this.todayIso(), Validators.required],
      funcao: ['', Validators.required]
    });

    this.initRiskFactors();
    this.loadProfile();
    this.loadCompanies();
  this.loadPhysiotherapists();

    // Se houver query param ?id=..., carregar AEP existente para edição
    try {
      const qid = this.route.snapshot.queryParams['id'] || null;
      if (qid) {
        // carregar os dados do servidor
        (async () => {
          try {
            const data = await this.report.getAepReport(qid);
            if (data) {
              // preencher campos conhecidos
              this.form.patchValue({
                id: data.id || data.reportId || qid,
                company: data.companyId || data.company || '',
                date: data.evaluationDate || data.date || this.todayIso(),
                funcao: data.evaluatedFunction || data.funcao || '' ,
                fisioterapeutaId: data.physiotherapistId || data.physiotherapistId || '',
                fisioterapeutaNome: data.physiotherapistName || data.physiotherapistNome || ''
              });
              // preencher avaliador e outros campos se presentes
              if (data.evaluator) this.form.patchValue({ evaluator: data.evaluator });
              if (data.sigla) this.form.patchValue({ sigla: data.sigla });
              if (data.registro) this.form.patchValue({ registro: data.registro });
              if (data.especialidade) this.form.patchValue({ especialidade: data.especialidade });

              // riscos selecionados (podem ser descrições)
              // Mapear cuidadosamente: normalizar acentos/case/espacos para encontrar correspondência com riskFactors
              // Suportar ambos os nomes que o backend pode retornar: `selectedRiskIds` ou `selectedRisks`
              const incoming = Array.isArray(data.selectedRiskIds) ? data.selectedRiskIds : (Array.isArray(data.selectedRisks) ? data.selectedRisks : []);
              const normalize = (s: any) => {
                if (s === null || s === undefined) return '';
                try { return String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(); } catch(e) { return String(s).toLowerCase().trim(); }
              };
              const mapped: string[] = [];
              incoming.forEach((inc: any) => {
                const n = normalize(inc);
                // tentar encontrar risco idêntico em riskFactors
                const found = this.riskFactors.find(rf => normalize(rf) === n);
                if (found) mapped.push(found);
                else if (typeof inc === 'string' && inc.trim()) mapped.push((inc || '').trim());
              });
              this.selectedRisks = mapped;
              // Garantir que os checkboxes do DOM reflitam a seleção (fallback para casos onde binding não atualize imediatamente)
              try {
                requestAnimationFrame(() => {
                  const host = (this.el && (this.el.nativeElement as HTMLElement)) || document;
                  mapped.forEach(mv => {
                    // procurar input cujo value ou label corresponda à descrição mapeada
                    const input = Array.from(host.querySelectorAll('input[type="checkbox"][name="risks"]'))
                      .find((inp: Element) => {
                        const el = inp as HTMLInputElement;
                        const val = (el.value || '').toString().trim();
                        if (val && val === mv) return true;
                        // verificar label associado
                        const id = el.id;
                        if (id) {
                          const lbl = host.querySelector(`label[for="${id}"]`);
                          if (lbl && (lbl.textContent || '').toString().trim() === mv) return true;
                        }
                        // tentar comparar normalizados
                        const normalize = (s: string) => s.normalize ? s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim() : s.toLowerCase().trim();
                        if (normalize(val) === normalize(mv)) return true;
                        if (id && normalize((host.querySelector(`label[for="${id}"]`)?.textContent||'') as string) === normalize(mv)) return true;
                        return false;
                      }) as HTMLInputElement | undefined;
                    if (input) input.checked = true;
                  });
                });
              } catch (e) { /* ignore */ }
            }
          } catch (err) { /* ignore - formulário permanecerá em branco */ }
        })();
      }
    } catch (e) { /* ignore */ }

    this.form.get('company')?.valueChanges.subscribe(val => {
      this.onCompanyChange(val);
    });

    this.form.get('fisioterapeutaId')?.valueChanges.subscribe(id => {
      this.onPhysioSelected(id);
    });
  }

  todayIso() { return new Date().toISOString().substring(0,10); }

  initRiskFactors(){
    this.riskFactors = [
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
  }

  async loadProfile(){
    try{
      const me = await this.legacy.fetchUserProfile();
      if (me) {
        this.form.patchValue({ evaluator: me.name || '' });
        this.form.patchValue({ sigla: me.siglaConselhoClasse || me.siglaConselho || me.sigla || '' });
        this.form.patchValue({ registro: me.conselhoClasse || me.registroConselho || me.registro || '' });
        // Tenta popular a especialidade a partir de possíveis chaves no perfil
        const specialty = me.especialidade || me.specialty || me.profissao || me.profession || me.role || me.cargo || me.specialization || '';
        if (specialty) this.form.patchValue({ especialidade: specialty });
      }
    }catch(e){/* ignore */}
  }

  async loadCompanies(){
    this.loadingCompanies = true;
    try{
      const resp = await fetch(`${this.legacy.apiBaseUrl}/companies`, { headers: this.legacy.authHeaders() });
      if (!resp.ok) throw new Error('Falha ao carregar empresas');
      const data = await resp.json();
      this.companies = Array.isArray(data) ? data : [];
      // se temos uma company pendente (vinha no AEP), tentar preencher agora
      if (this.pendingCompanyToSelect) {
        try {
          // patchValue company com o identificador pendente e acionar preenchimento
          this.form.patchValue({ company: this.pendingCompanyToSelect });
          this.onCompanyChange(this.pendingCompanyToSelect);
        } catch(_) {}
        this.pendingCompanyToSelect = null;
      }
    }catch(e:any){ this.ui.showToast(e?.message || 'Erro ao carregar empresas', 'error'); this.companies = []; }
    finally{ this.loadingCompanies = false; }
  }

  async loadPhysiotherapists(){
    this.loadingPhysios = true;
    try{
      const data = await this.report.fetchPhysiotherapists();
      this.physiotherapists = Array.isArray(data) ? data : [];
    }catch(e:any){ this.ui.showToast(e?.message || 'Erro ao carregar fisioterapeutas', 'error'); this.physiotherapists = []; }
    finally{ this.loadingPhysios = false; }
  }

  onPhysioSelected(id: any){
    if (!id) return;
    const sel = this.physiotherapists.find((p:any) => String(p.id || p._id) === String(id));
    if (sel) {
      this.form.patchValue({ fisioterapeutaNome: sel.name || sel.nome || '' });
    }
  }

  async createPhysiotherapist(){
    const name = (this.newPhysioName || '').trim();
    const cref = (this.newPhysioCrefito || '').trim();
    if (!name) { this.ui.showToast('Nome do fisioterapeuta é obrigatório', 'error'); return; }
    try{
      const payload = { name, crefito: cref };
      const created = await this.report.postPhysiotherapist(payload);
      // acrescentar à lista e selecionar
      this.physiotherapists = [ ...(this.physiotherapists || []), created ];
      const id = created.id || created._id || created.ID || created.idPhysio || '';
      // validar que os controles existem antes de patchValue
      if (this.form && this.form.get('fisioterapeutaId') && this.form.get('fisioterapeutaNome')) {
        this.form.patchValue({ fisioterapeutaId: id, fisioterapeutaNome: created.name || name });
      }
      this.creatingPhysio = false;
      this.newPhysioName = '';
      this.newPhysioCrefito = '';
      this.ui.showToast('Fisioterapeuta cadastrado com sucesso', 'success');
    }catch(e:any){ this.ui.showToast(e?.message || 'Erro ao cadastrar fisioterapeuta', 'error'); }
  }

  cancelCreatePhysio(){ this.creatingPhysio = false; this.newPhysioName = ''; this.newPhysioCrefito = ''; }

  onCompanyChange(companyId: any){
    if (!companyId) {
      this.form.patchValue({ cnpj: '' });
      this.units = []; this.sectors = [];
      this.form.get('unit')?.disable(); this.form.get('sector')?.disable();
      return;
    }
    const sel = this.companies.find(c => String(c.id || c._id || c.name) === String(companyId) || String(c.id) === String(companyId));
    if (!sel) {
      // sometimes the option stores name; try find by name
      const byName = this.companies.find(c => c.name === companyId);
      if (byName) { this.fillCompany(byName); return; }
      this.form.patchValue({ cnpj: '' });
      return;
    }
    this.fillCompany(sel);
  }

  fillCompany(sel: any){
  const cnpj = sel.cnpj || sel.CNPJ || sel.companyCnpj || '';
  this.form.patchValue({ cnpj: formatCNPJ(cnpj) });
    this.units = Array.isArray(sel.units) ? sel.units : (sel.unidades || []);
    this.sectors = Array.isArray(sel.sectors) ? sel.sectors : (sel.setores || []);
    if (this.units.length) this.form.get('unit')?.enable(); else this.form.get('unit')?.disable();
    if (this.sectors.length) this.form.get('sector')?.enable(); else this.form.get('sector')?.disable();
  }

  toggleRisk(r: string, ev: any){
    const checked = ev.target.checked;
    if (checked) { if (!this.selectedRisks.includes(r)) this.selectedRisks.push(r); }
    else { this.selectedRisks = this.selectedRisks.filter(x=>x!==r); }
  }

  submit(){
    if (this.form.invalid) { this.msg = 'Preencha os campos obrigatórios.'; return; }
    const v = this.form.getRawValue();

    console.log('Form values:', v); // ← DEBUG

    // Validar campos críticos
    if (!v.company) { this.msg = 'Empresa é obrigatória.'; return; }
    if (!v.funcao) { this.msg = 'Função avaliada é obrigatória.'; return; }
    if (!v.evaluator) { this.msg = 'Avaliador é obrigatório.'; return; }

    // Varre o DOM do componente para coletar descrições dos riscos marcados
    let selectedRiskDescriptions: string[] = [];
    try {
      const host = (this.el && (this.el.nativeElement as HTMLElement)) || document;
      const checked = Array.from(host.querySelectorAll('input[type="checkbox"][name="risks"]:checked')) as HTMLInputElement[];
      selectedRiskDescriptions = checked.map(chk => {
        const id = chk.id;
        let labelText = '';
        if (id) {
          const lbl = host.querySelector(`label[for="${id}"]`);
          if (lbl) labelText = (lbl.textContent || '').trim();
        }
        return labelText || (chk.value || '').trim();
      }).filter(Boolean);
    } catch (err) {
      // fallback: usar selectedRisks mantido por toggleRisk
      selectedRiskDescriptions = Array.isArray(this.selectedRisks) ? this.selectedRisks.slice() : [];
    }

    // Construir payload conforme contrato solicitado
    const aepPayload: any = {
      companyId: Number(v.company) || null,
      evaluationDate: v.date || '',
      evaluatedFunction: v.funcao || '',
      selectedRiskIds: selectedRiskDescriptions || [],
      physiotherapistId: Number(v.fisioterapeutaId) || null
    };

    console.log('Payload enviado:', aepPayload); // ← DEBUG

    (async () => {
      try {
        if (v.id) {
          console.log('Atualizando AEP ID:', v.id); // ← DEBUG
          const updated = await this.report.putAepReport(v.id, aepPayload);
          console.log('Resposta PUT:', updated); // ← DEBUG
        } else {
          console.log('Criando nova AEP'); // ← DEBUG
          const created = await this.report.postAepReport(aepPayload);
          console.log('Resposta POST:', created); // ← DEBUG
        }
      } catch (err:any) {
        console.error('Erro ao salvar:', err); // ← DEBUG
      }
    })();
  }

  clear(){
    localStorage.removeItem('aepDraft');
    this.form.reset({ date: this.todayIso() });
    this.selectedRisks = [];
    this.units = []; this.sectors = [];
    this.msg = 'Formulário limpo.';
  }
}

