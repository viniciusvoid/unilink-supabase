// ==========================================================
// TELA: Acompanhamento público — simples para o usuário final
// Mesma lógica de busca; visual: protocolo → progresso →
// última atualização → histórico → evidências.
// ==========================================================
function TelaAcompanhamento({ protocoloInicial = '', voltar }) {
    const [protocolo, setProtocolo] = React.useState(protocoloInicial || '');
    const [carregando, setCarregando] = React.useState(false);
    const [erro, setErro] = React.useState('');
    const [chamado, setChamado] = React.useState(null);
    const [eventos, setEventos] = React.useState([]);
    const [evidencias, setEvidencias] = React.useState([]);
    const buscarChamado = React.useCallback(async (protocoloBusca) => {
        if (!protocoloBusca || !protocoloBusca.trim()) { window.notifyWarning && window.notifyWarning('Informe o protocolo'); return; }
        setCarregando(true); setErro(''); setChamado(null); setEventos([]); setEvidencias([]);
        try {
            const encontrado = await ChamadosService.buscarPorProtocolo(protocoloBusca);
            if (!encontrado) { setErro('Nenhum chamado encontrado com este protocolo. Confira e tente de novo.'); return; }
            setChamado(encontrado);
            const [ev, fotos] = await Promise.all([ChamadosService.listarEventos(encontrado.idFirebase), ChamadosService.listarEvidencias(encontrado.idFirebase)]);
            setEventos(ev); setEvidencias(fotos);
        } catch (e) {
            console.error(e);
            const msg = 'Não foi possível buscar o chamado. Verifique o protocolo e a conexão.';
            setErro(msg);
            if (window.UnilinkLogger) window.UnilinkLogger.error('buscarChamado', e);
        }
        finally { setCarregando(false); }
    }, []);
    React.useEffect(() => { if (protocoloInicial) buscarChamado(protocoloInicial); }, [protocoloInicial, buscarChamado]);
    const handleSubmit = (e) => { e.preventDefault(); buscarChamado(protocolo); };

    // Progresso simplificado em 4 etapas
    const ETAPAS = ['Aberto', 'Análise', 'Atendimento', 'Resolvido'];
    const indiceProgresso = (() => {
        if (!chamado) return -1;
        const s = chamado.status || (chamado.concluido ? 'FECHADO' : 'ABERTO');
        if (s === 'ABERTO') return 0;
        if (s === 'EM_ANALISE' || s === 'ATRIBUIDO') return 1;
        if (s === 'EM_ATENDIMENTO' || s === 'AGUARDANDO_USUARIO') return 2;
        return 3;
    })();
    const ultimaAtualizacao = eventos.length > 0 ? eventos[eventos.length - 1].criadoEm : (chamado?.dataEncerramento || chamado?.dataAbertura);

    return (
        <div className="fade-in mx-auto w-full max-w-[560px]">
            <PageHeader eyebrow="Solicitante" title="Acompanhar chamado" back={voltar} backLabel="Voltar" />

            <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
                <div className="relative flex-1">
                    <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
                    <input type="text" required placeholder="Digite o protocolo" aria-label="Protocolo" className="u-input !pl-9 font-mono uppercase" value={protocolo} onChange={(e) => setProtocolo(e.target.value.toUpperCase())} />
                </div>
                <button type="submit" disabled={carregando} className="btn-primary shrink-0">{carregando ? '…' : 'Buscar'}</button>
            </form>

            {carregando && <SkeletonRows linhas={3} />}
            {erro && !carregando && (
                <div className="u-surface px-5 py-4 text-center">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Protocolo não encontrado</p>
                    <p className="mt-1 text-xs text-slate-500">{erro}</p>
                </div>
            )}

            {chamado && !carregando && (
                <div className="space-y-4">
                    {/* Identificação */}
                    <section className="u-surface px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <ProtocoloTag codigo={chamado.protocolo} tamanho="text-[13px]" />
                            <PriorityBadge prioridade={chamado.prioridade} />
                        </div>
                        <h2 className="mt-2 text-[17px] font-bold tracking-tight text-slate-900 dark:text-white">{chamado.equipamento}</h2>
                        <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500 dark:text-slate-400">{chamado.descricao}</p>
                        <div className="mt-2"><StatusBadge status={chamado.status} concluido={chamado.concluido} /></div>
                    </section>

                    {/* Progresso */}
                    <section className="u-surface px-5 py-4">
                        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div className="h-full rounded-full bg-[#0E3263] transition-all dark:bg-white" style={{ width: `${((indiceProgresso + 1) / ETAPAS.length) * 100}%` }}></div>
                        </div>
                        <ol className="flex items-center justify-between">
                            {ETAPAS.map((etapa, idx) => {
                                const feito = idx <= indiceProgresso;
                                const atual = idx === indiceProgresso;
                                return (
                                    <li key={etapa} className="flex flex-1 flex-col items-center gap-1.5 last:flex-none first:items-start last:items-end">
                                        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${feito ? 'bg-[#0E3263] text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>
                                            {feito && !atual ? '✓' : idx + 1}
                                        </span>
                                        <span className={`text-[10px] ${atual ? 'font-bold text-slate-800 dark:text-white' : feito ? 'font-medium text-slate-500' : 'text-slate-400'}`}>{etapa}</span>
                                    </li>
                                );
                            })}
                        </ol>
                        <div className="mt-3 border-t u-divider pt-3 text-xs text-slate-500 dark:text-slate-400">
                            Última atualização: <strong className="font-semibold text-slate-700 dark:text-slate-200">{ultimaAtualizacao || '-'}</strong>
                        </div>
                    </section>

                    {/* Histórico */}
                    <section className="u-surface px-5 py-4">
                        <SectionTitle>Histórico</SectionTitle>
                        <TimelineView eventos={eventos} />
                    </section>

                    {/* Evidências */}
                    {evidencias.length > 0 && (
                        <section className="u-surface px-5 py-4">
                            <SectionTitle>Evidências</SectionTitle>
                            <EvidenceGallery fotos={evidencias} />
                        </section>
                    )}
                </div>
            )}

            {!chamado && !erro && !carregando && (
                <EmptyState title="Acompanhe seu chamado" hint="Digite o protocolo recebido na abertura para ver o andamento." />
            )}
        </div>
    );
}
