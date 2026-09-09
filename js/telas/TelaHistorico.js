// ==========================================================
// TELA: Histórico — foco em pesquisa e análise
// Lógica de filtros/paginação preservada; tabela sofisticada
// com protocolo técnico, hover sutil e densidade equilibrada.
// ==========================================================
function TelaHistorico({ chamados, voltar }) {
    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [dataFiltro, setDataFiltro] = React.useState('TODOS');
    const [paginaAtual, setPaginaAtual] = React.useState(1);
    const [mostrarFiltros, setMostrarFiltros] = React.useState(false);

    const [detalhes, setDetalhes] = React.useState(null);
    const itensPorPagina = 8;
    const encerrados = chamados.filter(c => c.concluido);
    const parciais = chamados.filter(c => c.status === 'AGUARDANDO_USUARIO');
    const baseHistorico = statusFiltro === 'AGUARDANDO_USUARIO' ? parciais : statusFiltro === 'TODOS' ? [...encerrados, ...parciais] : encerrados;
    React.useEffect(() => { setPaginaAtual(1); }, [busca, unidadeFiltro, statusFiltro, dataFiltro]);
    let listaExibicao = baseHistorico.filter(c => {
        const atendeEquipamento = c.equipamento && c.equipamento.toLowerCase().includes(busca.toLowerCase());
        const unidadeDoChamado = c.unidade || 'MATRIZ';
        const atendeUnidade = unidadeFiltro === 'TODOS' || unidadeDoChamado === unidadeFiltro;
        const atendeStatus = statusFiltro === 'TODOS' || (c.status || 'FECHADO') === statusFiltro;
        return atendeEquipamento && atendeUnidade && atendeStatus;
    });
    if (dataFiltro !== 'TODOS') listaExibicao = filtrarChamadosPorData(listaExibicao, dataFiltro);
    listaExibicao.sort((a, b) => (b.id || 0) - (a.id || 0));
    const totalPaginas = Math.ceil(listaExibicao.length / itensPorPagina);
    const listaExibicaoPaginada = listaExibicao.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
    const handleImprimirOS = (c) => imprimirOrdemServico(c);
    const filtrosAtivos = (unidadeFiltro !== 'TODOS' ? 1 : 0) + (statusFiltro !== 'TODOS' ? 1 : 0) + (dataFiltro !== 'TODOS' ? 1 : 0);
    const limparFiltros = () => { setStatusFiltro('TODOS'); setDataFiltro('TODOS'); setUnidadeFiltro('TODOS'); setBusca(''); };

    return (
        <div className="fade-in w-full">
            <PageHeader
                eyebrow="Manutenção"
                title="Histórico de chamados"
                subtitle={`${listaExibicao.length} registros · concluídos e parciais`}
                back={voltar}
                backLabel="Menu"
                actions={<DownloadPopover dados={[...encerrados, ...parciais]} unidadeFiltro={unidadeFiltro} statusFiltro={statusFiltro} dataFiltro={dataFiltro} busca={busca} />}
            />

            {/* Barra de pesquisa + filtros */}
            <div className="mb-3 flex gap-2">
                <div className="relative flex-1">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
                    <input type="text" placeholder="Pesquisar chamado…" aria-label="Pesquisar" className="u-input !pl-9" value={busca} onChange={(e) => setBusca(e.target.value.toUpperCase())} />
                </div>
                <button onClick={() => setMostrarFiltros(v => !v)} className={`btn-ghost shrink-0 sm:hidden ${mostrarFiltros ? '!bg-slate-900 !text-white dark:!bg-white dark:!text-slate-900' : ''}`}>
                    Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ''}
                </button>
            </div>
            <div className={`${mostrarFiltros ? 'flex' : 'hidden'} mb-4 flex-col gap-2 sm:flex sm:flex-row`}>
                <select value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)} aria-label="Filial" className="u-input sm:max-w-[170px]">
                    <option value="TODOS">Filial ▾ · Todas</option>
                    <option value="MATRIZ">Matriz</option>
                    <option value="PECÉM">Pecém</option>
                </select>
                <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} aria-label="Status" className="u-input sm:max-w-[190px]">
                    <option value="TODOS">Status ▾ · Todos</option>
                    <option value="FECHADO">Encerrado</option>
                    <option value="RESOLVIDO">Resolvido</option>
                    <option value="AGUARDANDO_USUARIO">Parcial</option>
                </select>
                <select value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} aria-label="Período" className="u-input sm:max-w-[190px]">
                    <option value="TODOS">Período ▾ · Todo</option>
                    <option value="HOJE">Hoje</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="MES_ATUAL">Mês atual</option>
                </select>
                {(filtrosAtivos > 0 || busca) && (
                    <button onClick={limparFiltros} className="shrink-0 px-2 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800 dark:hover:text-white">Limpar</button>
                )}
            </div>

            {/* Lista (mobile) */}
            {listaExibicaoPaginada.length === 0 ? (
                <div className="u-surface"><EmptyState hint="Tente alterar os filtros ou o período." action={(filtrosAtivos > 0 || busca) ? <button onClick={limparFiltros} className="btn-ghost">Limpar filtros</button> : null} /></div>
            ) : (
                <div className="u-surface divide-y u-divider overflow-hidden md:hidden">
                    {listaExibicaoPaginada.map(c => (
                        <div key={c.idFirebase} onClick={() => setDetalhes(c)} className="cursor-pointer px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            <div className="flex items-center justify-between gap-2">
                                <ProtocoloTag codigo={c.protocolo} />
                                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{formatarApenasData(c.dataEncerramento)}</span>
                            </div>
                            <p className="mt-1 truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">{c.equipamento}</p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5">
                                    <PriorityBadge prioridade={c.prioridade} />
                                    <StatusBadge status={c.status} concluido={c.concluido} />
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); handleImprimirOS(c); }} className="btn-ghost !px-2.5 !py-2 text-[11px]">Imprimir OS</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabela (desktop) */}
            {listaExibicaoPaginada.length > 0 && (
                <div className="u-surface hidden overflow-x-auto md:block">
                    <table className="u-table">
                        <thead><tr><th>Protocolo</th><th>Equipamento</th><th>Prioridade</th><th>Serviço</th><th>Abertura</th><th>Encerramento</th><th>Status</th><th className="!text-center">OS</th></tr></thead>
                        <tbody>
                            {listaExibicaoPaginada.map(c => (
                                <tr key={c.idFirebase} onClick={() => setDetalhes(c)} className="cursor-pointer">
                                    <td><ProtocoloTag codigo={c.protocolo} /></td>
                                    <td>
                                        <p className="font-semibold text-slate-900 dark:text-white">{c.equipamento}</p>
                                        <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400">{c.descricao}</p>
                                    </td>
                                    <td><PriorityBadge prioridade={c.prioridade} /></td>
                                    <td><ServiceBadge servico={c.servico} /></td>
                                    <td className="whitespace-nowrap text-xs tabular-nums text-slate-500">{formatarApenasData(c.dataAbertura)}</td>
                                    <td className="whitespace-nowrap text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{formatarApenasData(c.dataEncerramento)}</td>
                                    <td><StatusBadge status={c.status} concluido={c.concluido} /></td>
                                    <td className="!text-center" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={(e) => { e.stopPropagation(); handleImprimirOS(c); }} aria-label="Imprimir OS" className="btn-ghost !px-2.5 !py-1.5">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {detalhes && <ModalDetalhes chamado={detalhes} aoFechar={() => setDetalhes(null)} aoImprimir={handleImprimirOS} />}
            <Paginacao pagina={paginaAtual} total={totalPaginas} aoMudar={setPaginaAtual} />
        </div>
    );
}
