// TELA: Histórico — pesquisa e consulta
function TelaHistorico({ chamados, assumir }) {
    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [dataFiltro, setDataFiltro] = React.useState('TODOS');
    const [paginaAtual, setPaginaAtual] = React.useState(1);
    const [mostrarFiltros, setMostrarFiltros] = React.useState(false);

    const [detalhes, setDetalhes] = React.useState(null);
    const [chamadoEmEncerramento, setChamadoEmEncerramento] = React.useState(null);
    const [assumindoId, setAssumindoId] = React.useState(null);
    const [visao, setVisao] = React.useState('lista'); // lista | timeline
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
    const podeAssumir = (c) => ['ABERTO', 'EM_ANALISE', 'ATRIBUIDO', 'AGUARDANDO_USUARIO'].includes(c.status) && !c.emAtendimento;
    const emAtendimento = (c) => c.status === 'EM_ATENDIMENTO' || c.emAtendimento;
    const aguardando = (c) => c.status === 'AGUARDANDO_USUARIO';
    const handleAssumir = async (chamado) => {
        if (!chamado.idFirebase || chamado.idFirebase.length < 10) {
            window.notifyError && window.notifyError('ID do chamado inválido. Recarregue a página.');
            return;
        }
        setAssumindoId(chamado.idFirebase);
        try {
            if (typeof assumir === 'function') await assumir(chamado);
            else await ChamadosService.assumirChamado(chamado);
        } catch (e) {
            window.notifyError && window.notifyError(e.message || 'Falha ao assumir');
            if (window.UnilinkLogger) window.UnilinkLogger.error('Historico.handleAssumir', e);
        }
        finally { setAssumindoId(null); }
    };
    const handleIniciarEncerramento = (chamado) => {
        if (!emAtendimento(chamado) && !aguardando(chamado)) {
            window.notifyWarning && window.notifyWarning('Assuma o chamado antes de concluir.');
            return;
        }
        setChamadoEmEncerramento(chamado);
    };
    const botaoAcao = (c) => {
        if (podeAssumir(c)) {
            return <button onClick={(e) => { e.stopPropagation(); handleAssumir(c); }} disabled={assumindoId === c.idFirebase} className="btn-primary-outline !min-h-[32px] !px-3 !py-1.5 !text-xs disabled:opacity-60">{assumindoId === c.idFirebase ? 'Assumindo…' : 'Assumir'}</button>;
        }
        if (emAtendimento(c) || aguardando(c)) {
            return <button onClick={(e) => { e.stopPropagation(); handleIniciarEncerramento(c); }} className="btn-success !min-h-[32px] !px-3 !py-1.5 !text-xs">Concluir</button>;
        }
        return null;
    };
    const filtrosAtivos = (unidadeFiltro !== 'TODOS' ? 1 : 0) + (statusFiltro !== 'TODOS' ? 1 : 0) + (dataFiltro !== 'TODOS' ? 1 : 0);
    const limparFiltros = () => { setStatusFiltro('TODOS'); setDataFiltro('TODOS'); setUnidadeFiltro('TODOS'); setBusca(''); };
    const atividade = React.useMemo(() => atividadeRecente(listaExibicao, 30), [listaExibicao]);
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
        <div className="w-full">
            <PageHeader
                title="Histórico"
                meta={`${baseHistorico.length} chamados, ${esteMes} este mês, ${recorrentes} recorrentes`}
                actions={<DownloadPopover dados={[...encerrados, ...parciais]} unidadeFiltro={unidadeFiltro} statusFiltro={statusFiltro} dataFiltro={dataFiltro} busca={busca} />}
            />

            <div className="u-surface mb-2 flex gap-2 p-2">
                <input type="text" placeholder="Buscar protocolo, equipamento ou assunto..." aria-label="Buscar" className="u-input flex-1" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <div className="grid shrink-0 grid-cols-2 gap-1 rounded-md bg-slate-200/60 p-1 dark:bg-slate-800" role="tablist" aria-label="Visualização">
                    {[['lista', 'Lista'], ['timeline', 'Timeline']].map(([v, l]) => (
                        <button key={v} type="button" role="tab" aria-selected={visao === v} onClick={() => setVisao(v)} className={`rounded px-2.5 text-xs transition ${visao === v ? 'bg-white font-medium text-slate-900 dark:bg-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                            {l}
                        </button>
                    ))}
                </div>
                <button onClick={() => setMostrarFiltros(v => !v)} className="btn-ghost shrink-0 sm:hidden">
                    Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ''}
                </button>
            </div>
            <div className={`${mostrarFiltros ? 'flex' : 'hidden'} u-surface mb-4 flex-col gap-2 p-2 sm:flex sm:flex-row sm:flex-wrap`}>
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

            {visao === 'timeline' ? (
                <div className="u-surface px-4 py-3 sm:px-5">
                    {atividade.length === 0 ? (
                        <p className="py-2 text-xs text-slate-500">Sem atividade para os filtros atuais.</p>
                    ) : (
                        <ol className="ml-1 space-y-3.5 border-l-2 border-slate-200 py-1 pl-5 dark:border-slate-700">
                            {atividade.map((a, idx) => {
                                const dt = new Date(a.ts);
                                const hh = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                                return (
                                    <li key={a.id} className="relative">
                                        <span className={`absolute -left-[25px] top-1 h-2 w-2 rounded-full ${idx === 0 ? 'bg-[#0E3263] dark:bg-sky-400' : 'bg-white ring-2 ring-slate-300 dark:bg-slate-900 dark:ring-slate-600'}`}></span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="w-9 shrink-0 font-mono text-xs text-slate-400" title={dt.toLocaleString('pt-BR')}>{hh}</span>
                                            <ProtocoloTag codigo={a.protocolo} />
                                            <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{a.texto}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            ) : listaExibicaoPaginada.length === 0 ? (
                <div className="u-surface"><EmptyState numero="0" title="Nenhum chamado encontrado." action={(filtrosAtivos > 0 || busca) ? <button onClick={limparFiltros} className="btn-ghost">Limpar filtros</button> : null} /></div>
            ) : (
                <React.Fragment>
                    <ul className="u-surface divide-y u-divider px-4 md:hidden">
                        {listaExibicaoPaginada.map((c, idx) => {
                            const assunto = extrairAssunto(c.descricao);
                            return (
                            <li key={c.idFirebase} className="row-enter" style={{ animationDelay: `${Math.min(idx * 70, 450)}ms` }}>
                                <div onClick={() => setDetalhes(c)} className="cursor-pointer py-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <ProtocoloTag codigo={c.protocolo} />
                                        <span className="text-xs tabular-nums text-slate-500">{formatarApenasData(c.dataEncerramento)}</span>
                                    </div>
                                    <div className="mt-0.5 flex items-start justify-between gap-2">
                                        <p className="min-w-0 flex-1 break-words text-sm font-medium text-slate-900 dark:text-slate-100">{c.equipamento}</p>
                                        <span onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center gap-1.5">
                                            {botaoAcao(c)}
                                            <button onClick={(e) => { e.stopPropagation(); handleImprimirOS(c); }} className="btn-ghost !min-h-[32px] !px-2.5 !py-1 !text-xs">OS</button>
                                        </span>
                                    </div>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={c.descricao}>{assunto}</p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                        <PriorityBadge prioridade={c.prioridade} />
                                        <StatusBadge status={c.status} concluido={c.concluido} />
                                    </div>
                                </div>
                            </li>
                            );
                        })}
                    </ul>

                    <div className="u-surface hidden overflow-x-auto md:block">
                        <table className="u-table u-table-pin">
                            <thead><tr><th>Protocolo</th><th>Equipamento / Assunto</th><th>Unidade</th><th>Serviço</th><th>Prioridade</th><th>Abertura</th><th>Encerramento</th><th>Status</th><th className="!text-right">Ações</th></tr></thead>
                            <tbody>
                                {listaExibicaoPaginada.map(c => (
                                    <tr key={c.idFirebase} onClick={() => setDetalhes(c)} className="cursor-pointer">
                                        <td><ProtocoloTag codigo={c.protocolo} /></td>
                                        <td className="min-w-[200px] max-w-[320px]">
                                            <p className="font-medium text-slate-900 dark:text-slate-100">{c.equipamento}</p>
                                            <p className="truncate text-xs text-slate-500" title={c.descricao}>{extrairAssunto(c.descricao)}</p>
                                        </td>
                                        <td className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-400">{c.unidade || 'MATRIZ'}</td>
                                        <td><ServiceBadge servico={c.servico} /></td>
                                        <td><PriorityBadge prioridade={c.prioridade} /></td>
                                        <td className="whitespace-nowrap text-xs tabular-nums text-slate-500">{formatarApenasData(c.dataAbertura)}</td>
                                        <td className="whitespace-nowrap text-xs font-medium tabular-nums text-[#1B7A4D] dark:text-emerald-400">{formatarApenasData(c.dataEncerramento)}</td>
                                        <td><StatusBadge status={c.status} concluido={c.concluido} /></td>
                                        <td className="!text-right" onClick={(e) => e.stopPropagation()}>
                                            <span className="inline-flex items-center gap-1.5">
                                                {botaoAcao(c)}
                                                <button onClick={(e) => { e.stopPropagation(); handleImprimirOS(c); }} aria-label="Imprimir OS" className="icon-btn" title="Imprimir OS">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                                </button>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </React.Fragment>
            )}

            {chamadoEmEncerramento && (
                <ModalConcluir chamado={chamadoEmEncerramento} aoFechar={() => setChamadoEmEncerramento(null)} />
            )}
            {detalhes && <ModalDetalhes chamado={detalhes} chamados={chamados} aoFechar={() => setDetalhes(null)} aoImprimir={handleImprimirOS} aoAssumir={(c) => handleAssumir(c)} aoConcluir={(c) => { setDetalhes(null); handleIniciarEncerramento(c); }} />}
            {visao === 'lista' && <Paginacao pagina={paginaAtual} total={totalPaginas} aoMudar={setPaginaAtual} />}
        </div>
    );
}
