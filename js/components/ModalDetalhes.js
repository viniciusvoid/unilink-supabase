// ==========================================================
// COMPONENTE: ModalDetalhes — ferramenta profissional de gestão
// Mesma API ({ chamado, aoFechar, aoImprimir }).
// Cabeçalho operacional → conteúdo em 2 colunas → timeline/galeria.
// ==========================================================
function ModalDetalhes({ chamado, aoFechar, aoImprimir }) {
    const [eventos, setEventos] = React.useState([]);
    const [evidencias, setEvidencias] = React.useState([]);
    const [aba, setAba] = React.useState('geral'); // geral | timeline | fotos
    const [imgAmpliada, setImgAmpliada] = React.useState(null);

    React.useEffect(() => {
        if (!chamado) return;
        ChamadosService.listarEventos(chamado.idFirebase).then(setEventos).catch(() => {});
        ChamadosService.listarEvidencias(chamado.idFirebase).then(setEvidencias).catch(() => {});
    }, [chamado]);

    React.useEffect(() => {
        const esc = (e) => { if (e.key === 'Escape') aoFechar && aoFechar(); };
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [aoFechar]);

    if (!chamado) return null;
    const tempo = tempoAbertoInfo(chamado.dataAbertura);
    // Crítico (Urgente ou +3 dias): sempre centralizado, até no mobile (sem bottom-sheet)
    const critico = chamado.prioridade === 'Urgente' || (tempo && tempo.dias > 3);

    return (
        <div className={`${critico ? '' : 'sheet-mobile '}fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-4 fade-in`} onClick={aoFechar}>
            {imgAmpliada && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => setImgAmpliada(null)}>
                    <img src={imgAmpliada} alt="Evidência" className="max-h-full max-w-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setImgAmpliada(null)} aria-label="Fechar" className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">✕</button>
                </div>
            )}
            <div className="sheet-panel flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Cabeçalho operacional */}
                <div className="border-b u-divider px-5 pb-4 pt-5">
                    <div className="flex items-start justify-between gap-3">
                        <button onClick={aoFechar} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white sm:hidden">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                            Voltar
                        </button>
                        <ProtocoloTag codigo={chamado.protocolo} />
                        <button onClick={aoFechar} aria-label="Fechar" className="icon-btn hidden sm:inline-flex">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white">{chamado.equipamento}</h3>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <PriorityBadge prioridade={chamado.prioridade} />
                        <StatusBadge status={chamado.status} concluido={chamado.concluido} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t u-divider pt-3 text-xs text-slate-500 dark:text-slate-400">
                        <TempoAberto dataAbertura={chamado.dataAbertura} />
                        {chamado.atribuidoParaNome && <span>Responsável: <strong className="font-semibold text-slate-700 dark:text-slate-200">{chamado.atribuidoParaNome}</strong></span>}
                        <span>Unidade: <strong className="font-semibold text-slate-700 dark:text-slate-200">{chamado.unidade || 'MATRIZ'}</strong></span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => aoImprimir && aoImprimir(chamado)} className="btn-ghost !py-2">Imprimir OS</button>
                    </div>
                </div>

                {/* Abas discretas */}
                <div className="flex gap-1 overflow-x-auto border-b u-divider px-3 py-2">
                    {[
                        { k: 'geral', l: 'Detalhes' },
                        { k: 'timeline', l: `Atividade · ${eventos.length}` },
                        { k: 'fotos', l: `Evidências · ${evidencias.length}` }
                    ].map(t => (
                        <button key={t.k} onClick={() => setAba(t.k)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${aba === t.k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5'}`}>{t.l}</button>
                    ))}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {aba === 'geral' && (
                        <div className="grid gap-6 md:grid-cols-[1fr_240px]">
                            <div className="min-w-0 space-y-5">
                                <div>
                                    <p className="u-eyebrow mb-1.5">Descrição do problema</p>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{chamado.descricao || '-'}</p>
                                    <p className="mt-1.5 text-xs text-slate-400">Local: {chamado.localizacao || '-'} • Aberto em {chamado.dataAbertura || '-'}</p>
                                </div>
                                {(chamado.servicoFeito || chamado.pendencia || chamado.observacoes) && (
                                    <div className="space-y-3 border-t u-divider pt-4">
                                        {chamado.servicoFeito && (
                                            <div>
                                                <p className="u-eyebrow mb-1">Serviço executado</p>
                                                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{chamado.servicoFeito}</p>
                                            </div>
                                        )}
                                        {chamado.pendencia && chamado.pendencia !== 'NENHUMA' && (
                                            <div>
                                                <p className="u-eyebrow mb-1">Pendência</p>
                                                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{chamado.pendencia}</p>
                                            </div>
                                        )}
                                        {chamado.observacoes && (
                                            <div>
                                                <p className="u-eyebrow mb-1">Observações</p>
                                                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{chamado.observacoes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="border-t u-divider pt-4">
                                    <p className="u-eyebrow mb-2">Atividade recente</p>
                                    <TimelineView eventos={eventos.slice(0, 3)} />
                                    {eventos.length > 3 && <button onClick={() => setAba('timeline')} className="mt-1 text-xs font-semibold text-[#0E3263] dark:text-sky-300 hover:underline">Ver linha do tempo completa</button>}
                                </div>
                            </div>
                            <aside className="space-y-4 md:border-l u-divider md:pl-5">
                                <p className="u-eyebrow">Informações</p>
                                <dl className="space-y-3 text-sm">
                                    <div><dt className="text-[11px] text-slate-400">Prioridade</dt><dd className="mt-0.5"><PriorityBadge prioridade={chamado.prioridade} /></dd></div>
                                    <div><dt className="text-[11px] text-slate-400">Serviço</dt><dd className="mt-0.5"><ServiceBadge servico={chamado.servico} /></dd></div>
                                    <div><dt className="text-[11px] text-slate-400">Responsável</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{chamado.atribuidoParaNome || '—'}</dd></div>
                                    <div><dt className="text-[11px] text-slate-400">Unidade</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{chamado.unidade || 'MATRIZ'}</dd></div>
                                    <div><dt className="text-[11px] text-slate-400">Equipamento</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{chamado.equipamento || '-'}</dd></div>
                                    <div><dt className="text-[11px] text-slate-400">Encerramento</dt><dd className="font-medium text-slate-700 dark:text-slate-200">{chamado.dataEncerramento || '—'}</dd></div>
                                </dl>
                                {evidencias.length > 0 && (
                                    <div>
                                        <p className="u-eyebrow mb-2">Evidências</p>
                                        <EvidenceGallery fotos={evidencias} compact onExpand={setImgAmpliada} />
                                    </div>
                                )}
                            </aside>
                        </div>
                    )}
                    {aba === 'timeline' && <TimelineView eventos={eventos} />}
                    {aba === 'fotos' && <EvidenceGallery fotos={evidencias} onExpand={setImgAmpliada} />}
                </div>
            </div>
        </div>
    );
}
