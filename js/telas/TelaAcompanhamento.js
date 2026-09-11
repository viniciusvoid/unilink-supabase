// TELA: Acompanhamento — consulta direta por protocolo
function TelaAcompanhamento({ protocoloInicial = '' }) {
    const [protocolo, setProtocolo] = React.useState(protocoloInicial || '');
    const [carregando, setCarregando] = React.useState(false);
    const [erro, setErro] = React.useState('');
    const [chamado, setChamado] = React.useState(null);
    const [eventos, setEventos] = React.useState([]);
    const [evidencias, setEvidencias] = React.useState([]);
    const buscarChamado = React.useCallback(async (protocoloBusca) => {
        if (!protocoloBusca || !protocoloBusca.trim()) { window.notifyWarning && window.notifyWarning('Informe o protocolo.'); return; }
        setCarregando(true); setErro(''); setChamado(null); setEventos([]); setEvidencias([]);
        try {
            const encontrado = await ChamadosService.buscarPorProtocolo(protocoloBusca);
            if (!encontrado) { setErro('Protocolo não encontrado.'); return; }
            setChamado(encontrado);
            salvarProtocoloRecente(encontrado.protocolo);
            const [ev, fotos] = await Promise.all([ChamadosService.listarEventos(encontrado.idFirebase), ChamadosService.listarEvidencias(encontrado.idFirebase)]);
            setEventos(ev); setEvidencias(fotos);
        } catch (e) {
            console.error(e);
            setErro('Não foi possível carregar o chamado.');
            if (window.UnilinkLogger) window.UnilinkLogger.error('buscarChamado', e);
        }
        finally { setCarregando(false); }
    }, []);
    React.useEffect(() => { if (protocoloInicial) buscarChamado(protocoloInicial); }, [protocoloInicial, buscarChamado]);
    const handleSubmit = (e) => { e.preventDefault(); buscarChamado(protocolo); };
    const tempo = chamado ? tempoAbertoInfo(chamado.dataAbertura) : null;
    const etapa = (() => {
        if (!chamado) return -1;
        const s = chamado.status || (chamado.concluido ? 'FECHADO' : 'ABERTO');
        if (s === 'RESOLVIDO' || s === 'FECHADO' || chamado.concluido) return 2;
        if (s === 'EM_ATENDIMENTO' || s === 'AGUARDANDO_USUARIO' || s === 'ATRIBUIDO') return 1;
        return 0;
    })();
    const ETAPAS_ACOMP = ['Aberto', 'Em atendimento', 'Concluído'];
    const ultimaAtualizacao = eventos.length > 0 ? eventos[eventos.length - 1].criadoEm : (chamado?.dataAbertura || '-');

    return (
        <div className="mx-auto w-full max-w-[560px]">
            <PageHeader title="Acompanhar" />

            <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
                <input type="text" placeholder="Protocolo" aria-label="Protocolo" className="u-input flex-1 font-mono uppercase" value={protocolo} onChange={(e) => setProtocolo(e.target.value.toUpperCase())} />
                <button type="submit" disabled={carregando} className="btn-primary shrink-0 disabled:opacity-60">{carregando ? '…' : 'Buscar'}</button>
            </form>

            {carregando && <SkeletonRows linhas={3} />}
            {erro && !carregando && <p className="py-6 text-center text-sm text-slate-500">{erro}</p>}

            {chamado && !carregando && (
                <div>
                    <ProtocoloTag codigo={chamado.protocolo} />
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{chamado.equipamento}</h2>
                    <div className="mt-2"><StatusBadge status={chamado.status} concluido={chamado.concluido} /></div>

                    <div className="mt-3">
                        <SectionTitle>Status</SectionTitle>
                        <div className="flex items-center">
                            {ETAPAS_ACOMP.map((label, idx) => {
                                const feito = idx < etapa;
                                const atual = idx === etapa;
                                return (
                                    <React.Fragment key={label}>
                                        {idx > 0 && <span className={`mx-1 h-0.5 flex-1 rounded-full ${idx <= etapa ? 'bg-[#0E3263] dark:bg-sky-400' : 'bg-slate-200 dark:bg-slate-700'}`}></span>}
                                        <span className="flex flex-col items-center gap-1">
                                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${atual ? 'bg-[#0E3263] font-medium text-white dark:bg-sky-400 dark:text-slate-950' : feito ? 'bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900' : 'bg-slate-200 text-slate-400 dark:bg-slate-700'}`}>
                                                {feito && !atual ? '✓' : idx + 1}
                                            </span>
                                            <span className={`whitespace-nowrap text-[10px] ${atual ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{label}</span>
                                        </span>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    <dl className="u-surface mt-4 divide-y u-divider px-4">
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Problema</dt>
                            <dd className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{chamado.descricao || '-'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Equipamento</dt>
                            <dd className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{chamado.equipamento || '-'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Localização</dt>
                            <dd className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{[chamado.localizacao, chamado.unidade].filter(Boolean).join(', ') || '-'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Aberto em</dt>
                            <dd className="min-w-0 flex-1 text-sm tabular-nums text-slate-700 dark:text-slate-200">{chamado.dataAbertura || '-'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Tempo decorrido</dt>
                            <dd className="min-w-0 flex-1 text-sm tabular-nums text-slate-700 dark:text-slate-200">{tempo ? tempo.texto : '-'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Responsável</dt>
                            <dd className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{chamado.atribuidoParaNome || '—'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Última atualização</dt>
                            <dd className="min-w-0 flex-1 text-sm tabular-nums text-slate-700 dark:text-slate-200">{ultimaAtualizacao}</dd>
                        </div>
                    </dl>

                    <div className="mt-5">
                        <SectionTitle>Atividade</SectionTitle>
                        <TimelineView eventos={eventos} />
                    </div>

                    {evidencias.length > 0 && (
                        <div className="mt-5">
                            <SectionTitle action={<span className="text-[11px] tabular-nums text-slate-400">{evidencias.length}</span>}>Evidências</SectionTitle>
                            <EvidenceGallery fotos={evidencias} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
