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

    return (
        <div className="fade-in mx-auto w-full max-w-[560px]">
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

                    <dl className="mt-4 divide-y u-divider border-y u-divider">
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
                            <dd className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{[chamado.localizacao, chamado.unidade].filter(Boolean).join(' • ') || '-'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Aberto em</dt>
                            <dd className="min-w-0 flex-1 text-sm tabular-nums text-slate-700 dark:text-slate-200">{chamado.dataAbertura || '-'}</dd>
                        </div>
                        <div className="flex gap-3 py-2">
                            <dt className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">Tempo decorrido</dt>
                            <dd className="min-w-0 flex-1 text-sm tabular-nums text-slate-700 dark:text-slate-200">{tempo ? tempo.texto : '-'}</dd>
                        </div>
                    </dl>

                    <div className="mt-5">
                        <SectionTitle>Atividade</SectionTitle>
                        <TimelineView eventos={eventos} />
                    </div>

                    {evidencias.length > 0 && (
                        <div className="mt-5">
                            <SectionTitle>Evidências</SectionTitle>
                            <EvidenceGallery fotos={evidencias} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
