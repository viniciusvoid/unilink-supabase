// COMPONENTE: ModalDetalhes — registro de service desk
// Cabeçalho seco, informações em linhas, timeline simples.
function ModalDetalhes({ chamado, aoFechar, aoImprimir }) {
    const [eventos, setEventos] = React.useState([]);
    const [evidencias, setEvidencias] = React.useState([]);
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
    const critico = chamado.prioridade === 'Urgente' || (tempo && tempo.dias > 3);

    const Linha = ({ rotulo, valor }) => {
        if (!valor || valor === 'NENHUMA') return null;
        return (
            <div className="flex gap-3 py-1.5">
                <dt className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">{rotulo}</dt>
                <dd className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{valor}</dd>
            </div>
        );
    };

    return (
        <div className={`${critico ? '' : 'sheet-mobile '}fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-4 fade-in`} onClick={aoFechar}>
            {imgAmpliada && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4" onClick={() => setImgAmpliada(null)}>
                    <img src={imgAmpliada} alt="Evidência" className="max-h-full max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setImgAmpliada(null)} aria-label="Fechar" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20">✕</button>
                </div>
            )}
            <div className="sheet-panel flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b u-divider px-5 py-3">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Detalhes do chamado</h3>
                    <button onClick={aoFechar} aria-label="Fechar" className="icon-btn">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <ProtocoloTag codigo={chamado.protocolo} />
                    <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{chamado.equipamento}</h4>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusBadge status={chamado.status} concluido={chamado.concluido} />
                        <PriorityBadge prioridade={chamado.prioridade} />
                    </div>

                    <div className="mt-4 grid gap-x-8 md:grid-cols-[1fr_220px]">
                        <div className="min-w-0">
                            <SectionTitle>Descrição</SectionTitle>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{chamado.descricao || '-'}</p>

                            <div className="mt-5">
                                <SectionTitle>Atividade</SectionTitle>
                                <TimelineView eventos={eventos} />
                            </div>

                            <div className="mt-5">
                                <SectionTitle>Evidências</SectionTitle>
                                <EvidenceGallery fotos={evidencias} onExpand={setImgAmpliada} />
                            </div>
                        </div>
                        <aside className="mt-5 border-t u-divider pt-4 md:mt-0 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                            <dl>
                                <Linha rotulo="Unidade" valor={chamado.unidade || 'MATRIZ'} />
                                <Linha rotulo="Equipamento" valor={chamado.equipamento} />
                                <Linha rotulo="Serviço" valor={chamado.servico} />
                                <Linha rotulo="Localização" valor={chamado.localizacao} />
                                <Linha rotulo="Responsável" valor={chamado.atribuidoParaNome} />
                                <Linha rotulo="Abertura" valor={chamado.dataAbertura} />
                                <Linha rotulo="Tempo aberto" valor={tempo.texto} />
                                <Linha rotulo="Encerramento" valor={chamado.dataEncerramento} />
                                <Linha rotulo="Serviço feito" valor={chamado.servicoFeito} />
                                <Linha rotulo="Pendência" valor={chamado.pendencia} />
                                <Linha rotulo="Observações" valor={chamado.observacoes} />
                            </dl>
                        </aside>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t u-divider px-5 py-3">
                    <button onClick={aoFechar} className="btn-ghost">Fechar</button>
                    <button onClick={() => aoImprimir && aoImprimir(chamado)} className="btn-primary">Imprimir OS</button>
                </div>
            </div>
        </div>
    );
}
