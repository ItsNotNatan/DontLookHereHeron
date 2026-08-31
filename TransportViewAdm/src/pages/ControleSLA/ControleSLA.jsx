import React, { useEffect } from 'react';
import './ControleSla.css';

export default function ControleSla() {
  
  useEffect(() => {
    // --- LÓGICA VANILLA JS ORIGINAL ADAPTADA PARA RODAR DENTRO DO REACT ---
    const KEY_REGISTROS = 'comau_sla_registros_v2';
    const KEY_TRANSPORTADORAS = 'comau_sla_transportadoras_v2';
    const PERCENTUAL_PENALIDADE = 0.08;
    const TARGET_ACEITAVEL = 0.90;
    const PESOS_INDICADORES = Object.freeze({ Coleta: 0.25, Entrega: 0.25, Resposta: 0.10, Frota: 0.15, Ocorrência: 0.25 });
    const DIAS_UTEIS_FRACIONADO = 7;
    const LINHAS_POR_PAGINA = 20;
    
    let registros = JSON.parse(localStorage.getItem(KEY_REGISTROS) || '[]').map(r => ({ ...r, modalidade: r.modalidade || 'Dedicado' }));
    let transportadoras = JSON.parse(localStorage.getItem(KEY_TRANSPORTADORAS) || '[]');
    let registrosFiltrados = [];
    let paginaDetalhamento = 1;

    const $ = (id) => document.getElementById(id);
    const moeda = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const pct = (n, d) => d ? ((n / d) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%';
    const dataLocal = (value) => new Date(`${value}T00:00:00`);
    const dataBR = (value) => value ? dataLocal(value).toLocaleDateString('pt-BR') : '-';

    function salvar() {
      localStorage.setItem(KEY_REGISTROS, JSON.stringify(registros));
      localStorage.setItem(KEY_TRANSPORTADORAS, JSON.stringify(transportadoras));
    }

    function mostrarMensagem(id, texto, tipo) {
      const m = $(id);
      if(m) {
        m.textContent = texto;
        m.className = `message ${tipo}`;
      }
    }

    function atualizarSelectTransportadoras() {
      const registro = $('transportadora');
      const filtro = $('filtro-transportadora');
      if(!registro || !filtro) return;

      const valorRegistro = registro.value;
      const valorFiltro = filtro.value;
      
      registro.innerHTML = '<option value="">Selecione uma transportadora</option>' + transportadoras.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
      filtro.innerHTML = '<option value="Todas">Todas as transportadoras</option>' + transportadoras.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
      
      if (transportadoras.includes(valorRegistro)) registro.value = valorRegistro;
      if (transportadoras.includes(valorFiltro)) filtro.value = valorFiltro;
    }

    function atualizarListaTransportadoras() {
      const lista = $('lista-transportadoras');
      if(!lista) return;

      lista.innerHTML = '';
      if (!transportadoras.length) {
        lista.innerHTML = '<li class="empty">Nenhuma transportadora cadastrada.</li>';
        return;
      }
      
      transportadoras.forEach((nome, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${esc(nome)}</span><button type="button" class="sla-btn sla-btn-danger" data-remover="${index}">Remover</button>`;
        lista.appendChild(li);
      });
      
      lista.querySelectorAll('[data-remover]').forEach(button => 
        button.addEventListener('click', () => removerTransportadora(Number(button.dataset.remover)))
      );
    }

    function esc(value) {
      return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    }

    function atualizarModalidade() {
      if($('fracionado-info')) $('fracionado-info').hidden = $('modalidade').value !== 'Fracionado';
    }

    function ocorrenciasSelecionadas() {
      return [...document.querySelectorAll('input[name="indicadorOcorrencia"]:checked')].map(checkbox => checkbox.value);
    }

    function pesoOcorrenciasSelecionadas() {
      return [...document.querySelectorAll('input[name="indicadorOcorrencia"]:checked')].reduce((total, checkbox) => total + Number(checkbox.dataset.peso || 0), 0);
    }

    function pontuacaoSelecionada() {
      return Math.max(0, 1 - pesoOcorrenciasSelecionadas());
    }

    function atualizarPontuacaoPreview() {
      const pontuacao = pontuacaoSelecionada();
      const percentual = pontuacao * 100;
      const dentroDoTarget = pontuacao >= TARGET_ACEITAVEL;
      
      if($('pontuacao-preview')) $('pontuacao-preview').textContent = `${percentual.toFixed(0)}% de 100%`;
      if($('target-preview')) {
        $('target-preview').textContent = dentroDoTarget ? 'Dentro do target' : 'Abaixo do target';
        $('target-preview').className = `target-status ${dentroDoTarget ? 'ok' : 'fora'}`;
      }
    }

    function registrarViagem(event) {
      event.preventDefault();
      
      if (!transportadoras.length) {
        mostrarMensagem('mensagem-registro', 'Cadastre uma transportadora antes de registrar a ocorrência.', 'error');
        abrirAba('transportadoras');
        return;
      }
      
      const formData = new FormData(event.currentTarget);
      const dados = Object.fromEntries(formData.entries());
      
      dados.indicadoresOcorrencia = ocorrenciasSelecionadas();
      dados.indicadoresNaoConformes = [...dados.indicadoresOcorrencia];
      dados.indicadoresOk = Object.keys(PESOS_INDICADORES).filter(indicador => !dados.indicadoresOcorrencia.includes(indicador));
      dados.viagem = dados.processo;
      dados.pontuacao = pontuacaoSelecionada();
      
      if (dados.indicadoresOcorrencia.length === 0) {
        mostrarMensagem('mensagem-registro', 'Marque pelo menos um indicador que teve ocorrência.', 'error');
        return;
      }
      
      if (!dados.observacao || !dados.observacao.trim()) {
        mostrarMensagem('mensagem-registro', 'Informe o motivo ou a observação da não conformidade.', 'error');
        return;
      }
      
      dados.tipoOcorrencia = dados.indicadoresNaoConformes.join(', ');
      const desconto = dados.penalidade !== 'Não' ? Number(dados.frete) * PERCENTUAL_PENALIDADE : 0;
      
      registros.push({ 
        ...dados, frete: Number(dados.frete), desconto, freteLiquido: Number(dados.frete) - desconto, criadoEm: new Date().toISOString() 
      });
      
      salvar();
      event.currentTarget.reset();
      $('data').value = new Date().toISOString().slice(0, 10);
      atualizarModalidade();
      atualizarPontuacaoPreview();
      atualizarDashboard();
      mostrarMensagem('mensagem-registro', 'Ocorrência registrada. A pontuação foi calculada automaticamente.', 'success');
    }

    function intervalo(tipo, referencia) {
      if (tipo === 'todos' || !referencia) return null;
      const data = dataLocal(referencia);
      
      if (tipo === 'ano') return { inicio: new Date(data.getFullYear(), 0, 1), fim: new Date(data.getFullYear() + 1, 0, 1) };
      if (tipo === 'mes') return { inicio: new Date(data.getFullYear(), data.getMonth(), 1), fim: new Date(data.getFullYear(), data.getMonth() + 1, 1) };
      
      const dia = data.getDay();
      const inicio = new Date(data); 
      inicio.setDate(data.getDate() - (dia === 0 ? 6 : dia - 1));
      inicio.setHours(0,0,0,0);
      
      const fim = new Date(inicio); 
      fim.setDate(inicio.getDate() + 7);
      
      return { inicio, fim };
    }

    function filtrarRegistros() {
      const tipo = $('tipo-periodo')?.value;
      const referencia = $('data-referencia')?.value;
      const transportadora = $('filtro-transportadora')?.value;
      const modalidade = $('filtro-modalidade')?.value;
      const faixa = intervalo(tipo, referencia);
      
      return registros.filter(r => {
        const data = dataLocal(r.data);
        const dentroDoPeriodo = !faixa || (data >= faixa.inicio && data < faixa.fim);
        const dentroDaTransportadora = !transportadora || transportadora === 'Todas' || r.transportadora === transportadora;
        const dentroDaModalidade = !modalidade || modalidade === 'Todas' || (r.modalidade || 'Dedicado') === modalidade;
        
        return dentroDoPeriodo && dentroDaTransportadora && dentroDaModalidade && (r.indicadoresOcorrencia?.length > 0 || r.tipoOcorrencia);
      });
    }

    function resumoFiltro() {
      const tipo = $('tipo-periodo')?.value;
      const referencia = $('data-referencia')?.value;
      const transportadora = $('filtro-transportadora')?.value;
      const modalidade = $('filtro-modalidade')?.value;
      const faixa = intervalo(tipo, referencia);
      
      let periodo = 'todos os registros';
      if (faixa) periodo = `${faixa.inicio.toLocaleDateString('pt-BR')} a ${new Date(faixa.fim.getTime() - 86400000).toLocaleDateString('pt-BR')}`;
      
      return `Período: ${periodo} | Transportadora: ${transportadora || 'Todas'} | Modalidade: ${modalidade || 'Todas'}`;
    }

    function calcularMetricas(lista) {
      const ocorrenciasValidas = lista.filter(r => r.indicadoresOcorrencia?.length > 0 || r.tipoOcorrencia);
      const porProcesso = new Map();
      
      ocorrenciasValidas.forEach(registro => {
        const id = registro.processo || registro.viagem || `${registro.data || ''}-${registro.transportadora || ''}-${registro.evento || ''}`;
        if (!porProcesso.has(id)) porProcesso.set(id, { id, indicadores: new Set(), registros: [], noShow: false, desconto: 0, frete: 0 });
        
        const processo = porProcesso.get(id);
        const ind = Array.isArray(registro.indicadoresOcorrencia) ? registro.indicadoresOcorrencia.filter(i => PESOS_INDICADORES[i]) : registro.tipoOcorrencia?.split(',').map(i => i.trim()).filter(i => PESOS_INDICADORES[i]) || [];
        
        ind.forEach(i => processo.indicadores.add(i));
        processo.registros.push(registro);
        processo.noShow = processo.noShow || registro.penalidade === 'No Show';
        processo.desconto = Math.max(processo.desconto, Number(registro.desconto || (registro.penalidade && registro.penalidade !== 'Não' ? Number(registro.frete || 0) * PERCENTUAL_PENALIDADE : 0)));
        processo.frete = Math.max(processo.frete, Number(registro.frete || 0));
      });
      
      const processos = [...porProcesso.values()];
      const totalProcessos = processos.length;
      const impacto = { Coleta: 0, Entrega: 0, Resposta: 0, Frota: 0, Ocorrência: 0 };
      const processosPorIndicador = { Coleta: 0, Entrega: 0, Resposta: 0, Frota: 0, Ocorrência: 0 };
      
      processos.forEach(processo => processo.indicadores.forEach(indicador => {
        if (impacto[indicador] !== undefined) {
          impacto[indicador] += PESOS_INDICADORES[indicador];
          processosPorIndicador[indicador]++;
        }
      }));
      
      const perdaTotal = processos.reduce((soma, processo) => soma + [...processo.indicadores].reduce((subtotal, indicador) => subtotal + (PESOS_INDICADORES[indicador] || 0), 0), 0);
      const indice = totalProcessos ? Math.max(0, 1 - Math.min(1, perdaTotal / totalProcessos)) : 1;
      
      return {
        processosNaoConforme: totalProcessos,
        ocorrencias: ocorrenciasValidas.length,
        frete: processos.reduce((soma, processo) => soma + processo.frete, 0),
        descontos: processos.reduce((soma, processo) => soma + processo.desconto, 0),
        indice, impacto, processosPorIndicador
      };
    }

    function atualizarDashboard() {
      if(!$('dash-total')) return; // previne erro se aba não renderizou
      paginaDetalhamento = 1;
      registrosFiltrados = filtrarRegistros();
      const metricas = calcularMetricas(registrosFiltrados);
      
      $('dash-total').textContent = metricas.processosNaoConforme;
      $('dash-sla').textContent = pct(metricas.indice * 100, 100);
      $('dash-target').textContent = pct(TARGET_ACEITAVEL * 100, 100);
      $('dash-ocorrencias').textContent = metricas.ocorrencias;
      $('dash-frete').textContent = moeda(metricas.frete);
      $('dash-descontos').textContent = moeda(metricas.descontos);
      $('resumo-filtro').textContent = resumoFiltro();
      
      renderizarGraficos(metricas);
      renderizarRanking();
      renderizarDetalhamento();
    }

    function renderizarGraficos(metricas) {
      const indice = metricas.indice * 100;
      const dentroDoTarget = metricas.indice >= TARGET_ACEITAVEL;
      
      $('grafico-target').innerHTML = `<div class="target-result"><strong>${indice.toFixed(1).replace('.', ',')}%</strong><span class="target-status ${dentroDoTarget ? 'ok' : 'fora'}">${dentroDoTarget ? 'Dentro do target' : 'Fora do target'}</span></div><div class="target-scale"><span>0%</span><span>50%</span><span>90%</span><span>100%</span></div><div class="target-track"><div class="target-fill" style="width:${Math.min(100, indice)}%"></div><div class="target-line"><span>Target 90%</span></div></div><div class="target-caption"><span>Resultado ponderado</span><strong>Meta mínima: 90%</strong></div>`;
      
      const indicadores = Object.entries(PESOS_INDICADORES).map(([nome, peso]) => {
        const processos = metricas.processosPorIndicador[nome] || 0;
        const impactoVisual = metricas.processosNaoConforme ? Math.min(100, ((metricas.impacto[nome] || 0) / metricas.processosNaoConforme) * 100) : 0;
        return [nome, processos, peso, impactoVisual];
      });
      
      $('grafico-sla').innerHTML = indicadores.map(([nome, processos, peso, impactoVisual]) => `<div class="bar-row"><span>${nome} (${(peso * 100).toFixed(0)}%)</span><div class="bar-track"><div class="bar-fill" style="width:${impactoVisual}%"></div></div><span class="bar-value">${processos}</span></div>`).join('');

      const porTransportadora = {};
      registrosFiltrados.filter(r => r.indicadoresOcorrencia?.length > 0 || r.tipoOcorrencia).forEach(r => { 
        const nome = r.transportadora || 'Sem transportadora'; 
        porTransportadora[nome] = (porTransportadora[nome] || 0) + Number(r.desconto || (r.penalidade && r.penalidade !== 'Não' ? Number(r.frete || 0) * PERCENTUAL_PENALIDADE : 0)); 
      });
      
      const itens = Object.entries(porTransportadora).sort((a,b) => b[1] - a[1]);
      const max = Math.max(...itens.map(x => x[1]), 0);
      
      $('grafico-penalidade').innerHTML = itens.length ? itens.slice(0, 8).map(([nome, valor]) => `<div class="bar-row"><span>${esc(nome)}</span><div class="bar-track"><div class="bar-fill" style="width:${max ? (valor / max) * 100 : 0}%"></div></div><span class="bar-value">${moeda(valor)}</span></div>`).join('') : '<p class="empty">Não há descontos no filtro selecionado.</p>';
    }

    function dadosPorTransportadora() {
      const grupos = {};
      registrosFiltrados.filter(r => r.indicadoresOcorrencia?.length > 0 || r.tipoOcorrencia).forEach(registro => {
        const nome = registro.transportadora || 'Sem transportadora';
        if (!grupos[nome]) grupos[nome] = [];
        grupos[nome].push(registro);
      });
      return Object.fromEntries(Object.entries(grupos).map(([nome, lista]) => [nome, calcularMetricas(lista)]));
    }

    function renderizarRanking() {
      const dados = Object.entries(dadosPorTransportadora()).sort((a,b) => b[1].processosNaoConforme - a[1].processosNaoConforme);
      $('ranking').innerHTML = dados.length ? dados.map(([nome, x]) => `<tr><td>${esc(nome)}</td><td>${x.processosNaoConforme}</td><td>${pct(x.indice * 100, 100)}</td><td>${x.ocorrencias}</td><td>${moeda(x.descontos)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">Nenhum registro no filtro selecionado.</td></tr>';
    }

    function renderizarDetalhamento() {
      const total = registrosFiltrados.length;
      const totalPaginas = Math.max(1, Math.ceil(total / LINHAS_POR_PAGINA));
      paginaDetalhamento = Math.min(Math.max(paginaDetalhamento, 1), totalPaginas);
      
      const inicio = (paginaDetalhamento - 1) * LINHAS_POR_PAGINA;
      const fim = Math.min(inicio + LINHAS_POR_PAGINA, total);
      const pagina = registrosFiltrados.slice(inicio, fim);
      
      $('detalhamento').innerHTML = pagina.length ? pagina.map(r => `<tr><td>${dataBR(r.data)}</td><td>${esc(r.modalidade || 'Dedicado')}</td><td>${esc(r.transportadora)}</td><td>${esc(r.processo || r.viagem || '-')}</td><td>${esc(r.tipoOcorrencia || r.indicadoresOcorrencia?.join(', ') || '-')}</td><td>${((r.indicadoresOcorrencia?.reduce((s, i) => s + (PESOS_INDICADORES[i]||0),0)||0)*100).toFixed(0)}%</td><td>${esc(r.evento || '-')}</td><td>${esc(r.penalidade || 'Não')}</td><td>${moeda(r.frete)}</td><td>${moeda(r.desconto)}</td><td>${moeda(r.freteLiquido)}</td><td>${esc(r.observacao || '-')}</td></tr>`).join('') : '<tr><td colspan="12" class="empty">Nenhum registro no filtro selecionado.</td></tr>';
      
      $('paginacao-resumo').textContent = total ? `Mostrando ${inicio + 1} até ${fim} de ${total} registros` : 'Mostrando 0 até 0 de 0 registros';
      $('pagina-atual').textContent = `${paginaDetalhamento} / ${totalPaginas}`;
      $('pagina-anterior').disabled = paginaDetalhamento <= 1;
      $('pagina-proxima').disabled = paginaDetalhamento >= totalPaginas;
    }

    function mudarPaginaDetalhamento(direcao) {
      const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / LINHAS_POR_PAGINA));
      paginaDetalhamento = Math.min(Math.max(paginaDetalhamento + direcao, 1), totalPaginas);
      renderizarDetalhamento();
    }

    function adicionarTransportadora() {
      const campo = $('nova-transportadora');
      const nome = campo.value.trim();
      
      if (!nome) { mostrarMensagem('mensagem-transportadora', 'Informe o nome da transportadora.', 'error'); return; }
      if (transportadoras.some(t => t.toLowerCase() === nome.toLowerCase())) { mostrarMensagem('mensagem-transportadora', 'Essa transportadora já está cadastrada.', 'error'); return; }
      
      transportadoras.push(nome);
      transportadoras.sort((a,b) => a.localeCompare(b, 'pt-BR'));
      campo.value = '';
      salvar();
      atualizarSelectTransportadoras();
      atualizarListaTransportadoras();
      mostrarMensagem('mensagem-transportadora', 'Transportadora cadastrada com sucesso.', 'success');
    }

    function removerTransportadora(index) {
      const nome = transportadoras[index];
      if (registros.some(r => r.transportadora === nome)) { mostrarMensagem('mensagem-transportadora', 'Não remova uma transportadora com histórico de viagens.', 'error'); return; }
      if (!window.confirm(`Remover ${nome} do cadastro?`)) return;
      
      transportadoras.splice(index, 1);
      salvar();
      atualizarSelectTransportadoras();
      atualizarListaTransportadoras();
    }

    function abrirAba(nome) {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === nome));
      document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.id === `tab-${nome}`));
      if (nome === 'dashboard') atualizarDashboard();
    }

    // Atachando Eventos
    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => abrirAba(btn.dataset.tab)));
    if($('form-registro')) $('form-registro').addEventListener('submit', registrarViagem);
    if($('modalidade')) $('modalidade').addEventListener('change', atualizarModalidade);
    document.querySelectorAll('input[name="indicadorOcorrencia"]').forEach(checkbox => checkbox.addEventListener('change', atualizarPontuacaoPreview));
    
    if($('adicionar-transportadora')) $('adicionar-transportadora').addEventListener('click', adicionarTransportadora);
    if($('nova-transportadora')) $('nova-transportadora').addEventListener('keydown', event => { if (event.key === 'Enter') adicionarTransportadora(); });
    if($('ir-transportadoras')) $('ir-transportadoras').addEventListener('click', () => abrirAba('transportadoras'));
    if($('aplicar-filtro')) $('aplicar-filtro').addEventListener('click', atualizarDashboard);
    if($('tipo-periodo')) $('tipo-periodo').addEventListener('change', atualizarDashboard);
    if($('data-referencia')) $('data-referencia').addEventListener('change', atualizarDashboard);
    if($('filtro-transportadora')) $('filtro-transportadora').addEventListener('change', atualizarDashboard);
    if($('filtro-modalidade')) $('filtro-modalidade').addEventListener('change', atualizarDashboard);
    
    if($('pagina-anterior')) $('pagina-anterior').addEventListener('click', () => mudarPaginaDetalhamento(-1));
    if($('pagina-proxima')) $('pagina-proxima').addEventListener('click', () => mudarPaginaDetalhamento(1));

    if($('data')) $('data').value = new Date().toISOString().slice(0, 10);
    if($('data-referencia')) $('data-referencia').value = new Date().toISOString().slice(0, 10);
    
    atualizarModalidade();
    atualizarPontuacaoPreview();
    atualizarSelectTransportadoras();
    atualizarListaTransportadoras();
    atualizarDashboard();

  }, []); // O array vazio garante que isso rode apenas uma vez quando a página montar

  return (
    <div className="sla-container">
      <nav className="tabs" aria-label="Navegação do sistema">
        <button className="tab-button active" data-tab="registro">Registro rápido</button>
        <button className="tab-button" data-tab="dashboard">Dashboard</button>
        <button className="tab-button" data-tab="transportadoras">Transportadoras</button>
      </nav>

      <section id="tab-registro" className="tab active">
        <div className="notice">
          <strong>Preenchimento rápido:</strong> registre somente quando houver uma ocorrência não conforme. Informe a data, modalidade, transportadora, processo/NF, valor do frete e o desvio identificado.
        </div>

        <section className="sla-card">
          <h2>Registrar não conformidade</h2>
          <form id="form-registro">
            <div className="basic-grid">
              <div className="field">
                <label htmlFor="modalidade">Modalidade</label>
                <select id="modalidade" name="modalidade">
                  <option value="Dedicado">Dedicado</option>
                  <option value="Fracionado">Fracionado</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="data">Data da ocorrência</label>
                <input id="data" name="data" type="date" required />
              </div>
              <div className="field">
                <label htmlFor="transportadora">Transportadora</label>
                <select id="transportadora" name="transportadora" required></select>
              </div>
              <div className="field">
                <label htmlFor="processo">Processo / NF / Viagem</label>
                <input id="processo" name="processo" type="text" placeholder="Ex.: NF12345" required />
              </div>
              <div className="field">
                <label htmlFor="frete">Valor do frete (R$)</label>
                <input id="frete" name="frete" type="number" min="0" step="0.01" placeholder="0,00" required />
              </div>
            </div>

            <div id="fracionado-info" className="fracionado-info" hidden>
              <strong>Fracionado:</strong> a coleta e a entrega devem ocorrer em até 7 dias úteis contados da solicitação. Registre somente quando houver uma ocorrência não conforme.
            </div>

            <div className="section-title">
              <h3>Marque somente os indicadores que tiveram ocorrência</h3>
              <span className="muted">Cada seleção desconta o peso do resultado.</span>
            </div>
            
            <div className="indicator-grid">
              <label className="indicator-card">
                <input type="checkbox" name="indicadorOcorrencia" value="Coleta" data-peso="0.25" />
                <span><strong>Coleta</strong><small>-25%</small></span>
              </label>
              <label className="indicator-card">
                <input type="checkbox" name="indicadorOcorrencia" value="Entrega" data-peso="0.25" />
                <span><strong>Entrega</strong><small>-25%</small></span>
              </label>
              <label className="indicator-card">
                <input type="checkbox" name="indicadorOcorrencia" value="Resposta" data-peso="0.10" />
                <span><strong>Resposta</strong><small>-10%</small></span>
              </label>
              <label className="indicator-card">
                <input type="checkbox" name="indicadorOcorrencia" value="Frota" data-peso="0.15" />
                <span><strong>Frota</strong><small>-15%</small></span>
              </label>
              <label className="indicator-card">
                <input type="checkbox" name="indicadorOcorrencia" value="Ocorrência" data-peso="0.25" />
                <span><strong>Ocorrência</strong><small>-25%</small></span>
              </label>
            </div>
            
            <div className="score-preview">
              <span>Índice calculado</span>
              <strong id="pontuacao-preview">100%</strong>
              <span id="target-preview" className="target-status ok">Dentro do target</span>
            </div>
            
            <div className="section-title compact">
              <h3>Detalhes da ocorrência</h3>
              <span className="muted">Informe somente quando houver pelo menos uma ocorrência marcada.</span>
            </div>
            
            <div className="basic-grid occurrence-details">
              <div className="field">
                <label htmlFor="evento">Tipo de desvio</label>
                <input id="evento" name="evento" type="text" placeholder="Ex.: No Show, avaria, falta, atraso" />
              </div>
              <div className="field">
                <label htmlFor="penalidade">Penalidade</label>
                <select id="penalidade" name="penalidade">
                  <option value="Não">Não aplicar</option>
                  <option value="No Show">No Show — 8%</option>
                  <option value="Atraso injustificado">Atraso injustificado — 8%</option>
                </select>
              </div>
            </div>
            
            <div className="field" style={{marginTop: '12px'}}>
              <label htmlFor="observacao">Motivo / observação</label>
              <input id="observacao" name="observacao" type="text" placeholder="Informe brevemente a causa do desvio" />
            </div>

            <div className="actions">
              <button type="button" className="sla-btn sla-btn-secondary" id="ir-transportadoras">Cadastrar transportadora</button>
              <div className="actions-right">
                <button type="button" className="sla-btn sla-btn-secondary" id="exportar-tudo">Exportar CSV</button>
                <button type="submit" className="sla-btn sla-btn-primary">Registrar ocorrência</button>
              </div>
            </div>
            
            <div id="mensagem-registro" className="message"></div>
          </form>
        </section>

        <section className="sla-card">
          <h2>Regra resumida do protocolo</h2>
          <div className="rules">
            <div className="rule"><strong>Dedicado</strong>Coleta em até 6 horas ou conforme agendamento. Entrega comparada com o Lead Time da rota.</div>
            <div className="rule"><strong>Fracionado</strong>Coleta e entrega em até 7 dias úteis contados da data da solicitação. Sábados e domingos não entram na contagem.</div>
            <div className="rule"><strong>Resposta</strong>Resposta operacional ou comercial em até 2 horas.</div>
            <div className="rule"><strong>Veículo e ocorrência</strong>Registrar veículo recusado/não apresentado e qualquer avaria, falta, atraso ou outro desvio.</div>
            <div className="rule"><strong>Penalidade</strong>No Show na coleta ou atraso injustificado aplica desconto automático de 8% sobre o frete da viagem.</div>
          </div>
        </section>
      </section>

      <section id="tab-dashboard" className="tab">
        <section className="sla-card">
          <h2>Dashboard gerencial</h2>
          <div className="filter-grid">
            <div className="field">
              <label htmlFor="tipo-periodo">Período</label>
              <select id="tipo-periodo">
                <option value="todos">Todos os registros</option>
                <option value="semana">Semana</option>
                <option value="mes">Mês</option>
                <option value="ano">Ano</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="data-referencia">Data de referência</label>
              <input id="data-referencia" type="date" />
            </div>
            <div className="field">
              <label htmlFor="filtro-transportadora">Transportadora</label>
              <select id="filtro-transportadora"></select>
            </div>
            <div className="field">
              <label htmlFor="filtro-modalidade">Modalidade</label>
              <select id="filtro-modalidade">
                <option value="Todas">Todas</option>
                <option value="Dedicado">Dedicado</option>
                <option value="Fracionado">Fracionado</option>
              </select>
            </div>
            <button className="sla-btn sla-btn-primary" type="button" id="aplicar-filtro">Aplicar filtros</button>
          </div>
          <div id="resumo-filtro" className="filter-summary">Exibindo todos os registros.</div>
        </section>

        <section className="dashboard-kpis">
          <div className="kpi"><small>Processos não Conforme</small><strong id="dash-total">0</strong></div>
          <div className="kpi"><small>Índice ponderado</small><strong id="dash-sla">100,0%</strong></div>
          <div className="kpi"><small>Target aceitável</small><strong id="dash-target">90,0%</strong></div>
          <div className="kpi"><small>Ocorrências registradas</small><strong id="dash-ocorrencias">0</strong></div>
          <div className="kpi"><small>Frete bruto</small><strong id="dash-frete">R$ 0,00</strong></div>
          <div className="kpi"><small>Descontos</small><strong id="dash-descontos">R$ 0,00</strong></div>
        </section>

        <div className="dashboard-grid">
          <section className="sla-card">
            <h3>Índice ponderado x target</h3>
            <div id="grafico-target" className="target-chart"></div>
            <p className="muted">Target aceitável: 90%. O resultado é considerado dentro quando o índice ponderado for igual ou superior a 90%.</p>
          </section>
          
          <section className="sla-card">
            <h3>Impacto por indicador</h3>
            <div id="grafico-sla"></div>
            <p className="muted">Cada ocorrência reduz o índice de acordo com o peso do indicador afetado.</p>
          </section>
        </div>
        
        <section className="sla-card">
          <h3>Descontos por transportadora</h3>
          <div id="grafico-penalidade"></div>
          <p className="muted">Valor acumulado das penalidades de 8% no período filtrado.</p>
        </section>

        <section className="sla-card">
          <div className="section-title">
            <h3>Indicadores do dashboard</h3>
            <button className="sla-btn sla-btn-primary" type="button" id="exportar-indicadores">Exportar indicadores</button>
          </div>
          <p className="muted">O arquivo inclui o índice ponderado, os pesos dos indicadores, o target de 90% e o ranking.</p>
          <div className="table-wrap" style={{marginTop: '18px'}}>
            <table>
              <thead>
                <tr>
                  <th>Transportadora</th>
                  <th>Processos não conformes</th>
                  <th>Índice ponderado</th>
                  <th>Ocorrências</th>
                  <th>Descontos</th>
                </tr>
              </thead>
              <tbody id="ranking"></tbody>
            </table>
          </div>
        </section>
        
        <section className="sla-card">
          <div className="section-title">
            <h3>Detalhamento dos processos</h3>
            <button className="sla-btn sla-btn-primary" type="button" id="exportar-detalhamento">Exportar detalhamento</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Modalidade</th>
                  <th>Transportadora</th>
                  <th>Processo / NF</th>
                  <th>Indicador afetado</th>
                  <th>% da ocorrência</th>
                  <th>Desvio</th>
                  <th>Penalidade</th>
                  <th>Frete</th>
                  <th>Desconto</th>
                  <th>Líquido</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody id="detalhamento"></tbody>
            </table>
          </div>
          <div className="pagination">
            <span id="paginacao-resumo">Mostrando 0 até 0 de 0 registros</span>
            <div className="pagination-controls">
              <button className="sla-btn sla-btn-secondary" type="button" id="pagina-anterior">‹ Anterior</button>
              <span id="pagina-atual">1 / 1</span>
              <button className="sla-btn sla-btn-secondary" type="button" id="pagina-proxima">Próxima ›</button>
            </div>
          </div>
        </section>
      </section>

      <section id="tab-transportadoras" className="tab">
        <section className="sla-card">
          <h2>Cadastro de transportadoras</h2>
          <p className="muted">Cadastre cada transportadora uma única vez.</p>
          <div className="add-company">
            <div className="field">
              <label htmlFor="nova-transportadora">Nome da transportadora</label>
              <input id="nova-transportadora" type="text" placeholder="Ex.: Transportadora Alfa Ltda." />
            </div>
            <button className="sla-btn sla-btn-primary" type="button" id="adicionar-transportadora">Adicionar</button>
          </div>
          <div id="mensagem-transportadora" className="message"></div>
        </section>
        
        <section className="sla-card">
          <h3>Transportadoras cadastradas</h3>
          <ul id="lista-transportadoras" className="company-list"></ul>
        </section>
      </section>
    </div>
  );
}