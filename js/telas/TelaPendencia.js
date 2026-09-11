// TELA: Chamados — operação de triagem
function TelaPendencia({ chamados, assumir, concluir, encerrar, aoNovo }) {
    const assumirFn = assumir || encerrar && encerrar.assumir || (() => {});
    const concluirFn = concluir || encerrar;

    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [prioridadeFiltro, setPrioridadeFiltro] = React.useState('TODOS');
    const [servicoFiltro, setServicoFiltro] = React.useState('TODOS');
    const [dataFiltro, setDataFiltro] = React.useState('TODOS');
    const [ordenarPorPrioridade, setOrdenarPorPrioridade] = React.useState(true);
    const [paginaAtual, setPaginaAtual] = React.useState(1);
    const [notificacaoAtiva, setNotificacaoAtiva] = React.useState(null);
    const [chamadoEmEncerramento, setChamadoEmEncerramento] = React.useState(null);
    const [servicoFeito, setServicoFeito] = React.useState('');
    const [pendencia, setPendencia] = React.useState('');
    const [observacoes, setObservacoes] = React.useState('');
    const [itensSelecionados, setItensSelecionados] = React.useState([]);
    const [mostrarFiltros, setMostrarFiltros] = React.useState(false);
    const itensPorPagina = 10;
    const pendentes = chamados.filter(c => !c.concluido);
    const idsConhecidos = React.useRef(new Set());
    const primeiroCarregamento = React.useRef(true);
    React.useEffect(() => {
        const idsAtuais = new Set(pendentes.map(c => c.idFirebase));
        if (primeiroCarregamento.current) { idsConhecidos.current = idsAtuais; primeiroCarregamento.current = false; }
        else {
            const novoChamado = pendentes.find(c => !idsConhecidos.current.has(c.idFirebase));
            if (novoChamado) { tocarSomPorPrioridade(novoChamado.prioridade); setNotificacaoAtiva(novoChamado); setTimeout(() => setNotificacaoAtiva(null), 5000); }
            idsConhecidos.current = idsAtuais;
        }
    }, [chamados]);
    React.useEffect(() => { setPaginaAtual(1); }, [busca, unidadeFiltro, statusFiltro, prioridadeFiltro, servicoFiltro, dataFiltro, ordenarPorPrioridade]);
    const [fotosResolucao, setFotosResolucao] = React.useState([]);
    const [erroFotoResolucao, setErroFotoResolucao] = React.useState('');
    const [enviandoFinalizacao, setEnviandoFinalizacao] = React.useState(false);
    const [assumindoId, setAssumindoId] = React.useState(null);
    const [detalhes, setDetalhes] = React.useState(null);

    const getItens = (ch) => String(ch.servico || '').split(',').map(s => s.trim()).filter(Boolean);
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
            if (typeof assumirFn === 'function' && assumirFn.length >= 1) {
                await ChamadosService.assumirChamado(chamado);
            } else {
                await ChamadosService.atualizarStatus(chamado, 'EM_ATENDIMENTO');
            }
        } catch (e) {
            window.notifyError && window.notifyError(e.message || 'Falha ao assumir');
            if (window.UnilinkLogger) window.UnilinkLogger.error('handleAssumir', e);
        }
        finally { setAssumindoId(null); }
    };

    const handleIniciarEncerramento = (chamado) => {
        if (!emAtendimento(chamado) && !aguardando(chamado)) {
            window.notifyWarning && window.notifyWarning('Assuma o chamado antes de concluir.');
            return;
        }
        const itens = getItens(chamado);
        const jaConcluidos = chamado.itensConcluidos || [];
        const pendentesItens = itens.filter(i => !jaConcluidos.includes(i));
        setChamadoEmEncerramento(chamado);
        setServicoFeito(''); setPendencia(''); setObservacoes('');
        setItensSelecionados(pendentesItens.length ? pendentesItens : itens);
        setFotosResolucao([]); setErroFotoResolucao('');
    };
    const toggleItem = (item) => {
        setItensSelecionados(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    };
    const handleSelecionarFotoResolucao = (files) => {
        const arquivos = Array.from(files || []); setErroFotoResolucao(''); const validos = [];
        for (const arq of arquivos) {
            const ext = (arq.name.split('.').pop() || '').toLowerCase();
            if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) { setErroFotoResolucao(`"${arq.name}" formato não permitido.`); continue; }
            if (arq.size > 8 * 1024 * 1024) { setErroFotoResolucao(`"${arq.name}" excede 8MB.`); continue; }
            validos.push(arq);
        }
        if (fotosResolucao.length + validos.length > 5) window.notifyWarning && window.notifyWarning('Limite de 5 fotos.');
        setFotosResolucao(prev => [...prev, ...validos].slice(0, 5));
    };
    const handleCaptureResolucao = (file) => handleSelecionarFotoResolucao([file]);
    const handleConfirmarFinalizacao = async (e) => {
        e.preventDefault(); if (!chamadoEmEncerramento) return;
        if (itensSelecionados.length === 0) { window.notifyWarning && window.notifyWarning('Selecione ao menos um item concluído.'); return; }
        if (!servicoFeito.trim()) { window.notifyWarning && window.notifyWarning('Descreva o serviço executado.'); return; }
        setEnviandoFinalizacao(true);
        try {
            if (typeof concluirFn === 'function') {
                try {
                    await ChamadosService.concluirChamado(chamadoEmEncerramento, {
                        itensConcluidos: itensSelecionados,
                        servicoFeito: servicoFeito.trim(),
                        pendencia: pendencia.trim(),
                        observacoes: observacoes.trim()
                    });
                } catch (err) {
                    if (err.message.includes('404') || err.message.includes('concluir')) {
                        await concluirFn(chamadoEmEncerramento, servicoFeito, pendencia);
                    } else throw err;
                }
            }
            for (const foto of fotosResolucao) {
                try { await ChamadosService.uploadEvidencia(chamadoEmEncerramento.idFirebase, foto, 'RESOLUCAO'); }
                catch (e) { console.error(e); window.notifyWarning && window.notifyWarning('Foto não enviada: ' + e.message); }
            }
            setChamadoEmEncerramento(null); setFotosResolucao([]);
            window.notifySuccess && window.notifySuccess('Chamado atualizado.');
        } catch (err) {
            window.notifyError && window.notifyError(err.message || 'Falha ao concluir.');
            if (window.UnilinkLogger) window.UnilinkLogger.error('handleConfirmarFinalizacao', err);
        }
        finally { setEnviandoFinalizacao(false); }
    };

    let listaExibicao = pendentes.filter(c => {
        const q = busca.toLowerCase();
        const atendeBusca = !q || (c.equipamento && c.equipamento.toLowerCase().includes(q)) || (c.descricao && c.descricao.toLowerCase().includes(q)) || (c.protocolo && c.protocolo.toLowerCase().includes(q));
        const atendeUnidade = unidadeFiltro === 'TODOS' || (c.unidade || 'MATRIZ') === unidadeFiltro;
        const atendeStatus = statusFiltro === 'TODOS' || (c.status || 'ABERTO') === statusFiltro;
        const atendePrioridade = prioridadeFiltro === 'TODOS' || c.prioridade === prioridadeFiltro;
        const atendeServico = servicoFiltro === 'TODOS' || String(c.servico || '').toUpperCase().split(',').map(s => s.trim()).includes(servicoFiltro);
        return atendeBusca && atendeUnidade && atendeStatus && atendePrioridade && atendeServico;
    });
    if (dataFiltro !== 'TODOS') {
        listaExibicao = filtrarChamadosPorData(listaExibicao, dataFiltro);
    }
    const pesoStatus = { 'EM_ATENDIMENTO': 0, 'AGUARDANDO_USUARIO': 1, 'ATRIBUIDO': 2, 'ABERTO': 3, 'EM_ANALISE': 3 };
    listaExibicao.sort((a, b) => {
        const pa = pesoStatus[a.status] ?? 9; const pb = pesoStatus[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return ordenarPorPrioridade ? priorityWeights[a.prioridade] - priorityWeights[b.prioridade] : b.id - a.id;
    });
    const totalPaginas = Math.ceil(listaExibicao.length / itensPorPagina);
    const listaExibicaoPaginada = listaExibicao.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);
    const filtrosAtivos = (unidadeFiltro !== 'TODOS' ? 1 : 0) + (statusFiltro !== 'TODOS' ? 1 : 0) + (prioridadeFiltro !== 'TODOS' ? 1 : 0) + (servicoFiltro !== 'TODOS' ? 1 : 0) + (dataFiltro !== 'TODOS' ? 1 : 0);
    const limparFiltros = () => { setStatusFiltro('TODOS'); setPrioridadeFiltro('TODOS'); setServicoFiltro('TODOS'); setDataFiltro('TODOS'); setUnidadeFiltro('TODOS'); setBusca(''); };
    const emAtendCount = pendentes.filter(c => c.status === 'EM_ATENDIMENTO' || c.emAtendimento).length;

    const acao = (c) => {
        if (podeAssumir(c)) {
            return <button onClick={(e) => { e.stopPropagation(); handleAssumir(c); }} disabled={assumindoId === c.idFirebase} className="btn-primary-outline !min-h-[32px] !px-3 !py-1.5 !text-xs disabled:opacity-60">{assumindoId === c.idFirebase ? 'Assumindo…' : 'Assumir'}</button>;
        }
        if (emAtendimento(c) || aguardando(c)) {
            return <button onClick={(e) => { e.stopPropagation(); handleIniciarEncerramento(c); }} className="btn-success !min-h-[32px] !px-3 !py-1.5 !text-xs">Concluir</button>;
        }
        return <StatusBadge status={c.status} concluido={c.concluido} />;
    };

    return (
        <div className="w-full">
            {notificacaoAtiva && (
                <div className="toast-in fixed left-1/2 top-4 z-50 w-[92vw] max-w-sm -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3.5 py-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:right-5 sm:translate-x-0">
                    <p className="text-[13px] text-slate-700 dark:text-slate-200">Novo chamado: {notificacaoAtiva.equipamento}</p>
                    <p className="truncate text-xs text-slate-500">{notificacaoAtiva.servico}</p>
                </div>
            )}

            {chamadoEmEncerramento && (
                <div className="sheet-mobile fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4 fade-in" onClick={() => setChamadoEmEncerramento(null)}>
                    <div className="sheet-panel flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b u-divider px-5 py-3">
                            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Concluir chamado</h3>
                            <button onClick={() => setChamadoEmEncerramento(null)} aria-label="Fechar" className="icon-btn">✕</button>
                        </div>
                        <form onSubmit={handleConfirmarFinalizacao} className="space-y-4 overflow-y-auto px-5 py-4">
                            <div>
                                <p className="u-label">Itens</p>
                                <div className="space-y-1.5">
                                    {getItens(chamadoEmEncerramento).map(item => {
                                        const checked = itensSelecionados.includes(item);
                                        const jaFeito = (chamadoEmEncerramento.itensConcluidos || []).includes(item);
                                        return (
                                            <label key={item} className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 ${checked ? 'border-[#1B7A4D] bg-[#1B7A4D]/[0.06] dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700'} ${jaFeito ? 'opacity-50' : ''}`}>
                                                <input type="checkbox" checked={checked} disabled={jaFeito} onChange={() => toggleItem(item)} className="h-4 w-4 accent-[#1B7A4D]" />
                                                <span className="text-sm text-slate-700 dark:text-slate-200">{item}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label className="u-label">Serviço executado</label>
                                <textarea required rows="3" maxLength="1000" className="u-input resize-none uppercase placeholder:normal-case" value={servicoFeito} onChange={(e) => setServicoFeito(e.target.value.toUpperCase())} />
                            </div>
                            <div>
                                <label className="u-label">Observações</label>
                                <textarea rows="2" maxLength="1000" className="u-input resize-none" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                            </div>
                            <div>
                                <label className="u-label">Pendência</label>
                                <textarea rows="2" maxLength="1000" className="u-input resize-none uppercase placeholder:normal-case" value={pendencia} onChange={(e) => setPendencia(e.target.value.toUpperCase())} />
                            </div>
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="u-label !mb-0">Fotos</label>
                                    <span className="text-[11px] tabular-nums text-slate-400">{fotosResolucao.length}/5</span>
                                </div>
                                <CameraCapture onCapture={handleCaptureResolucao} onSelectFiles={handleSelecionarFotoResolucao} maxFiles={5} currentCount={fotosResolucao.length} />
                                {erroFotoResolucao && <p className="mt-1.5 text-xs text-[#B3261E] dark:text-red-400">{erroFotoResolucao}</p>}
                                {fotosResolucao.length > 0 && (
                                    <div className="mt-2 grid grid-cols-5 gap-2">
                                        {fotosResolucao.map((f, idx) => (
                                            <div key={idx} className="relative aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                                                <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                                                <button type="button" onClick={() => setFotosResolucao(prev => prev.filter((_, i) => i !== idx))} aria-label="Remover" className="icon-btn absolute right-1 top-1 !rounded-full !bg-slate-950/70 !p-0 !text-white">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => setChamadoEmEncerramento(null)} className="btn-ghost">Cancelar</button>
                                <button type="submit" disabled={enviandoFinalizacao} className="btn-success disabled:opacity-60">{enviandoFinalizacao ? 'Salvando…' : 'Salvar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PageHeader
                title="Chamados"
                meta={`${pendentes.length} registros, ${listaExibicao.length} filtrados, ${emAtendCount} em atendimento`}
                actions={
                    <React.Fragment>
                        {aoNovo && (
                            <button onClick={aoNovo} className="btn-primary">
                                Novo chamado
                            </button>
                        )}
                        <DownloadPopover dados={pendentes} unidadeFiltro={unidadeFiltro} statusFiltro={statusFiltro} dataFiltro={dataFiltro} busca={busca} />
                        <button onClick={() => setOrdenarPorPrioridade(v => !v)} className="btn-ghost" title="Ordenação">
                            {ordenarPorPrioridade ? 'Prioridade' : 'Recentes'}
                        </button>
                    </React.Fragment>
                }
            />

            <div className="mb-3 flex gap-2">
                <input type="text" placeholder="Buscar chamados..." aria-label="Buscar" className="u-input flex-1" value={busca} onChange={(e) => setBusca(e.target.value)} />
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
                <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} aria-label="Status" className="u-input sm:max-w-[170px]">
                    <option value="TODOS">Status: todos</option>
                    <option value="ABERTO">Aberto</option>
                    <option value="EM_ATENDIMENTO">Em atendimento</option>
                    <option value="AGUARDANDO_USUARIO">Parcial</option>
                    <option value="ATRIBUIDO">Atribuído</option>
                </select>
                <select value={prioridadeFiltro} onChange={e => setPrioridadeFiltro(e.target.value)} aria-label="Prioridade" className="u-input sm:max-w-[160px]">
                    <option value="TODOS">Prioridade: todas</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                </select>
                <select value={servicoFiltro} onChange={e => setServicoFiltro(e.target.value)} aria-label="Serviço" className="u-input sm:max-w-[160px]">
                    <option value="TODOS">Serviço: todos</option>
                    <option value="PINTURA">Pintura</option>
                    <option value="ELETRICA">Elétrica</option>
                    <option value="SOLDA">Solda</option>
                    <option value="MECANICA">Mecânica</option>
                    <option value="BORRACHARIA">Borracharia</option>
                    <option value="TRANSLADO">Translado</option>
                </select>
                <select value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} aria-label="Período" className="u-input sm:max-w-[160px]">
                    <option value="TODOS">Período: todo</option>
                    <option value="HOJE">Hoje</option>
                    <option value="7d">7 dias</option>
                    <option value="30d">30 dias</option>
                    <option value="MES_ATUAL">Mês atual</option>
                    <option value="MES_ANTERIOR">Mês anterior</option>
                </select>
                {(filtrosAtivos > 0 || busca) && (
                    <button onClick={limparFiltros} className="shrink-0 px-2 text-xs text-[#0E3263] underline underline-offset-2 hover:text-[#0A2447] dark:text-sky-300 dark:hover:text-sky-200">Limpar</button>
                )}
            </div>

            {listaExibicaoPaginada.length === 0 ? (
                <div className="u-surface"><EmptyState numero="0" title="Nenhum chamado encontrado." action={(filtrosAtivos > 0 || busca) ? <button onClick={limparFiltros} className="btn-ghost">Limpar filtros</button> : null} /></div>
            ) : (
                <React.Fragment>
                    <ul className="u-surface divide-y u-divider px-4 md:hidden">
                        {listaExibicaoPaginada.map(c => (
                            <li key={c.idFirebase}>
                                <div onClick={() => setDetalhes(c)} className="cursor-pointer py-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <ProtocoloTag codigo={c.protocolo} />
                                        <StatusBadge status={c.status} concluido={c.concluido} />
                                    </div>
                                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900 dark:text-slate-100">{c.equipamento}</p>
                                    <p className="truncate text-xs text-slate-500">{c.descricao}</p>
                                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                                        <span className="flex items-center gap-2 text-xs text-slate-500">
                                            <PriorityBadge prioridade={c.prioridade} />
                                            <ServiceBadge servico={c.servico} />
                                            <TempoAberto dataAbertura={c.dataAbertura} />
                                        </span>
                                        <span onClick={(e) => e.stopPropagation()}>{acao(c)}</span>
                                    </div>
                                    {c.atribuidoParaNome && <p className="mt-1 text-[11px] text-slate-400">{c.atribuidoParaNome}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>

                    <div className="u-surface hidden overflow-x-auto md:block">
                        <table className="u-table">
                            <thead><tr><th>Protocolo</th><th>Descrição</th><th>Unidade</th><th>Serviço</th><th>Prioridade</th><th>Responsável</th><th>Abertura</th><th>Tempo</th><th>Status</th><th className="!text-right">Ações</th></tr></thead>
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
                                        <td className="max-w-[140px] truncate text-[13px] text-slate-600 dark:text-slate-400">{c.atribuidoParaNome || '—'}</td>
                                        <td><DateBadge dataStr={c.dataAbertura} /></td>
                                        <td><TempoAberto dataAbertura={c.dataAbertura} /></td>
                                        <td><StatusBadge status={c.status} concluido={c.concluido} /></td>
                                        <td className="!text-right" onClick={(e) => e.stopPropagation()}>
                                            <span className="inline-flex items-center gap-1.5">
                                                {acao(c)}
                                                <button onClick={(e) => { e.stopPropagation(); imprimirOrdemServico(c); }} aria-label="Imprimir OS" className="icon-btn" title="Imprimir OS">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
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

            {detalhes && <ModalDetalhes chamado={detalhes} chamados={chamados} aoFechar={() => setDetalhes(null)} aoImprimir={(c) => imprimirOrdemServico(c)} aoAssumir={(c) => handleAssumir(c)} aoConcluir={(c) => { setDetalhes(null); handleIniciarEncerramento(c); }} />}
            <Paginacao pagina={paginaAtual} total={totalPaginas} aoMudar={setPaginaAtual} />
        </div>
    );
}
