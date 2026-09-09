// ==========================================================
// TELA: Dashboard — painel operacional (contexto → números →
// análise). Lógica de filtros/métricas preservada; apenas a
// composição foi redesenhada: faixa integrada, sem 8 cards.
// ==========================================================
function TelaDashboard({ chamados, voltar }) {
    const [filtro, setFiltro] = React.useState({ tipo: 'dias', valor: 30 });
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [expandReinc, setExpandReinc] = React.useState(false);
    const [detalhes, setDetalhes] = React.useState(null);
    const [refreshKey, setRefreshKey] = React.useState(0);
    const [atualizadoEm, setAtualizadoEm] = React.useState(new Date());

    const periodoLabel = filtro.tipo === 'intervalo' ? filtro.label : (filtro.valor === null ? 'Todo o período' : `Últimos ${filtro.valor} dias`);

    const chamadosFiltrados = React.useMemo(() => {
        let base = chamados;
        if (unidadeFiltro !== 'TODOS') base = base.filter(c => (c.unidade || 'MATRIZ') === unidadeFiltro);
        if (statusFiltro !== 'TODOS') base = base.filter(c => (c.status || (c.concluido ? 'FECHADO' : 'ABERTO')) === statusFiltro);
        return filtro.tipo === 'intervalo' ? filtrarChamadosPorIntervalo(base, filtro.inicio, filtro.fim) : filtrarChamadosPorPeriodo(base, filtro.valor);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chamados, filtro, unidadeFiltro, statusFiltro, refreshKey]);

    const resumo = React.useMemo(() => calcularResumoGeral(chamadosFiltrados), [chamadosFiltrados]);
    const metricasServico = React.useMemo(() => calcularMetricasPorServico(chamadosFiltrados), [chamadosFiltrados]);
    const distPrioridade = React.useMemo(() => calcularDistribuicaoPorPrioridade(chamadosFiltrados), [chamadosFiltrados]);
    const distUnidade = React.useMemo(() => calcularDistribuicaoPorUnidade(chamadosFiltrados), [chamadosFiltrados]);
    const distStatus = React.useMemo(() => calcularDistribuicaoPorStatus(chamadosFiltrados), [chamadosFiltrados]);
    const maiorTotalServico = Math.max(1, ...metricasServico.map(m => m.total));

    // Série temporal: chamados por dia (últimos 14 dias dentro do filtro)
    const serieTemporal = React.useMemo(() => {
        const dias = [];
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        for (let i = 13; i >= 0; i--) {
            const d = new Date(hoje); d.setDate(d.getDate() - i);
            const fim = new Date(d); fim.setHours(23, 59, 59, 999);
            let qtd = 0;
            try { qtd = filtrarChamadosPorIntervalo(chamadosFiltrados, d, fim).length; } catch { qtd = 0; }
            dias.push({ data: d, qtd, hoje: i === 0 });
        }
        return dias;
    }, [chamadosFiltrados]);

    const maxSerie = Math.max(1, ...serieTemporal.map(p => p.qtd));

    // Críticos: urgentes ou atrasados ainda abertos
    const criticos = React.useMemo(() => chamadosFiltrados
        .filter(c => !c.concluido && (c.prioridade === 'Urgente' || calcularDiasDecorridos(c.dataAbertura) > 3))
        .sort((a, b) => priorityWeights[a.prioridade] - priorityWeights[b.prioridade])
        .slice(0, 5), [chamadosFiltrados]);

    // Atividade recente: últimos 5 por data de abertura
    const recentes = React.useMemo(() => [...chamadosFiltrados]
        .sort((a, b) => {
            const da = (typeof parseDataBR === 'function' && parseDataBR(a.dataAbertura)) || new Date(0);
            const db = (typeof parseDataBR === 'function' && parseDataBR(b.dataAbertura)) || new Date(0);
            return db - da;
        })
        .slice(0, 5), [chamadosFiltrados]);

    const aguardando = chamadosFiltrados.filter(c => !c.concluido && (c.status === 'AGUARDANDO_USUARIO' || c.status === 'ATRIBUIDO')).length;

    const atualizar = () => {
        setRefreshKey(k => k + 1);
        setAtualizadoEm(new Date());
        window.notifySuccess && window.notifySuccess('Dados atualizados');
    };

    const horaAtualizada = atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const StatDestaque = ({ valor, rotulo, tom = '', sub }) => (
        <div className="min-w-0 flex-1 px-1.5 py-3.5 text-center sm:px-6 sm:py-4">
            <div className={`text-[22px] sm:text-[26px] font-extrabold tabular-nums leading-none tracking-tight ${tom}`}>{valor}</div>
            <div className="mt-1.5 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">{rotulo}</div>
            {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
        </div>
    );

    const corPrioridade = { 'Urgente': '#ef4444', 'Alta': '#f97316', 'Média': '#eab308', 'Baixa': '#94a3b8' };
    const maiorPrioridade = Math.max(1, ...Object.values(distPrioridade));

    return (
        <div className="fade-in w-full">
            {detalhes && <ModalDetalhes chamado={detalhes} aoFechar={() => setDetalhes(null)} aoImprimir={(c) => imprimirOrdemServico(c)} />}

            <PageHeader
                eyebrow="Manutenção · Dashboard"
                title="Visão geral dos chamados"
                live
                updatedAt={`Atualizado às ${horaAtualizada}`}
                back={voltar}
                backLabel="Menu"
                actions={
                    <React.Fragment>
                        <button onClick={atualizar} className="btn-ghost" title="Atualizar dados">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            Atualizar
                        </button>
                        <button onClick={() => imprimirRelatorioMetricas(resumo, metricasServico, `${periodoLabel} — ${unidadeFiltro}`)} className="btn-ghost">PDF</button>
                    </React.Fragment>
                }
            />

            {/* Filtros integrados */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[150px] flex-1 sm:max-w-[220px]">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">Filial ▾</span>
                    <select value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)} aria-label="Filial" className="u-input !pl-9">
                        <option value="TODOS">Todas</option>
                        <option value="MATRIZ">Matriz</option>
                        <option value="PECÉM">Pecém</option>
                    </select>
                </div>
                <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} aria-label="Status" className="u-input min-w-[130px] flex-1 sm:max-w-[190px]">
                    <option value="TODOS">Todos status ▾</option>
                    <option value="ABERTO">Aberto</option>
                    <option value="EM_ATENDIMENTO">Em atendimento</option>
                    <option value="AGUARDANDO_USUARIO">Parcial</option>
                    <option value="ATRIBUIDO">Atribuído</option>
                    <option value="FECHADO">Encerrado</option>
                </select>
                <select value={filtro.tipo === 'intervalo' ? filtro.label : filtro.valor === 7 ? '7d' : filtro.valor === 30 ? '30d' : filtro.valor === 90 ? '90d' : filtro.valor === null ? 'Tudo' : '7d'} onChange={e => {
                    const v = e.target.value;
                    if (v === 'Hoje') { const { inicio, fim } = obterIntervaloHoje(); setFiltro({ tipo: 'intervalo', inicio, fim, label: 'Hoje' }); }
                    else if (v === 'Ontem') { const { inicio, fim } = obterIntervaloOntem(); setFiltro({ tipo: 'intervalo', inicio, fim, label: 'Ontem' }); }
                    else if (v === 'Mês atual') { const { inicio, fim } = obterIntervaloMesAtual(); setFiltro({ tipo: 'intervalo', inicio, fim, label: 'Mês atual' }); }
                    else if (v === 'Mês anterior') { const { inicio, fim } = obterIntervaloMesAnterior(); setFiltro({ tipo: 'intervalo', inicio, fim, label: 'Mês anterior' }); }
                    else if (v === 'Tudo') setFiltro({ tipo: 'dias', valor: null });
                    else setFiltro({ tipo: 'dias', valor: parseInt(v) || 30 });
                }} aria-label="Período" className="u-input min-w-[140px] flex-1 sm:max-w-[190px]">
                    <option value="7d">Últimos 7 dias ▾</option>
                    <option value="30d">Últimos 30 dias ▾</option>
                    <option value="90d">Últimos 90 dias ▾</option>
                    <option value="Tudo">Todo período ▾</option>
                    <option value="Hoje">Hoje</option>
                    <option value="Ontem">Ontem</option>
                    <option value="Mês atual">Mês atual</option>
                    <option value="Mês anterior">Mês anterior</option>
                </select>
                {(statusFiltro !== 'TODOS' || unidadeFiltro !== 'TODOS' || filtro.tipo === 'intervalo' || filtro.valor !== 30) && (
                    <button onClick={() => { setStatusFiltro('TODOS'); setUnidadeFiltro('TODOS'); setFiltro({ tipo: 'dias', valor: 30 }); }} className="px-2 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800 dark:hover:text-white">Limpar</button>
                )}
            </div>

            {/* Faixa integrada de indicadores */}
            <section key={refreshKey} className="flash-update u-surface mb-4">
                <div className="flex divide-x divide-slate-100 dark:divide-white/[0.06]">
                    <StatDestaque valor={resumo.abertos} rotulo="abertos" tom="text-slate-900 dark:text-white" />
                    <StatDestaque valor={resumo.emAtendimento} rotulo="em atendimento" tom="text-slate-900 dark:text-white" />
                    <StatDestaque valor={aguardando} rotulo="aguardando" tom="text-slate-900 dark:text-white" />
                    <StatDestaque valor={`${resumo.taxaResolucao}%`} rotulo="resolução" tom="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t u-divider px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400 sm:px-6">
                    <span><strong className="font-bold text-slate-700 dark:text-slate-200">{resumo.total}</strong> no período</span>
                    <span><strong className="font-bold text-slate-700 dark:text-slate-200">{resumo.encerrados}</strong> encerrados</span>
                    <span>Tempo médio <strong className="font-bold text-slate-700 dark:text-slate-200">{formatarHoras(resumo.tempoMedioResolucao)}</strong></span>
                    <span><strong className={`font-bold ${resumo.atrasados ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{resumo.atrasados}</strong> atrasados</span>
                    <span><strong className="font-bold text-slate-700 dark:text-slate-200">{resumo.pendentesSemAtendimento}</strong> sem atendimento</span>
                </div>
            </section>

            {/* Análise: evolução + distribuição */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle>Chamados ao longo do tempo</SectionTitle>
                    <div className="flex h-32 items-end gap-1.5" role="img" aria-label="Chamados por dia nos últimos 14 dias">
                        {serieTemporal.map((p, i) => (
                            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: ${p.qtd}`}>
                                <span className="text-[10px] font-semibold tabular-nums text-slate-400">{p.qtd > 0 ? p.qtd : ''}</span>
                                <div className="flex h-20 w-full items-end">
                                    <div className={`w-full rounded-sm transition-all ${p.hoje ? 'bg-[#0E3263] dark:bg-white' : 'bg-slate-200 dark:bg-white/15'}`} style={{ height: `${Math.max(p.qtd > 0 ? 8 : 2, (p.qtd / maxSerie) * 100)}%` }}></div>
                                </div>
                                {(i % 2 === 0 || p.hoje) && <span className={`text-[9px] tabular-nums ${p.hoje ? 'font-bold text-[#0E3263] dark:text-white' : 'text-slate-400'}`}>{p.data.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>}
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">Últimos 14 dias • {periodoLabel}</p>
                </section>

                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle>Distribuição por status</SectionTitle>
                    <PieChart data={distStatus} colors={{ ABERTO: '#94a3b8', EM_ANALISE: '#0ea5e9', ATRIBUIDO: '#6366f1', EM_ATENDIMENTO: '#f59e0b', AGUARDANDO_USUARIO: '#f97316', RESOLVIDO: '#10b981', FECHADO: '#059669' }} />
                </section>
            </div>

            {/* Críticos + atividade */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle action={criticos.length > 0 ? <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">{criticos.length}</span> : null}>
                        Chamados críticos
                    </SectionTitle>
                    {criticos.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-500">Nenhum chamado crítico no período.</p>
                    ) : (
                        <ul className="divide-y u-divider">
                            {criticos.map(c => (
                                <li key={c.idFirebase}>
                                    <button onClick={() => setDetalhes(c)} className="flex w-full items-center gap-3 py-2.5 text-left">
                                        <span className="h-8 w-1 shrink-0 rounded-full bg-red-500/80"></span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{c.equipamento}</span>
                                            <ProtocoloTag codigo={c.protocolo} />
                                        </span>
                                        <span className="flex shrink-0 flex-col items-end gap-1">
                                            <PriorityBadge prioridade={c.prioridade} />
                                            <TempoAberto dataAbertura={c.dataAbertura} />
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle>Atividade recente</SectionTitle>
                    {recentes.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-500">Sem atividade no período.</p>
                    ) : (
                        <ul className="divide-y u-divider">
                            {recentes.map(c => (
                                <li key={c.idFirebase}>
                                    <button onClick={() => setDetalhes(c)} className="flex w-full items-center gap-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{c.equipamento}</span>
                                            <span className="mt-0.5 block text-[11px] text-slate-400">{formatarApenasData(c.dataAbertura)} • {c.unidade || 'MATRIZ'}</span>
                                        </span>
                                        <StatusBadge status={c.status} concluido={c.concluido} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/* Reincidências (colapsável) */}
            <section className="u-surface mt-4">
                <button onClick={() => setExpandReinc(v => !v)} className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left sm:px-5">
                    <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-[13px]">⚠</span>
                        <span>
                            <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-100">Reincidências</span>
                            <span className="block text-[11px] text-slate-400">{metricasServico.reduce((a, m) => a + m.recorrentes, 0)} equipamentos repetidos</span>
                        </span>
                    </span>
                    <svg className={`h-4 w-4 text-slate-400 transition ${expandReinc ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {expandReinc && (
                    <div className="border-t u-divider px-4 py-3 sm:px-5">
                        {metricasServico.filter(m => m.recorrentes > 0).length === 0 ? (
                            <p className="py-3 text-center text-xs text-slate-500">Nenhuma reincidência — ótimo.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {metricasServico.filter(m => m.recorrentes > 0).slice(0, 5).map(m => (
                                    <li key={m.servico} className="flex w-full items-center justify-between rounded-lg px-3 py-2">
                                        <ServiceBadge servico={m.servico} />
                                        <span className="text-[13px] font-bold text-amber-700 dark:text-amber-300">{m.recorrentes} ×</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="mt-2 text-[11px] text-slate-400">Mesmo equipamento com &gt;1 chamado do mesmo serviço no período.</p>
                    </div>
                )}
            </section>

            {/* Prioridade + unidade */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle>Por prioridade</SectionTitle>
                    <div className="space-y-2.5">
                        {Object.entries(distPrioridade).map(([p, qtd]) => (
                            <div key={p} className="flex items-center gap-2.5">
                                <span className="w-[52px] shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{p}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${(qtd / maiorPrioridade) * 100}%`, background: corPrioridade[p] || '#94a3b8' }}></div>
                                </div>
                                <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{qtd}</span>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle>Por unidade</SectionTitle>
                    <div className="space-y-1.5">
                        {Object.entries(distUnidade).length === 0 && <p className="py-3 text-center text-xs text-slate-500">Sem dados no período.</p>}
                        {Object.entries(distUnidade).map(([u, qtd]) => (
                            <div key={u} className="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-white/5">
                                <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{u}</span>
                                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{qtd}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Indicadores por serviço */}
            <section className="u-surface mt-4 overflow-hidden">
                <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                    <SectionTitle>Indicadores por serviço</SectionTitle>
                </div>
                {metricasServico.length === 0 && <p className="px-5 pb-6 text-center text-xs text-slate-500">Nenhum chamado no período.</p>}
                {metricasServico.length > 0 && (
                    <React.Fragment>
                        <div className="space-y-px px-2 pb-2 md:hidden">
                            {metricasServico.map(m => (
                                <div key={m.servico} className="rounded-lg px-3 py-2.5">
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <ServiceBadge servico={m.servico} />
                                        <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{m.total}</span>
                                    </div>
                                    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                                        <div className="h-full rounded-full bg-[#0E3263] dark:bg-white" style={{ width: `${(m.total / maiorTotalServico) * 100}%` }}></div>
                                    </div>
                                    <div className="mt-1.5 grid grid-cols-4 gap-1 text-[11px] text-slate-400">
                                        <span><strong className="font-semibold text-slate-600 dark:text-slate-300">{m.abertos}</strong> abertos</span>
                                        <span><strong className="font-semibold text-slate-600 dark:text-slate-300">{m.encerrados}</strong> ok</span>
                                        <span><strong className="font-semibold text-slate-600 dark:text-slate-300">{formatarHoras(m.tempoMedioHoras)}</strong></span>
                                        <span><strong className={`font-semibold ${m.atrasados ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>{m.atrasados}</strong> atras.</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="u-table">
                                <thead><tr><th>Serviço</th><th className="!text-center">Total</th><th className="!text-center">Abertos</th><th className="!text-center">Encerrados</th><th className="!text-center">Tempo médio</th><th className="!text-center">Atrasados</th><th className="!text-center">Taxa</th></tr></thead>
                                <tbody>
                                    {metricasServico.map(m => (
                                        <tr key={m.servico}>
                                            <td><ServiceBadge servico={m.servico} /></td>
                                            <td className="text-center font-bold tabular-nums">{m.total}</td>
                                            <td className="text-center tabular-nums text-amber-600">{m.abertos}</td>
                                            <td className="text-center tabular-nums text-emerald-600">{m.encerrados}</td>
                                            <td className="text-center tabular-nums">{formatarHoras(m.tempoMedioHoras)}</td>
                                            <td className="text-center tabular-nums text-red-600">{m.atrasados}</td>
                                            <td className="text-center tabular-nums">{m.taxaResolucao}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </React.Fragment>
                )}
            </section>
        </div>
    );
}
