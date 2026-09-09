// TELA: Dashboard — painel operacional compacto
function TelaDashboard({ chamados }) {
    const [filtro, setFiltro] = React.useState({ tipo: 'dias', valor: 30 });
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [detalhes, setDetalhes] = React.useState(null);
    const [atualizadoEm, setAtualizadoEm] = React.useState(new Date());

    const periodoLabel = filtro.tipo === 'intervalo' ? filtro.label : (filtro.valor === null ? 'Todo o período' : `Últimos ${filtro.valor} dias`);

    const chamadosFiltrados = React.useMemo(() => {
        let base = chamados;
        if (unidadeFiltro !== 'TODOS') base = base.filter(c => (c.unidade || 'MATRIZ') === unidadeFiltro);
        if (statusFiltro !== 'TODOS') base = base.filter(c => (c.status || (c.concluido ? 'FECHADO' : 'ABERTO')) === statusFiltro);
        return filtro.tipo === 'intervalo' ? filtrarChamadosPorIntervalo(base, filtro.inicio, filtro.fim) : filtrarChamadosPorPeriodo(base, filtro.valor);
    }, [chamados, filtro, unidadeFiltro, statusFiltro]);

    const resumo = React.useMemo(() => calcularResumoGeral(chamadosFiltrados), [chamadosFiltrados]);
    const metricasServico = React.useMemo(() => calcularMetricasPorServico(chamadosFiltrados), [chamadosFiltrados]);
    const distPrioridade = React.useMemo(() => calcularDistribuicaoPorPrioridade(chamadosFiltrados), [chamadosFiltrados]);
    const distStatus = React.useMemo(() => calcularDistribuicaoPorStatus(chamadosFiltrados), [chamadosFiltrados]);
    const maiorTotalServico = Math.max(1, ...metricasServico.map(m => m.total));

    const serieTemporal = React.useMemo(() => {
        const dias = [];
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        for (let i = 13; i >= 0; i--) {
            const d = new Date(hoje); d.setDate(d.getDate() - i);
            const fim = new Date(d); fim.setHours(23, 59, 59, 999);
            let qtd = 0;
            try { qtd = filtrarChamadosPorIntervalo(chamadosFiltrados, d, fim).length; } catch { qtd = 0; }
            dias.push({ data: d, qtd });
        }
        return dias;
    }, [chamadosFiltrados]);
    const maxSerie = Math.max(1, ...serieTemporal.map(p => p.qtd));

    const emAberto = React.useMemo(() => chamadosFiltrados
        .filter(c => !c.concluido)
        .sort((a, b) => {
            const ua = a.prioridade === 'Urgente';
            const ub = b.prioridade === 'Urgente';
            if (ua !== ub) return ua ? -1 : 1;
            return calcularDiasDecorridos(b.dataAbertura) - calcularDiasDecorridos(a.dataAbertura);
        })
        .slice(0, 6), [chamadosFiltrados]);

    const recentes = React.useMemo(() => [...chamadosFiltrados]
        .sort((a, b) => {
            const da = (typeof parseDataBR === 'function' && parseDataBR(a.dataAbertura)) || new Date(0);
            const db = (typeof parseDataBR === 'function' && parseDataBR(b.dataAbertura)) || new Date(0);
            return db - da;
        })
        .slice(0, 6), [chamadosFiltrados]);

    const atualizar = () => {
        setAtualizadoEm(new Date());
    };

    const horaAtualizada = atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const Ind = ({ rotulo, valor }) => (
        <div className="min-w-0 flex-1 px-2 py-3 text-center sm:px-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{rotulo}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">{valor}</div>
        </div>
    );

    const corPrioridade = { 'Urgente': '#ef4444', 'Alta': '#f97316', 'Média': '#eab308', 'Baixa': '#94a3b8' };
    const maiorPrioridade = Math.max(1, ...Object.values(distPrioridade));

    return (
        <div className="fade-in w-full">
            {detalhes && <ModalDetalhes chamado={detalhes} aoFechar={() => setDetalhes(null)} aoImprimir={(c) => imprimirOrdemServico(c)} />}

            <PageHeader
                title="Dashboard"
                meta={periodoLabel}
                actions={
                    <React.Fragment>
                        <LiveDot label={`Atualizado ${horaAtualizada}`} />
                        <button onClick={atualizar} className="btn-ghost">Atualizar</button>
                        <button onClick={() => imprimirRelatorioMetricas(resumo, metricasServico, `${periodoLabel} — ${unidadeFiltro}`)} className="btn-ghost">PDF</button>
                    </React.Fragment>
                }
            />

            <div className="mb-4 flex flex-wrap gap-2">
                <select value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)} aria-label="Filial" className="u-input sm:max-w-[160px]">
                    <option value="TODOS">Filial: todas</option>
                    <option value="MATRIZ">Matriz</option>
                    <option value="PECÉM">Pecém</option>
                </select>
                <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} aria-label="Status" className="u-input sm:max-w-[180px]">
                    <option value="TODOS">Status: todos</option>
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
                }} aria-label="Período" className="u-input sm:max-w-[180px]">
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                    <option value="Tudo">Todo período</option>
                    <option value="Hoje">Hoje</option>
                    <option value="Ontem">Ontem</option>
                    <option value="Mês atual">Mês atual</option>
                    <option value="Mês anterior">Mês anterior</option>
                </select>
                {(statusFiltro !== 'TODOS' || unidadeFiltro !== 'TODOS' || filtro.tipo === 'intervalo' || filtro.valor !== 30) && (
                    <button onClick={() => { setStatusFiltro('TODOS'); setUnidadeFiltro('TODOS'); setFiltro({ tipo: 'dias', valor: 30 }); }} className="px-2 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200">Limpar</button>
                )}
            </div>

            <section className="u-surface mb-5">
                <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700 sm:grid-cols-4">
                    <Ind rotulo="Total" valor={resumo.total} />
                    <Ind rotulo="Abertos" valor={resumo.abertos} />
                    <Ind rotulo="Em atendimento" valor={resumo.emAtendimento} />
                    <Ind rotulo="Concluídos" valor={resumo.encerrados} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 border-t u-divider px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Tempo médio <strong className="font-medium text-slate-700 dark:text-slate-200">{formatarHoras(resumo.tempoMedioResolucao)}</strong></span>
                    <span>Taxa de resolução <strong className="font-medium text-slate-700 dark:text-slate-200">{resumo.taxaResolucao}%</strong></span>
                    <span>Atrasados <strong className={`font-medium ${resumo.atrasados ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{resumo.atrasados}</strong></span>
                    <span>Sem atendimento <strong className="font-medium text-slate-700 dark:text-slate-200">{resumo.pendentesSemAtendimento}</strong></span>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section>
                    <SectionTitle>Em aberto</SectionTitle>
                    {emAberto.length === 0 ? (
                        <p className="py-2 text-xs text-slate-500">Nenhum chamado em aberto no período.</p>
                    ) : (
                        <ul className="divide-y u-divider border-y u-divider">
                            {emAberto.map(c => (
                                <li key={c.idFirebase}>
                                    <button onClick={() => setDetalhes(c)} className="flex w-full items-center gap-3 py-2 text-left">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm text-slate-700 dark:text-slate-200">{c.equipamento}</span>
                                            <ProtocoloTag codigo={c.protocolo} />
                                        </span>
                                        <PriorityBadge prioridade={c.prioridade} />
                                        <span className="w-14 shrink-0 text-right"><TempoAberto dataAbertura={c.dataAbertura} /></span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <SectionTitle>Atividade</SectionTitle>
                    {recentes.length === 0 ? (
                        <p className="py-2 text-xs text-slate-500">Sem atividade no período.</p>
                    ) : (
                        <ul className="divide-y u-divider border-y u-divider">
                            {recentes.map(c => (
                                <li key={c.idFirebase}>
                                    <button onClick={() => setDetalhes(c)} className="flex w-full items-center gap-3 py-2 text-left">
                                        <span className="w-9 shrink-0 font-mono text-xs text-slate-400" title={c.dataAbertura}>{horaCurta(c.dataAbertura)}</span>
                                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{c.equipamento}</span>
                                        <StatusBadge status={c.status} concluido={c.concluido} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <section className="mt-6">
                <SectionTitle>Por serviço</SectionTitle>
                {metricasServico.length === 0 ? (
                    <p className="py-2 text-xs text-slate-500">Nenhum chamado no período.</p>
                ) : (
                    <div className="u-surface overflow-x-auto">
                        <table className="u-table">
                            <thead><tr><th>Serviço</th><th className="!text-right">Total</th><th className="!text-right">Abertos</th><th className="!text-right">Concluídos</th><th className="!text-right">Tempo médio</th><th className="!text-right">Atrasados</th><th className="!text-right">Taxa</th></tr></thead>
                            <tbody>
                                {metricasServico.map(m => (
                                    <tr key={m.servico}>
                                        <td><ServiceBadge servico={m.servico} /></td>
                                        <td className="text-right font-medium tabular-nums">{m.total}</td>
                                        <td className="text-right tabular-nums text-amber-600 dark:text-amber-400">{m.abertos}</td>
                                        <td className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">{m.encerrados}</td>
                                        <td className="text-right tabular-nums">{formatarHoras(m.tempoMedioHoras)}</td>
                                        <td className="text-right tabular-nums text-red-600 dark:text-red-400">{m.atrasados}</td>
                                        <td className="text-right tabular-nums">{m.taxaResolucao}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section>
                    <SectionTitle>Prioridade</SectionTitle>
                    <div className="space-y-2">
                        {Object.entries(distPrioridade).map(([p, qtd]) => (
                            <div key={p} className="flex items-center gap-2.5">
                                <span className="w-[52px] shrink-0 text-xs text-slate-500 dark:text-slate-400">{p}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div className="h-full rounded-full" style={{ width: `${(qtd / maiorPrioridade) * 100}%`, background: corPrioridade[p] || '#94a3b8' }}></div>
                                </div>
                                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-700 dark:text-slate-200">{qtd}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <SectionTitle>Status</SectionTitle>
                        <PieChart data={distStatus} colors={{ ABERTO: '#94a3b8', EM_ANALISE: '#0ea5e9', ATRIBUIDO: '#6366f1', EM_ATENDIMENTO: '#f59e0b', AGUARDANDO_USUARIO: '#f97316', RESOLVIDO: '#10b981', FECHADO: '#059669' }} />
                    </div>
                </section>
                <div>
                    <section>
                        <SectionTitle>Recorrências</SectionTitle>
                        {metricasServico.filter(m => m.recorrentes > 0).length === 0 ? (
                            <p className="py-2 text-xs text-slate-500">Nenhuma recorrência no período.</p>
                        ) : (
                            <ul className="divide-y u-divider border-y u-divider">
                                {metricasServico.filter(m => m.recorrentes > 0).slice(0, 5).map(m => (
                                    <li key={m.servico} className="flex items-center justify-between py-2">
                                        <ServiceBadge servico={m.servico} />
                                        <span className="text-xs tabular-nums text-slate-500">{m.recorrentes} ×</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                    <section className="mt-6">
                        <SectionTitle>Histórico</SectionTitle>
                        <div className="flex h-24 items-end gap-1">
                            {serieTemporal.map((p, i) => (
                                <div key={i} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1 self-stretch" title={`${p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}: ${p.qtd}`}>
                                    <div className="w-full rounded-sm bg-slate-300 dark:bg-slate-700" style={{ height: `${Math.max(p.qtd > 0 ? 6 : 2, (p.qtd / maxSerie) * 100)}%` }}></div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-1.5 text-[11px] tabular-nums text-slate-400">Últimos 14 dias</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
