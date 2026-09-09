// TELA: Dashboard — composição operacional com identidade
function TelaDashboard({ chamados }) {
    const [filtro, setFiltro] = React.useState({ tipo: 'dias', valor: 30 });
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [detalhes, setDetalhes] = React.useState(null);
    const [atualizadoEm, setAtualizadoEm] = React.useState(new Date());

    const periodoLabel = filtro.tipo === 'intervalo' ? filtro.label : (filtro.valor === null ? 'Todo o período' : `Últimos ${filtro.valor} dias`);

    const baseFiltro = React.useMemo(() => {
        let base = chamados;
        if (unidadeFiltro !== 'TODOS') base = base.filter(c => (c.unidade || 'MATRIZ') === unidadeFiltro);
        if (statusFiltro !== 'TODOS') base = base.filter(c => (c.status || (c.concluido ? 'FECHADO' : 'ABERTO')) === statusFiltro);
        return base;
    }, [chamados, unidadeFiltro, statusFiltro]);

    const chamadosFiltrados = React.useMemo(() => {
        return filtro.tipo === 'intervalo' ? filtrarChamadosPorIntervalo(baseFiltro, filtro.inicio, filtro.fim) : filtrarChamadosPorPeriodo(baseFiltro, filtro.valor);
    }, [baseFiltro, filtro]);

    // Janela anterior equivalente (para tendências honestas)
    const prevLista = React.useMemo(() => {
        try {
            if (filtro.tipo === 'intervalo' && filtro.inicio && filtro.fim) {
                const dur = filtro.fim - filtro.inicio;
                return filtrarChamadosPorIntervalo(baseFiltro, new Date(filtro.inicio - dur), filtro.inicio);
            }
            if (filtro.tipo === 'dias' && filtro.valor) {
                const fim = new Date(); fim.setHours(0, 0, 0, 0); fim.setDate(fim.getDate() - filtro.valor);
                const inicio = new Date(fim); inicio.setDate(inicio.getDate() - filtro.valor);
                return filtrarChamadosPorIntervalo(baseFiltro, inicio, fim);
            }
        } catch {}
        return null;
    }, [baseFiltro, filtro]);

    const mesmoDia = (dataStr, ref) => {
        try {
            const dt = parseDataBR(dataStr);
            return dt && dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth() && dt.getDate() === ref.getDate();
        } catch { return false; }
    };

    const resumo = React.useMemo(() => calcularResumoGeral(chamadosFiltrados), [chamadosFiltrados]);
    const metricasServico = React.useMemo(() => calcularMetricasPorServico(chamadosFiltrados), [chamadosFiltrados]);
    const distStatus = React.useMemo(() => calcularDistribuicaoPorStatus(chamadosFiltrados), [chamadosFiltrados]);
    const maiorTotalServico = Math.max(1, ...metricasServico.map(m => m.total));

    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    const abertosHoje = chamadosFiltrados.filter(c => !c.concluido && mesmoDia(c.dataAbertura, hoje)).length;
    const abertosOntem = chamadosFiltrados.filter(c => !c.concluido && mesmoDia(c.dataAbertura, ontem)).length;
    const conclHoje = chamadosFiltrados.filter(c => c.concluido && mesmoDia(c.dataEncerramento, hoje)).length;
    const conclOntem = chamadosFiltrados.filter(c => c.concluido && mesmoDia(c.dataEncerramento, ontem)).length;
    const aguardando = chamadosFiltrados.filter(c => !c.concluido && (c.status === 'AGUARDANDO_USUARIO' || c.status === 'ATRIBUIDO')).length;

    const Delta = ({ valor, bomQuandoSobe }) => {
        if (!valor) return null;
        const sobe = valor > 0;
        const cls = sobe
            ? (bomQuandoSobe ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')
            : (bomQuandoSobe ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400');
        return <span className={`text-xs tabular-nums ${cls}`}>{sobe ? '↑' : '↓'} {Math.abs(valor)} desde ontem</span>;
    };

    const Ind = ({ rotulo, valor, icon, extra }) => (
        <div className="min-w-0 flex-1 px-3 py-3.5 sm:px-4">
            <div className="flex items-center gap-2">
                <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 min-[400px]:flex dark:bg-slate-800 dark:text-slate-400">{icon}</span>
                <span className="min-w-0">
                    <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{rotulo}</span>
                    <span className="mt-0.5 block text-2xl font-semibold tabular-nums leading-none tracking-tight text-slate-900 dark:text-slate-100">{valor}</span>
                </span>
            </div>
            {extra && <div className="mt-1.5">{extra}</div>}
        </div>
    );

    const emAtendimento = React.useMemo(() => chamadosFiltrados
        .filter(c => !c.concluido && (c.status === 'EM_ATENDIMENTO' || c.emAtendimento))
        .sort((a, b) => {
            const ua = a.prioridade === 'Urgente';
            const ub = b.prioridade === 'Urgente';
            if (ua !== ub) return ua ? -1 : 1;
            return calcularDiasDecorridos(b.dataAbertura) - calcularDiasDecorridos(a.dataAbertura);
        })
        .slice(0, 8), [chamadosFiltrados]);

    const recorrencias = React.useMemo(() => {
        const cur = {};
        chamadosFiltrados.forEach(c => {
            const k = (c.equipamento || '-').toUpperCase();
            if (!cur[k]) cur[k] = { equip: c.equipamento || '-', servico: c.servico, n: 0 };
            cur[k].n += 1;
        });
        const prev = {};
        (prevLista || []).forEach(c => {
            const k = (c.equipamento || '-').toUpperCase();
            prev[k] = (prev[k] || 0) + 1;
        });
        return Object.values(cur)
            .filter(r => r.n > 1)
            .sort((a, b) => b.n - a.n)
            .slice(0, 5)
            .map(r => ({ ...r, trend: prevLista ? r.n - (prev[r.equip.toUpperCase()] || 0) : null }));
    }, [chamadosFiltrados, prevLista]);

    const horaAtualizada = atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fade-in w-full">
            {detalhes && <ModalDetalhes chamado={detalhes} aoFechar={() => setDetalhes(null)} aoImprimir={(c) => imprimirOrdemServico(c)} />}

            <PageHeader
                title="Dashboard"
                meta={periodoLabel}
                actions={
                    <React.Fragment>
                        <LiveDot label={`Atualizado ${horaAtualizada}`} />
                        <button onClick={() => setAtualizadoEm(new Date())} className="btn-ghost">
                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Atualizar
                        </button>
                        <button onClick={() => imprimirRelatorioMetricas(resumo, metricasServico, `${periodoLabel} — ${unidadeFiltro}`)} className="btn-ghost">
                            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            PDF
                        </button>
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
                    <button onClick={() => { setStatusFiltro('TODOS'); setUnidadeFiltro('TODOS'); setFiltro({ tipo: 'dias', valor: 30 }); }} className="px-2 text-xs text-[#0E3263] underline underline-offset-2 hover:text-[#0A2447] dark:text-sky-300 dark:hover:text-sky-200">Limpar</button>
                )}
            </div>

            <section className="u-surface mb-5">
                <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-700 sm:grid-cols-4">
                    <Ind rotulo="Total" valor={resumo.total} icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>} extra={abertosHoje > 0 ? <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">+{abertosHoje} hoje</span> : null} />
                    <Ind rotulo="Abertos" valor={resumo.abertos} icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>} extra={<Delta valor={abertosHoje - abertosOntem} bomQuandoSobe={false} />} />
                    <Ind rotulo="Em atendimento" valor={resumo.emAtendimento} icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.734-.05a2.5 2.5 0 111.316 4.813 2.5 2.5 0 01-3.05-3.05z" /></svg>} extra={aguardando > 0 ? <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{aguardando} aguardando</span> : null} />
                    <Ind rotulo="Concluídos" valor={resumo.encerrados} icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>} extra={<Delta valor={conclHoje - conclOntem} bomQuandoSobe={true} />} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 border-t u-divider px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Tempo médio <strong className="font-medium text-slate-700 dark:text-slate-200">{formatarHoras(resumo.tempoMedioResolucao)}</strong></span>
                    <span>Taxa de resolução <strong className="font-medium text-slate-700 dark:text-slate-200">{resumo.taxaResolucao}%</strong></span>
                    <span>Atrasados <strong className={`font-medium ${resumo.atrasados ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{resumo.atrasados}</strong></span>
                </div>
            </section>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle>Status</SectionTitle>
                    <PieChart data={distStatus} colors={{ ABERTO: '#94a3b8', EM_ANALISE: '#0ea5e9', ATRIBUIDO: '#6366f1', EM_ATENDIMENTO: '#f59e0b', AGUARDANDO_USUARIO: '#f97316', RESOLVIDO: '#10b981', FECHADO: '#059669' }} />
                </section>
                <section className="u-surface p-4 sm:p-5">
                    <SectionTitle>Serviços</SectionTitle>
                    {metricasServico.length === 0 ? (
                        <p className="py-2 text-xs text-slate-500">Nenhum chamado no período.</p>
                    ) : (
                        <div className="space-y-2.5">
                            {metricasServico.slice(0, 6).map((m, idx) => (
                                <div key={m.servico} className="flex items-center gap-2.5">
                                    <span className="w-24 shrink-0 truncate text-xs text-slate-500 dark:text-slate-400">{m.servico}</span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div className={`h-full rounded-full ${idx === 0 ? 'bg-[#0E3263] dark:bg-sky-400' : 'bg-slate-300 dark:bg-slate-600'}`} style={{ width: `${(m.total / maiorTotalServico) * 100}%` }}></div>
                                    </div>
                                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-slate-700 dark:text-slate-200">{m.total}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <section className="u-surface mt-5 overflow-hidden">
                <div className="px-4 pt-4 sm:px-5">
                    <SectionTitle>Chamados em atendimento</SectionTitle>
                </div>
                {emAtendimento.length === 0 ? (
                    <p className="px-5 pb-4 text-xs text-slate-500">Nenhum chamado em atendimento.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="u-table">
                            <thead><tr><th>Protocolo</th><th>Equipamento</th><th>Responsável</th><th>Prioridade</th><th className="!text-right">Tempo</th></tr></thead>
                            <tbody>
                                {emAtendimento.map(c => (
                                    <tr key={c.idFirebase} onClick={() => setDetalhes(c)} className="cursor-pointer">
                                        <td><ProtocoloTag codigo={c.protocolo} /></td>
                                        <td className="font-medium text-slate-900 dark:text-slate-100">{c.equipamento}</td>
                                        <td className="max-w-[160px] truncate text-[13px] text-slate-600 dark:text-slate-400">{c.atribuidoParaNome || '—'}</td>
                                        <td><PriorityBadge prioridade={c.prioridade} /></td>
                                        <td className="text-right"><TempoAberto dataAbertura={c.dataAbertura} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="u-surface mt-5 p-4 sm:p-5">
                <SectionTitle>Recorrências</SectionTitle>
                {recorrencias.length === 0 ? (
                    <p className="py-1 text-xs text-slate-500">Nenhuma recorrência no período.</p>
                ) : (
                    <ul className="divide-y u-divider">
                        {recorrencias.map(r => (
                            <li key={r.equip} className="flex items-center gap-3 py-2.5">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.equip}</span>
                                    <span className="block truncate text-[11px] text-slate-400">{r.servico}</span>
                                </span>
                                <span className="shrink-0 text-xs tabular-nums text-slate-500">{r.n} ocorrências</span>
                                {r.trend !== null && r.trend !== 0 && (
                                    <span className={`shrink-0 text-xs tabular-nums ${r.trend > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {r.trend > 0 ? '↑' : '↓'}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
