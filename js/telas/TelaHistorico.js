// TELA: Histórico — pesquisa e consulta
function TelaHistorico({ chamados }) {
    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [dataFiltro, setDataFiltro] = React.useState('TODOS');
    const [paginaAtual, setPaginaAtual] = React.useState(1);
    const [mostrarFiltros, setMostrarFiltros] = React.useState(false);

    const [detalhes, setDetalhes] = React.useState(null);
    const itensPorPagina = 10;
    const encerrados = chamados.filter(c => c.concluido);
    const parciais = chamados.filter(c => c.status === 'AGUARDANDO_USUARIO');
    const baseHistorico = statusFiltro === 'AGUARDANDO_USUARIO' ? parciais : statusFiltro === 'TODOS' ? [...encerrados, ...parciais] : encerrados;
    React.useEffect(() => { setPaginaAtual(1); }, [busca, unidadeFiltro, statusFiltro, dataFiltro]);
    let listaExibicao = baseHistorico.filter(c => {
        const q = busca.toLowerCase();
        const atendeBusca = !q || (c.protocolo && c.protocolo.toLowerCase().includes(q)) || (c.equipamento && c.equipamento.toLowerCase().includes(q)) || (c.descricao && c.descricao.toLowerCase().includes(q));
        const atendeUnidade = unidadeFiltro === 'TODOS' || (c.unidade || 'MATRIZ') === unidadeFiltro;
        const atendeStatus = statusFiltro === 'TODOS' || (c.status || 'FECHADO') === statusFiltro;
        return atendeBusca && atendeUnidade && atendeStatus;
    });
    if (dataFiltro !== 'TODOS') listaExibicao = filtrarChamadosPorData(listaExibicao, dataFiltro);
    listaExibicao.sort((a, b) => (b.id || 0) - (a.id || 0));
    const totalPaginas = Math.ceil(listaExibicao.length / itensPorPagina);
    const listaExibicaoPaginada = listaExibicao.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
    const handleImprimirOS = (c) => imprimirOrdemServico(c);
    const filtrosAtivos = (unidadeFiltro !== 'TODOS' ? 1 : 0) + (statusFiltro !== 'TODOS' ? 1 : 0) + (dataFiltro !== 'TODOS' ? 1 : 0);
    const limparFiltros = () => { setStatusFiltro('TODOS'); setDataFiltro('TODOS'); setUnidadeFiltro('TODOS'); setBusca(''); };
    const agora = new Date();
    const esteMes = baseHistorico.filter(c => {
        try {
            const dt = parseDataBR(c.dataAbertura);
            return dt && dt.getMonth() === agora.getMonth() && dt.getFullYear() === agora.getFullYear();
        } catch { return false; }
    }).length;
    const recorrentes = (() => {
        const cont = {};
        baseHistorico.forEach(c => {
            const k = (c.equipamento || '-').toUpperCase();
            cont[k] = (cont[k] || 0) + 1;
        });
        return Object.values(cont).filter(n => n > 1).length;
    })();

    return (
        <div className="fade-in w-full">
            <PageHeader
                title="Histórico"
                meta={`${baseHistorico.length} chamados • ${esteMes} este mês • ${recorrentes} recorrentes`}
                actions={<DownloadPopover dados={[...encerrados, ...parciais]} unidadeFiltro={unidadeFiltro} statusFiltro={statusFiltro} dataFiltro={dataFiltro} busca={busca} />}
            />

            <div className="mb-3 flex gap-2">
                <input type="text" placeholder="Buscar protocolo, equipamento ou descrição..." aria-label="Buscar" className="u-input flex-1" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <button onClick={() => setMostrarFiltros(v => !v)} className="btn-ghost shrink-0 sm:hidden">
                    Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ''}
                </button>
            </div>
            <div className={`${mostrarFiltros ? 'flex' : 'hidden'} mb-4 flex-col gap-2 sm:flex sm:flex-row sm:flex-wrap`}>
                <select value={unidadeFiltro} onChange={e => setUnidadeFiltro(e.target.value)} aria-label="Filial" className="u-input sm:max-w-[150px]">
                    <option value="TODOS">Filial: todas</option>
                    <option value="MATRIZ">Matriz</option>
                    <option value="PECÉM">Pecém</option>
                </select>
                <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} aria-label="Status" className="u-input sm:max-w-[160px]">
                    <option value="TODOS">Status: todos</option>
                    <option value="FECHADO">Encerrado</option>
                    <option value="RESOLVIDO">Resolvido</option>
                    <option value="AGUARDANDO_USUARIO">Parcial</option>
                </select>
                <select value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} aria-label="Período" className="u-input sm:max-w-[160px]">
                    <option value="TODOS">Período: todo</option>
                    <option value="HOJE">Hoje</option>
                    <option value="7d">7 dias</option>
                    <option value="30d">30 dias</option>
                    <option value="MES_ATUAL">Mês atual</option>
                </select>
                {(filtrosAtivos > 0 || busca) && (
                    <button onClick={limparFiltros} className="shrink-0 px-2 text-xs text-[#0E3263] underline underline-offset-2 hover:text-[#0A2447] dark:text-sky-300 dark:hover:text-sky-200">Limpar</button>
                )}
            </div>

            {listaExibicaoPaginada.length === 0 ? (
                <div className="u-surface"><EmptyState action={(filtrosAtivos > 0 || busca) ? <button onClick={limparFiltros} className="btn-ghost">Limpar filtros</button> : null} /></div>
            ) : (
                <React.Fragment>
                    <ul className="u-surface divide-y u-divider px-4 md:hidden">
                        {listaExibicaoPaginada.map(c => (
                            <li key={c.idFirebase}>
                                <div onClick={() => setDetalhes(c)} className="cursor-pointer py-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <ProtocoloTag codigo={c.protocolo} />
                                        <span className="text-xs tabular-nums text-slate-500">{formatarApenasData(c.dataEncerramento)}</span>
                                    </div>
                                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{c.equipamento}</p>
                                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                                        <span className="flex items-center gap-2">
                                            <PriorityBadge prioridade={c.prioridade} />
                                            <StatusBadge status={c.status} concluido={c.concluido} />
                                        </span>
                                        <button onClick={(e) => { e.stopPropagation(); handleImprimirOS(c); }} className="btn-ghost !min-h-[32px] !px-2.5 !py-1 !text-xs">OS</button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="u-surface hidden overflow-x-auto md:block">
                        <table className="u-table">
                            <thead><tr><th>Protocolo</th><th>Descrição</th><th>Unidade</th><th>Serviço</th><th>Prioridade</th><th>Abertura</th><th>Encerramento</th><th>Status</th><th className="!text-right">OS</th></tr></thead>
                            <tbody>
                                {listaExibicaoPaginada.map(c => (
                                    <tr key={c.idFirebase} onClick={() => setDetalhes(c)} className="cursor-pointer">
                                        <td><ProtocoloTag codigo={c.protocolo} /></td>
                                        <td className="min-w-[200px] max-w-[320px]">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{c.equipamento}</p>
                                            <p className="truncate text-xs text-slate-500">{c.descricao}</p>
                                        </td>
                                        <td className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-400">{c.unidade || 'MATRIZ'}</td>
                                        <td><ServiceBadge servico={c.servico} /></td>
                                        <td><PriorityBadge prioridade={c.prioridade} /></td>
                                        <td className="whitespace-nowrap text-xs tabular-nums text-slate-500">{formatarApenasData(c.dataAbertura)}</td>
                                        <td className="whitespace-nowrap text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{formatarApenasData(c.dataEncerramento)}</td>
                                        <td><StatusBadge status={c.status} concluido={c.concluido} /></td>
                                        <td className="!text-right" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={(e) => { e.stopPropagation(); handleImprimirOS(c); }} aria-label="Imprimir OS" className="icon-btn" title="Imprimir OS">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </React.Fragment>
            )}

            {detalhes && <ModalDetalhes chamado={detalhes} aoFechar={() => setDetalhes(null)} aoImprimir={handleImprimirOS} />}
            <Paginacao pagina={paginaAtual} total={totalPaginas} aoMudar={setPaginaAtual} />
        </div>
    );
}
