// ==========================================================
// COMPONENTE: ModalDetalhes — exibe todas as infos do chamado
// Usado em Pendentes, Histórico, Dashboard (clique no card/linha)
// ==========================================================
function ModalDetalhes({ chamado, aoFechar, aoImprimir }) {
    const [eventos, setEventos] = React.useState([]);
    const [evidencias, setEvidencias] = React.useState([]);
    const [aba, setAba] = React.useState('geral'); // geral | timeline | fotos
    const [imgAmpliada, setImgAmpliada] = React.useState(null);

    React.useEffect(() => {
        if (!chamado) return;
        ChamadosService.listarEventos(chamado.idFirebase).then(setEventos);
        ChamadosService.listarEvidencias(chamado.idFirebase).then(setEvidencias);
    }, [chamado]);

    if (!chamado) return null;

    const copiarProtocolo = () => {
        navigator.clipboard.writeText(chamado.protocolo).then(()=>window.notifySuccess && window.notifySuccess('Protocolo ' + chamado.protocolo + ' copiado!'));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 fade-in" onClick={aoFechar}>
            {imgAmpliada && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={()=>setImgAmpliada(null)}>
                    <img src={imgAmpliada} alt="Evidência" className="max-w-full max-h-full rounded-xl shadow-2xl" onClick={e=>e.stopPropagation()} />
                    <button onClick={()=>setImgAmpliada(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center">×</button>
                </div>
            )}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e=>e.stopPropagation()}>
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-800">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">{chamado.equipamento}</h3>
                            <PriorityBadge prioridade={chamado.prioridade} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-700 dark:text-slate-300">{chamado.protocolo}</span>
                            <button onClick={copiarProtocolo} className="p-1 rounded hover:bg-white dark:hover:bg-slate-700" title="Copiar protocolo"><svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
                            <span className="text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2 py-1 rounded-full font-bold">{chamado.status}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded-full text-slate-700 dark:text-slate-300">{chamado.unidade}</span>
                            <ServiceBadge servico={chamado.servico} />
                            <span className="text-xs text-slate-500">{chamado.dataAbertura}</span>
                        </div>
                    </div>
                    <button onClick={aoFechar} className="shrink-0 w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 hover:bg-slate-50">×</button>
                </div>

                <div className="flex gap-1 p-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                    {[
                        {k:'geral', l:'Geral'},
                        {k:'timeline', l:`Timeline (${eventos.length})`},
                        {k:'fotos', l:`Fotos (${evidencias.length})`}
                    ].map(t=>(
                        <button key={t.k} onClick={()=>setAba(t.k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${aba===t.k ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{t.l}</button>
                    ))}
                    <button onClick={()=>aoImprimir && aoImprimir(chamado)} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg> PDF</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {aba==='geral' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"><p className="text-[11px] font-bold uppercase text-slate-500">Equipamento</p><p className="font-semibold text-slate-900 dark:text-white">{chamado.equipamento}</p></div>
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"><p className="text-[11px] font-bold uppercase text-slate-500">Prioridade</p><p className="font-semibold"><PriorityBadge prioridade={chamado.prioridade}/></p></div>
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"><p className="text-[11px] font-bold uppercase text-slate-500">Localização</p><p className="font-medium text-slate-700 dark:text-slate-300">{chamado.localizacao}</p></div>
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"><p className="text-[11px] font-bold uppercase text-slate-500">Unidade</p><p className="font-medium text-slate-700 dark:text-slate-300">{chamado.unidade}</p></div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3"><p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Descrição</p><p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{chamado.descricao}</p></div>
                            {(chamado.servicoFeito || chamado.pendencia || chamado.observacoes) && (
                                <div className="space-y-2">
                                    {chamado.servicoFeito && <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3"><p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Serviço feito</p><p className="text-sm text-slate-700 dark:text-slate-300">{chamado.servicoFeito}</p></div>}
                                    {chamado.pendencia && chamado.pendencia!=='NENHUMA' && <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3"><p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase">Pendência</p><p className="text-sm text-slate-700 dark:text-slate-300">{chamado.pendencia}</p></div>}
                                    {chamado.observacoes && <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3"><p className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase">Observações</p><p className="text-sm text-slate-700 dark:text-slate-300">{chamado.observacoes}</p></div>}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5"><p className="font-semibold text-slate-500 uppercase text-[10px]">Abertura</p><p className="font-medium text-slate-700 dark:text-slate-300">{chamado.dataAbertura}</p></div>
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5"><p className="font-semibold text-slate-500 uppercase text-[10px]">Encerramento</p><p className="font-medium text-slate-700 dark:text-slate-300">{chamado.dataEncerramento}</p></div>
                                {chamado.atribuidoParaNome && <div className="col-span-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5"><p className="font-semibold text-slate-500 uppercase text-[10px]">Atribuído</p><p className="font-medium text-slate-700 dark:text-slate-300">{chamado.atribuidoParaNome} {chamado.atribuidoEm ? `• ${chamado.atribuidoEm}` : ''}</p></div>}
                            </div>
                        </div>
                    )}
                    {aba==='timeline' && (
                        <div className="space-y-3">
                            {eventos.length===0 ? <p className="text-sm text-slate-500 text-center py-6">Nenhum evento</p> : eventos.map((ev, idx)=>(
                                <div key={ev.id} className="flex gap-3">
                                    <div className="flex flex-col items-center shrink-0"><div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-white mt-1.5"></div>{idx<eventos.length-1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1"></div>}</div>
                                    <div className="pb-3 flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{ev.tipoEvento}</p>
                                        {ev.descricao && <p className="text-xs text-slate-600 dark:text-slate-300 break-words">{ev.descricao}</p>}
                                        <p className="text-xs text-slate-500 mt-1">{ev.criadoEm} {ev.usuarioNome ? `• ${ev.usuarioNome}` : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {aba==='fotos' && (
                        <div>
                            {evidencias.length===0 ? <p className="text-sm text-slate-500 text-center py-6">Nenhuma evidência</p> : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {evidencias.map(ev=>(
                                        <button key={ev.id} onClick={()=>setImgAmpliada(ev.url)} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                            <img src={ev.url} alt={ev.nomeArquivo} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">{ev.etapa}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex gap-2 bg-slate-50 dark:bg-slate-800">
                    <button onClick={aoFechar} className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-2.5 rounded-lg text-sm">Fechar</button>
                    <button onClick={()=>{ aoImprimir && aoImprimir(chamado); }} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2.5 rounded-lg text-sm">Imprimir OS</button>
                </div>
            </div>
        </div>
    );
}
