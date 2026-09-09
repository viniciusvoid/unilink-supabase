// ==========================================================
// TELA: Chamados Pendentes — visão operacional de triagem
// Fluxo preservado: Assumir -> Em Atendimento -> Concluir.
// Redesenho: linhas operacionais com tempo em destaque,
// badges discretos e planilha refinada no desktop.
// ==========================================================
function TelaPendencia({ chamados, voltar, encerrar, assumir, concluir }) {
    const assumirFn = assumir || encerrar && encerrar.assumir || (() => {});
    const concluirFn = concluir || encerrar;

    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
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
    const itensPorPagina = 6;
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
    React.useEffect(() => { setPaginaAtual(1); }, [busca, unidadeFiltro, statusFiltro, dataFiltro, ordenarPorPrioridade]);
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
        console.log('Assumir chamado:', chamado.idFirebase, chamado.protocolo, chamado.status);
        if (!chamado.idFirebase || chamado.idFirebase.length < 10) {
            console.error('idFirebase inválido:', chamado);
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
            window.notifyWarning && window.notifyWarning('Assuma o chamado primeiro para concluir');
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
        let houveErro = false;
        for (const arq of arquivos) {
            const ext = (arq.name.split('.').pop() || '').toLowerCase();
            if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) { setErroFotoResolucao(`"${arq.name}" formato não permitido.`); window.notifyWarning && window.notifyWarning(`"${arq.name}" ignorado: formato inválido`); houveErro = true; continue; }
            if (arq.size > 8 * 1024 * 1024) { setErroFotoResolucao(`"${arq.name}" excede 8MB.`); window.notifyWarning && window.notifyWarning(`"${arq.name}" excede 8MB`); houveErro = true; continue; }
            validos.push(arq);
        }
        if (validos.length) window.notifySuccess && window.notifySuccess(`${validos.length} foto(s) adicionada(s)`);
        else if (houveErro) window.notifyError && window.notifyError('Nenhuma foto válida');
        if (fotosResolucao.length + validos.length > 5) window.notifyWarning && window.notifyWarning('Limite de 5 fotos — excedentes ignorados');
        setFotosResolucao(prev => [...prev, ...validos].slice(0, 5));
    };
    const handleCaptureResolucao = (file) => handleSelecionarFotoResolucao([file]);
    const handleConfirmarFinalizacao = async (e) => {
        e.preventDefault(); if (!chamadoEmEncerramento) return;
        if (itensSelecionados.length === 0) { window.notifyWarning && window.notifyWarning('Selecione ao menos um item concluído'); return; }
        if (!servicoFeito.trim()) { window.notifyWarning && window.notifyWarning('Descreva o serviço executado'); return; }
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
            window.notifySuccess && window.notifySuccess('Chamado atualizado com sucesso');
        } catch (err) {
            window.notifyError && window.notifyError(err.message || 'Falha ao concluir');
            if (window.UnilinkLogger) window.UnilinkLogger.error('handleConfirmarFinalizacao', err);
        }
        finally { setEnviandoFinalizacao(false); }
    };

    let listaExibicao = pendentes.filter(c => {
        const atendeEquipamento = c.equipamento && c.equipamento.toLowerCase().includes(busca.toLowerCase());
        const unidadeDoChamado = c.unidade || 'MATRIZ';
        const atendeUnidade = unidadeFiltro === 'TODOS' || unidadeDoChamado === unidadeFiltro;
        const atendeStatus = statusFiltro === 'TODOS' || (c.status || (c.concluido ? 'FECHADO' : 'ABERTO')) === statusFiltro;
        return atendeEquipamento && atendeUnidade && atendeStatus;
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
    const filtrosAtivos = (unidadeFiltro !== 'TODOS' ? 1 : 0) + (statusFiltro !== 'TODOS' ? 1 : 0) + (dataFiltro !== 'TODOS' ? 1 : 0);
    const limparFiltros = () => { setStatusFiltro('TODOS'); setDataFiltro('TODOS'); setUnidadeFiltro('TODOS'); setBusca(''); };
    const isCritico = (c) => c.prioridade === 'Urgente' || calcularDiasDecorridos(c.dataAbertura) > 3;

    const acaoPrincipal = (c, mobile) => {
        const cls = mobile ? 'flex-1 py-2.5 text-[13px]' : 'px-3 py-1.5 text-xs';
        if (podeAssumir(c)) {
            return <button onClick={(e) => { e.stopPropagation(); handleAssumir(c); }} disabled={assumindoId === c.idFirebase} className={`btn-primary shrink-0 ${cls} disabled:opacity-60`}>{assumindoId === c.idFirebase ? 'Assumindo…' : 'Assumir'}</button>;
        }
        if (emAtendimento(c) || aguardando(c)) {
            return <button onClick={(e) => { e.stopPropagation(); handleIniciarEncerramento(c); }} className={`btn-success shrink-0 ${cls}`}>Concluir</button>;
        }
        return <StatusBadge status={c.status} concluido={c.concluido} />;
    };

    return (
        <div className="fade-in w-full">
            {notificacaoAtiva && (
                <div className="toast-in fixed left-1/2 top-4 z-50 flex w-[92vw] max-w-sm -translate-x-1/2 items-center gap-2.5 rounded-xl bg-slate-900 py-3 pl-4 pr-3 text-white shadow-xl dark:bg-white dark:text-slate-900 sm:left-auto sm:right-5 sm:translate-x-0">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold">Novo chamado recebido</span>
                        <span className="block truncate text-xs opacity-70">{notificacaoAtiva.equipamento} • {notificacaoAtiva.servico}</span>
                    </span>
                </div>
            )}

            {/* Modal de conclusão — bottom-sheet no mobile */}
            {chamadoEmEncerramento && (
                <div className="sheet-mobile fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-4 fade-in" onClick={() => setChamadoEmEncerramento(null)}>
                    <div className="sheet-panel flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="border-b u-divider px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">Concluir chamado</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">{chamadoEmEncerramento.equipamento} • {chamadoEmEncerramento.unidade}</p>
                                </div>
                                <button onClick={() => setChamadoEmEncerramento(null)} aria-label="Fechar" className="icon-btn">✕</button>
                            </div>
                            <ProtocoloTag codigo={chamadoEmEncerramento.protocolo} />
                        </div>
                        <form onSubmit={handleConfirmarFinalizacao} className="space-y-4 overflow-y-auto px-5 py-4">
                            <div>
                                <p className="u-label">Itens concluídos *</p>
                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                    {getItens(chamadoEmEncerramento).map(item => {
                                        const checked = itensSelecionados.includes(item);
                                        const jaFeito = (chamadoEmEncerramento.itensConcluidos || []).includes(item);
                                        return (
                                            <label key={item} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition ${checked ? 'border-emerald-500/50 bg-emerald-500/[0.07]' : 'border-slate-200 dark:border-white/10'} ${jaFeito ? 'opacity-50' : ''}`}>
                                                <input type="checkbox" checked={checked} disabled={jaFeito} onChange={() => toggleItem(item)} className="h-4 w-4 accent-emerald-600" />
                                                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{item}</span>
                                                {jaFeito && <span className="ml-auto rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-white dark:text-slate-900">feito</span>}
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="mt-1.5 text-[11px] text-slate-400">{itensSelecionados.length} de {getItens(chamadoEmEncerramento).length} selecionados • parcial mantém pendente, total encerra</p>
                            </div>
                            <div>
                                <label className="u-label">Serviço executado *</label>
                                <textarea required rows="3" maxLength="1000" placeholder="Descreva o que foi feito…" className="u-input resize-none uppercase placeholder:normal-case" value={servicoFeito} onChange={(e) => setServicoFeito(e.target.value.toUpperCase())} />
                            </div>
                            <div>
                                <label className="u-label">Observações</label>
                                <textarea rows="2" maxLength="1000" placeholder="Peça pendente, orientação ao solicitante…" className="u-input resize-none placeholder:normal-case" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
                            </div>
                            <div>
                                <label className="u-label">Pendência <span className="font-normal text-slate-400">(se parcial, o que falta)</span></label>
                                <textarea rows="2" maxLength="1000" placeholder="Ex: aguardando peça X…" className="u-input resize-none uppercase placeholder:normal-case" value={pendencia} onChange={(e) => setPendencia(e.target.value.toUpperCase())} />
                            </div>
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="u-label !mb-0">Evidências</label>
                                    <span className="text-[11px] tabular-nums text-slate-400">{fotosResolucao.length}/5</span>
                                </div>
                                <CameraCapture onCapture={handleCaptureResolucao} onSelectFiles={handleSelecionarFotoResolucao} maxFiles={5} currentCount={fotosResolucao.length} />
                                {erroFotoResolucao && <p className="mt-2 text-xs font-medium text-red-600">{erroFotoResolucao}</p>}
                                {fotosResolucao.length > 0 && (
                                    <div className="mt-2 grid grid-cols-4 gap-2">
                                        {fotosResolucao.map((f, idx) => (
                                            <div key={idx} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                                                <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                                                <button type="button" onClick={() => setFotosResolucao(prev => prev.filter((_, i) => i !== idx))} aria-label="Remover" className="icon-btn absolute right-1 top-1 !rounded-full !bg-slate-950/70 !p-0 !text-white">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 pb-1 pt-1">
                                <button type="button" onClick={() => setChamadoEmEncerramento(null)} className="btn-ghost flex-1 !justify-center">Cancelar</button>
                                <button type="submit" disabled={enviandoFinalizacao} className="btn-success flex-1 !justify-center disabled:opacity-60">{enviandoFinalizacao ? 'Salvando…' : itensSelecionados.length < getItens(chamadoEmEncerramento).length ? 'Concluir parcial' : 'Concluir total'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <PageHeader
                eyebrow="Manutenção"
                title="Chamados pendentes"
                subtitle={`${pendentes.length} em aberto · ${listaExibicao.length} na triagem`}
                live
                back={voltar}
                backLabel="Menu"
                actions={
                    <React.Fragment>
                        <DownloadPopover dados={pendentes} unidadeFiltro={unidadeFiltro} statusFiltro={statusFiltro} dataFiltro={dataFiltro} busca={busca} />
                        <button onClick={() => setOrdenarPorPrioridade(v => !v)} className="btn-ghost" title="Alternar ordenação">
                            {ordenarPorPrioridade ? 'Prioridade' : 'Recentes'}
                        </button>
                    </React.Fragment>
                }
            />

            {/* Pesquisa + filtros */}
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
                    <option value="ABERTO">Aberto</option>
                    <option value="EM_ATENDIMENTO">Em atendimento</option>
                    <option value="AGUARDANDO_USUARIO">Parcial</option>
                    <option value="ATRIBUIDO">Atribuído</option>
                </select>
                <select value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} aria-label="Período" className="u-input sm:max-w-[190px]">
                    <option value="TODOS">Período ▾ · Todo</option>
                    <option value="HOJE">Hoje</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="MES_ATUAL">Mês atual</option>
                    <option value="MES_ANTERIOR">Mês anterior</option>
                </select>
                {(filtrosAtivos > 0 || busca) && (
                    <button onClick={limparFiltros} className="shrink-0 px-2 text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-800 dark:hover:text-white">Limpar</button>
                )}
            </div>

            {/* Lista operacional (mobile) */}
            {listaExibicaoPaginada.length === 0 ? (
                <div className="u-surface"><EmptyState hint="Tente alterar os filtros ou o período." action={(filtrosAtivos > 0 || busca) ? <button onClick={limparFiltros} className="btn-ghost">Limpar filtros</button> : null} /></div>
            ) : (
                <div className="u-surface divide-y u-divider overflow-hidden md:hidden">
                    {listaExibicaoPaginada.map(c => (
                        <div key={c.idFirebase} onClick={() => setDetalhes(c)} className="flex cursor-pointer gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            {isCritico(c) && <span className="w-1 shrink-0 self-stretch rounded-full bg-red-500/80"></span>}
                            <div className="min-w-0 flex-1">
                                <ProtocoloTag codigo={c.protocolo} />
                                <p className="mt-0.5 truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">{c.equipamento}</p>
                                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{c.descricao}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <PriorityBadge prioridade={c.prioridade} />
                                    <StatusBadge status={c.status} concluido={c.concluido} />
                                </div>
                                {c.atribuidoParaNome && <p className="mt-1.5 text-[11px] text-slate-400">{c.atribuidoParaNome}</p>}
                                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                                    <TempoAberto dataAbertura={c.dataAbertura} />
                                    <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:flex-none" onClick={(e) => e.stopPropagation()}>
                                        <button onClick={(e) => { e.stopPropagation(); imprimirOrdemServico(c); }} aria-label="Imprimir OS" className="btn-ghost !px-2.5 !py-2">
                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                        </button>
                                        {acaoPrincipal(c, true)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabela (desktop) */}
            {listaExibicaoPaginada.length > 0 && (
                <div className="u-surface hidden overflow-x-auto md:block">
                    <table className="u-table">
                        <thead><tr><th>Chamado</th><th>Prioridade</th><th>Status</th><th>Responsável</th><th className="!text-right">Tempo aberto</th><th className="!text-center">Ação</th></tr></thead>
                        <tbody>
                            {listaExibicaoPaginada.map(c => (
                                <tr key={c.idFirebase} onClick={() => setDetalhes(c)} className="cursor-pointer">
                                    <td>
                                        <p className="font-semibold text-slate-900 dark:text-white">{c.equipamento}</p>
                                        <span className="mt-0.5 flex items-center gap-2"><ProtocoloTag codigo={c.protocolo} /> <span className="text-[11px] text-slate-400">{c.unidade || 'MATRIZ'}</span></span>
                                    </td>
                                    <td><PriorityBadge prioridade={c.prioridade} /></td>
                                    <td><StatusBadge status={c.status} concluido={c.concluido} /></td>
                                    <td className="max-w-[160px] truncate text-[13px] text-slate-500">{c.atribuidoParaNome || '—'}</td>
                                    <td className="text-right"><TempoAberto dataAbertura={c.dataAbertura} /></td>
                                    <td className="!text-center" onClick={(e) => e.stopPropagation()}>
                                        <span className="inline-flex items-center gap-1.5">
                                            {acaoPrincipal(c, false)}
                                            <button onClick={(e) => { e.stopPropagation(); imprimirOrdemServico(c); }} aria-label="Imprimir OS" className="btn-ghost !px-2.5 !py-1.5">
                                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                            </button>
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {detalhes && <ModalDetalhes chamado={detalhes} aoFechar={() => setDetalhes(null)} aoImprimir={(c) => imprimirOrdemServico(c)} />}
            <Paginacao pagina={paginaAtual} total={totalPaginas} aoMudar={setPaginaAtual} />
        </div>
    );
}
