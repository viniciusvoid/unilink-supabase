// ==========================================================
// TELA: Menu principal (legado — mantido por compatibilidade)
// Visual alinhado à linguagem operacional atual.
// ==========================================================
function TelaMenu({ setTela, chamados, aoSolicitarVerChamados, aoSolicitarHistorico, aoSolicitarDashboard, aoSolicitarLogin, aoAcompanhar, meuPerfil, autenticado, aoSair }) {
    const pendentesCount = chamados.length;
    const estaLogado = !!autenticado;

    const CardAcao = ({ icon, title, desc, badge, onClick, destaque }) => (
        <button
            onClick={onClick}
            className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
        >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${destaque ? 'bg-[#0E3263] text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300'}`}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
                    {badge}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{desc}</span>
            </span>
            <svg className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
    );

    return (
        <div className="fade-in mx-auto w-full max-w-[640px]">
            <PageHeader eyebrow="UNILINK" title="Painel principal" subtitle="Escolha uma opção para continuar." back={() => setTela('splash')} backLabel="Início" />
            {estaLogado ? (
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                    <LiveDot label={`${meuPerfil?.email} • ${meuPerfil?.papel}`} />
                    <button onClick={aoSair} className="text-[11px] font-semibold text-slate-400 hover:text-red-600">Sair</button>
                </div>
            ) : (
                <div className="u-surface mb-3 flex items-center justify-between gap-3 px-4 py-3.5">
                    <p className="text-[13px] text-slate-500">Um login libera todos os módulos.</p>
                    <button onClick={aoSolicitarLogin} className="btn-primary shrink-0 !py-2.5">Entrar</button>
                </div>
            )}
            <div className="u-surface divide-y u-divider overflow-hidden">
                <CardAcao onClick={() => setTela('corretiva')} destaque title="Abrir corretiva" desc="Registrar nova solicitação" icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>} />
                <CardAcao onClick={aoAcompanhar} title="Acompanhar chamado" desc="Consultar pelo protocolo" icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>} />
                <CardAcao onClick={aoSolicitarVerChamados} title="Chamados pendentes" desc="Assumir e atualizar" badge={<span className="rounded-full bg-[#0E3263] px-2 py-0.5 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">{pendentesCount}</span>} icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.5a2.5 2.5 0 110 5H14m-4-5h-2a2 2 0 00-2 2v4a2 2 0 002 2h2m4-8v8m-4-8v8" /></svg>} />
                <CardAcao onClick={aoSolicitarHistorico} title="Histórico" desc="Chamados concluídos" icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <CardAcao onClick={aoSolicitarDashboard} title="Dashboard" desc={estaLogado ? 'Indicadores por serviço' : 'Requer login'} badge={!estaLogado ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">login</span> : null} icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 12l3-3 3 3 4-4" /></svg>} />
            </div>
        </div>
    );
}
