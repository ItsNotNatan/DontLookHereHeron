// src/pages/AcompFinan/AcompFinan.jsx
import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Legend, LabelList, Cell
} from "recharts";
import api from "../../services/api";
import "./AcompFinan.css";

// ─── COLORS ─────────────────────────────────────────────────────────────────
const BLUE_MAIN   = "#0057A8";
const BLUE_LIGHT  = "#1A7FD4";
const BLUE_PALE   = "#E8F2FC";
const ACCENT      = "#FF6B35";
const GRAY_DARK   = "#1C2B3A";
const GRAY_MED    = "#4A6070";
const WHITE       = "#FFFFFF";
const SUCCESS     = "#22C55E";
const DANGER      = "#EF4444";

// ─── UTILS ──────────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtK = (v) => (v || 0) >= 1000000 ? `R$ ${(v / 1000000).toFixed(2)}M` : (v || 0) >= 1000 ? `R$ ${(v / 1000).toFixed(0)}K` : fmt(v);

const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// ─── ICONS & COMPONENTES VISUAIS ────────────────────────────────────────────
const DollarSign = ({ size = 24, color = "currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const Loader = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0057A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-2" style={{animation: 'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const LinkIcon = ({ size = 14, color = "currentColor" }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="acomp-tooltip">
      <p className="acomp-tooltip__label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="acomp-tooltip__item">
          {p.name}: <b>{typeof p.value === "number" && (p.name.includes("Custo") || p.name.includes("Previsto") || p.name.includes("Realizado") || p.name.includes("Gasto")) ? fmt(p.value) : p.value}</b>
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({ icon, label, value, sub, color, highlight }) => (
  <div className={`acomp-kpi-card ${highlight ? 'acomp-kpi-card--highlight' : ''}`}>
    <div className="acomp-kpi-card__header">
      <span className="acomp-kpi-card__icon">{icon}</span>
      <span className="acomp-kpi-card__label">{label}</span>
    </div>
    <div className="acomp-kpi-card__value" style={{ color: highlight ? WHITE : (color || BLUE_MAIN) }}>{value}</div>
    {sub && <div className="acomp-kpi-card__sub">{sub}</div>}
  </div>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="acomp-section-header">
    <h2 className="acomp-section-header__title">{title}</h2>
    {subtitle && <p className="acomp-section-header__subtitle">{subtitle}</p>}
  </div>
);

const ChartDataTable = ({ data, categoryKey, series }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="chart-data-table-container">
      <table className="chart-data-table">
        <thead>
          <tr>
            <th style={{ width: '150px' }}></th> 
            {data.map((item, idx) => (
              <th key={idx}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  {item[categoryKey]}
                  {item.hasOwnProperty('temLink') && (
                    <LinkIcon size={13} color={item.temLink ? BLUE_MAIN : "#94a3b8"} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s, idx) => (
            <tr key={idx}>
              <td>
                <div className="chart-data-table__series-cell">
                  <span className="chart-data-table__color-box" style={{ backgroundColor: s.color }}></span>
                  {s.name}
                </div>
              </td>
              {data.map((item, i) => {
                const val = item[s.key];
                return (
                  <td key={i}>
                    {s.formatter ? s.formatter(val) : (typeof val === 'number' ? val.toLocaleString("pt-BR") : val)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function AcompFinan() {
  const [atms, setAtms] = useState([]);
  const [projetosOficiais, setProjetosOficiais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [projetoSelecionado, setProjetoSelecionado] = useState({ value: 'TODOS', label: 'Todos os Projetos' });
  const [projetoAtivo, setProjetoAtivo] = useState('TODOS');
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);
        const [respostaAtms, respostaProjetos] = await Promise.all([
          api.get('/admin/transportes'),
          api.get('/admin/projetos')
        ]);
        
        // 👇 BLINDAGEM 1: Garante que os dados do estado sejam sempre Arrays (mesmo que a API falhe)
        setAtms(Array.isArray(respostaAtms.data) ? respostaAtms.data : []);
        setProjetosOficiais(Array.isArray(respostaProjetos.data) ? respostaProjetos.data : []);

      } catch (erro) {
        console.error("Erro ao buscar dados financeiros:", erro);
        // Garante que, em caso de erro na API, o state fique como array vazio para não quebrar os hooks abaixo
        setAtms([]);
        setProjetosOficiais([]);
      } finally {
        setCarregando(false);
      }
    };
    carregarDados();
  }, []);

  const opcoesProjeto = useMemo(() => {
    // 👇 BLINDAGEM 2: Mais uma camada de segurança no map
    const projetosSeguros = Array.isArray(projetosOficiais) ? projetosOficiais : [];

    const opcoes = projetosSeguros.map(p => {
      const nomeProjeto = p.descricao || p.nome_projeto || p.wbs || 'Projeto Sem Nome';
      return { value: nomeProjeto.toUpperCase().trim(), label: nomeProjeto };
    });
    
    const opcoesUnicas = Array.from(new Map(opcoes.map(item => [item.value, item])).values())
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: 'TODOS', label: 'Todos os Projetos' }, ...opcoesUnicas];
  }, [projetosOficiais]);

  const atmsDoProjeto = useMemo(() => {
    // 👇 BLINDAGEM 3: Previne que o ".filter" quebre
    const atmsSeguros = Array.isArray(atms) ? atms : [];

    if (!projetoAtivo || projetoAtivo === 'TODOS') return atmsSeguros;
    
    return atmsSeguros.filter(atm => {
      const pepLogistica = (atm.wbs || '').toUpperCase().trim();
      const pepFinanceiro = (atm.faturamento?.elemento_pep_cc_wbs || '').toUpperCase().trim(); 
      
      return pepLogistica === projetoAtivo || pepFinanceiro === projetoAtivo;
    });
  }, [atms, projetoAtivo]);

  const { totalGasto, totalFretes, mediaCusto, monthlyData, transportadorasData, rotasData, desvioMensalData, motivosData } = useMemo(() => {
    if (!Array.isArray(atmsDoProjeto) || atmsDoProjeto.length === 0) {
      return { totalGasto: 0, totalFretes: 0, mediaCusto: 0, monthlyData: [], transportadorasData: [], rotasData: [], desvioMensalData: [], motivosData: [] };
    }

    let tGasto = 0;
    const mesesMap = {};
    
    mesesAbrev.forEach((m, i) => {
      mesesMap[i + 1] = { mes: m, num: i + 1, total: 0, count: 0, media: 0, previstoTotal: 0, realizadoTotal: 0 };
    });
    
    const transMap = {};
    const rotasMap = {};
    const motivosMap = {};

    atmsDoProjeto.forEach(atm => {
      // Custo de frete vem de faturamento.valor_previsto (orcamento) - NUNCA do valor_nf,
      // que e' o valor da mercadoria e nao tem relacao com o custo do transporte.
      const previstoVal = Number(atm.faturamento?.valor_previsto) || Number(atm.valor_previsto) || 0;
      const realizadoVal = Number(atm.valor_realizado) || 0;
      
      const valorEfetivo = realizadoVal > 0 ? realizadoVal : previstoVal;
      tGasto += valorEfetivo;

      const dataStr = atm.faturamento?.data_emissao || atm.data_emissao || atm.data_solicitacao || atm.created_at;
      if (dataStr) {
        let mesIndex;
        if (dataStr.includes('-')) {
          mesIndex = parseInt(dataStr.split('-')[1], 10);
        } else if (dataStr.includes('/')) {
          mesIndex = parseInt(dataStr.split('/')[1], 10);
        }

        if (mesesMap[mesIndex]) {
          mesesMap[mesIndex].total += valorEfetivo;
          mesesMap[mesIndex].count += 1;
          mesesMap[mesIndex].previstoTotal += previstoVal;
          mesesMap[mesIndex].realizadoTotal += realizadoVal;
        }
      }

      // Transportadora
      const tNome = atm.transportadora?.nome || (typeof atm.transportadora === 'string' ? atm.transportadora : 'A Definir');
      if (!transMap[tNome]) transMap[tNome] = { nome: tNome, total: 0, count: 0, media: 0 };
      transMap[tNome].total += valorEfetivo;
      transMap[tNome].count += 1;

      // Rotas
      const origem = atm.origem?.municipio || 'N/A';
      const destino = atm.destino?.municipio || 'N/A';
      const rNome = `${origem} → ${destino}`;
      if (!rotasMap[rNome]) rotasMap[rNome] = { rota: rNome, count: 0, total: 0 };
      rotasMap[rNome].total += valorEfetivo;
      rotasMap[rNome].count += 1;

      // Agrupando os Motivos/Divergências
      if (atm.motivo && atm.motivo.trim() !== '') {
        const mNome = atm.motivo;
        if (!motivosMap[mNome]) motivosMap[mNome] = { nome: mNome, count: 0, total: 0 };
        motivosMap[mNome].count += 1;
        motivosMap[mNome].total += valorEfetivo;
      }
    });

    let somaAcumulada = 0;
    const mData = Object.values(mesesMap)
      .filter(m => m.count > 0)
      .map(m => {
        somaAcumulada += m.total;
        return { ...m, media: m.total / m.count, acumulado: somaAcumulada };
      }); 

    const dData = Object.values(mesesMap).map(m => {
      return {
        mes: m.mes,
        previsto: m.previstoTotal,
        realizado: m.realizadoTotal
      };
    });

    const tData = Object.values(transMap).map(t => ({ ...t, media: t.total / t.count })).sort((a, b) => b.total - a.total);
    const rData = Object.values(rotasMap).map(r => ({ ...r, media: r.total / r.count })).sort((a, b) => b.count - a.count);
    const motData = Object.values(motivosMap).sort((a, b) => b.count - a.count);

    return {
      totalGasto: tGasto,
      totalFretes: atmsDoProjeto.length,
      mediaCusto: atmsDoProjeto.length > 0 ? tGasto / atmsDoProjeto.length : 0,
      monthlyData: mData,
      transportadorasData: tData,
      rotasData: rData,
      desvioMensalData: dData,
      motivosData: motData
    };
  }, [atmsDoProjeto]);

  const tabs = [
    { id: "overview",   label: "📊 Visão Geral" },
    { id: "eficiencia", label: "⚖️ Eficiência Financeira" }, 
  ];

  return (
    <div className="acomp-wrapper">
      
      <div style={{ padding: '20px 32px 10px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <div className="acomp-header__filter-group" style={{ minWidth: '400px' }}>
          <div style={{ flex: 1 }}>
            <Select 
              options={opcoesProjeto} 
              value={projetoSelecionado} 
              onChange={setProjetoSelecionado} 
              placeholder="Busque o Projeto..." 
              isSearchable 
              styles={{ 
                control: (b) => ({ ...b, borderRadius: '8px', minHeight: '38px', border: '1px solid #cbd5e1' }),
                menu: (b) => ({ ...b, zIndex: 9999 })
              }} 
            />
          </div>
          <button 
            className="acomp-header__btn-filter"
            onClick={() => setProjetoAtivo(projetoSelecionado?.value || '')}
          >
            Buscar
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="acomp-loader">
          <Loader />
          <p className="acomp-loader__text">Processando dados...</p>
        </div>
      ) : !projetoAtivo ? (
        <div className="acomp-empty-state">
          <DollarSign size={48} color={BLUE_PALE} />
          <h3 className="acomp-empty-state__title">Selecione um Projeto no topo para gerar o relatório.</h3>
        </div>
      ) : (
        <>
          <div className="acomp-tabs">
            {tabs.map(t => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id)}
                className={`acomp-tabs__btn ${activeTab === t.id ? 'acomp-tabs__btn--active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="acomp-content u-fade-in">
            {/* ══════════════ VISÃO GERAL ══════════════ */}
            {activeTab === "overview" && (
              <div className="acomp-layout-col">
                <div className="acomp-kpi-grid">
                  <KpiCard highlight icon="💰" label="Custo Total" value={fmtK(totalGasto)} sub={`Projeto: ${projetoAtivo}`} />
                  <KpiCard icon="📦" label="Número de Fretes" value={totalFretes.toLocaleString("pt-BR")} sub="Total alocado" color={BLUE_LIGHT} />
                  <KpiCard icon="📊" label="Custo Médio / Frete" value={fmt(mediaCusto)} sub="Valor médio unitário" color={BLUE_MAIN} />
                </div>

                <div className="acomp-card">
                  <SectionHeader title="Gastos no Projeto" subtitle="Custo do mês (Barras) vs Acumulado (Linha)" />
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={monthlyData} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BLUE_PALE} vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: GRAY_MED }} />
                      <YAxis yAxisId="left" tickFormatter={v => `R$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: GRAY_MED }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => `R$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: GRAY_MED }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }}/>
                      <Bar yAxisId="left" dataKey="total" name="Gasto no Mês" fill={BLUE_MAIN} barSize={40}>
                          <LabelList dataKey="total" position="top" formatter={(val) => fmtK(val)} style={{ fontSize: 11, fill: GRAY_DARK, fontWeight: 'bold' }} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Total Acumulado" stroke={ACCENT} strokeWidth={3} dot={{ r: 5, fill: ACCENT }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <ChartDataTable 
                    data={monthlyData} 
                    categoryKey="mes" 
                    series={[
                      { key: 'total', name: 'Gasto no Mês', color: BLUE_MAIN, formatter: fmt },
                      { key: 'acumulado', name: 'Total Acumulado', color: ACCENT, formatter: fmt }
                    ]} 
                  />
                </div>

                <div className="acomp-card">
                  <SectionHeader title="Desvio Financeiro: Previsto vs Realizado" subtitle="Linha = Orçamento | Coluna = Gasto Realizado (Laranja caso ultrapasse o previsto)" />
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={desvioMensalData} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BLUE_PALE} vertical={false} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: GRAY_MED }} />
                      <YAxis tickFormatter={v => `R$ ${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: GRAY_MED }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      
                      <Bar dataKey="realizado" name="Gasto Realizado" barSize={40}>
                        {desvioMensalData.map((entry, index) => {
                          const corBarra = entry.realizado > entry.previsto ? ACCENT : BLUE_LIGHT;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={corBarra} 
                            />
                          );
                        })}
                      </Bar>
                      
                      <Line type="monotone" dataKey="previsto" name="Orçamento Previsto" stroke={BLUE_MAIN} strokeWidth={3} dot={{ r: 5, fill: BLUE_MAIN }} />
                      
                    </ComposedChart>
                  </ResponsiveContainer>
                  <ChartDataTable 
                    data={desvioMensalData} 
                    categoryKey="mes" 
                    series={[
                      { key: 'previsto', name: 'Previsto', color: BLUE_MAIN, formatter: fmt },
                      { key: 'realizado', name: 'Realizado', color: BLUE_LIGHT, formatter: fmt }
                    ]} 
                  />
                </div>
              </div>
            )}

            {/* ══════════════ EFICIÊNCIA FINANCEIRA ══════════════ */}
            {activeTab === "eficiencia" && (
              <div className="acomp-layout-col">
                
                <SectionHeader title="Eficiência de Rotas" subtitle="Comparativo Unificado: Volume de Viagens vs Ticket Médio" />
                <div className="acomp-card" style={{ marginBottom: '20px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={rotasData.slice(0, 5)} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BLUE_PALE} vertical={false} />
                      <XAxis dataKey="rota" tick={{ fontSize: 11, fill: GRAY_MED }} interval={0} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: GRAY_MED }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => `R$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: GRAY_MED }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      
                      <Bar yAxisId="left" dataKey="count" name="Qtd. de Fretes" fill={BLUE_MAIN} barSize={35} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: GRAY_DARK, fontWeight: 'bold' }} />
                      </Bar>
                      <Bar yAxisId="right" dataKey="media" name="Custo Médio" fill={ACCENT} barSize={35} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="media" position="top" formatter={(val) => fmtK(val)} style={{ fontSize: 11, fill: GRAY_DARK, fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartDataTable 
                    data={rotasData.slice(0, 5)} 
                    categoryKey="rota" 
                    series={[
                      { key: 'count', name: 'Qtd. de Fretes', color: BLUE_MAIN },
                      { key: 'media', name: 'Custo Médio', color: ACCENT, formatter: fmt }
                    ]} 
                  />
                </div>

                <SectionHeader title="Eficiência de Transportadoras" subtitle="Comparativo Unificado: Volume de Viagens vs Ticket Médio" />
                <div className="acomp-card" style={{ marginBottom: '20px' }}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={transportadorasData.slice(0, 5)} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BLUE_PALE} vertical={false} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11, fill: GRAY_MED }} interval={0} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: GRAY_MED }} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={v => `R$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: GRAY_MED }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      
                      <Bar yAxisId="left" dataKey="count" name="Qtd. de Fretes" fill={BLUE_LIGHT} barSize={35} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: GRAY_DARK, fontWeight: 'bold' }} />
                      </Bar>
                      <Bar yAxisId="right" dataKey="media" name="Custo Médio" fill={ACCENT} barSize={35} radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="media" position="top" formatter={(val) => fmtK(val)} style={{ fontSize: 11, fill: GRAY_DARK, fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <ChartDataTable 
                    data={transportadorasData.slice(0, 5)} 
                    categoryKey="nome" 
                    series={[
                      { key: 'count', name: 'Qtd. de Fretes', color: BLUE_LIGHT },
                      { key: 'media', name: 'Custo Médio', color: ACCENT, formatter: fmt }
                    ]} 
                  />
                </div>

                {motivosData && motivosData.length > 0 && (
                  <>
                    <SectionHeader title="Análise de Motivos e Divergências" subtitle="Impacto financeiro e volume por tipo de ocorrência" />
                    <div className="acomp-card" style={{ marginBottom: '20px' }}>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={motivosData.slice(0, 5)} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={BLUE_PALE} vertical={false} />
                          <XAxis dataKey="nome" tick={{ fontSize: 11, fill: GRAY_MED }} interval={0} />
                          <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10, fill: GRAY_MED }} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={v => `R$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 10, fill: GRAY_MED }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          
                          <Bar yAxisId="left" dataKey="count" name="Qtd. de Ocorrências" fill={DANGER} barSize={35} radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: GRAY_DARK, fontWeight: 'bold' }} />
                          </Bar>
                          <Bar yAxisId="right" dataKey="total" name="Custo Impactado" fill={ACCENT} barSize={35} radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="total" position="top" formatter={(val) => fmtK(val)} style={{ fontSize: 11, fill: GRAY_DARK, fontWeight: 'bold' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <ChartDataTable 
                        data={motivosData.slice(0, 5)} 
                        categoryKey="nome" 
                        series={[
                          { key: 'count', name: 'Qtd. de Ocorrências', color: DANGER },
                          { key: 'total', name: 'Custo Impactado', color: ACCENT, formatter: fmt }
                        ]} 
                      />
                    </div>
                  </>
                )}

              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
