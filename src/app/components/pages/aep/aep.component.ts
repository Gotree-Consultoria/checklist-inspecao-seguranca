import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LegacyService } from '../../../services/legacy.service';
import { UiService } from '../../../services/ui.service';

@Component({
  standalone: true,
  selector: 'app-aep',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './aep.component.html',
  styleUrls: ['./aep.component.css']
})
export class AepComponent implements OnInit {
  private legacy = inject(LegacyService);
  private fb = inject(FormBuilder);
  private ui = inject(UiService);

  form!: FormGroup;
  companies: any[] = [];
  units: any[] = [];
  sectors: any[] = [];
  loadingCompanies = false;
  msg = '';

  riskFactors: string[] = [];
  selectedRisks: string[] = [];

  ngOnInit(): void {
    this.form = this.fb.group({
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
      fisioterapeutaNome: [''],
      fisioterapeutaCrefito: [''],
      date: [this.todayIso(), Validators.required],
      funcao: ['', Validators.required]
    });

    this.initRiskFactors();
    this.loadProfile();
    this.loadCompanies();

    this.form.get('company')?.valueChanges.subscribe(val => {
      this.onCompanyChange(val);
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
    }catch(e:any){ this.ui.showToast(e?.message || 'Erro ao carregar empresas', 'error'); this.companies = []; }
    finally{ this.loadingCompanies = false; }
  }

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
    this.form.patchValue({ cnpj });
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
    const payload = {
      empresa: v.company,
      avaliador: v.evaluator,
      especialidade: v.especialidade || '',
  fisioterapeutaNome: v.fisioterapeutaNome || '',
  fisioterapeutaCrefito: v.fisioterapeutaCrefito || '',
      data: v.date,
      funcao: v.funcao,
      riscos: this.selectedRisks,
      unit: v.unit,
      sector: v.sector,
      cnpj: v.cnpj
    };
    localStorage.setItem('aepDraft', JSON.stringify(payload));
    this.msg = 'AEP salva localmente (draft).';
  }

  clear(){
    localStorage.removeItem('aepDraft');
    this.form.reset({ date: this.todayIso() });
    this.selectedRisks = [];
    this.units = []; this.sectors = [];
    this.msg = 'Formulário limpo.';
  }
}

