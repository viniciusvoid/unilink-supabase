// ==========================================================
// UNILINK — Design System (linguagem visual única)
// ----------------------------------------------------------
// Primitivos compartilhados por TODAS as telas. Nada aqui toca
// em regra de negócio: apenas apresentação consistente para
// status, prioridade, protocolo, tempo, timeline, evidências,
// estados (loading/vazio/erro), cabeçalhos e ícones.
// Cor principal: azul institucional #0E3263 (uso estratégico).
// ==========================================================

const BRAND = '#0E3263';
const BRAND_DARK = '#0A2447';

// ---------- Status ----------
const STATUS_LABEL = {
    ABERTO: 'Aberto',
    EM_ANALISE: 'Em análise',
    ATRIBUIDO: 'Atribuído',
    EM_ATENDIMENTO: 'Em atendimento',
    AGUARDANDO_USUARIO: 'Aguardando usuário',
    RESOLVIDO: 'Resolvido',
    FECHADO: 'Encerrado'
};

const STATUS_STYLE = {
    ABERTO: 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300',
    EM_ANALISE: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    ATRIBUIDO: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
    EM_ATENDIMENTO: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    AGUARDANDO_USUARIO: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
    RESOLVIDO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    FECHADO: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
};

function StatusBadge({ status, concluido }) {
    const s = status || (concluido ? 'FECHADO' : 'ABERTO');
    const label = STATUS_LABEL[s] || String(s).replace(/_/g, ' ').toLowerCase();
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none whitespace-nowrap ${STATUS_STYLE[s] || STATUS_STYLE.ABERTO}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
            {label}
        </span>
    );
}

// ---------- Protocolo (identificador técnico, mono) ----------
function ProtocoloTag({ codigo, copiar = true, tamanho = 'text-xs' }) {
    if (!codigo) return null;
    const copiarFn = (e) => {
        e && e.stopPropagation && e.stopPropagation();
        try {
            navigator.clipboard.writeText(codigo).then(
                () => window.notifySuccess && window.notifySuccess('Protocolo copiado')
            ).catch(() => {});
        } catch {}
    };
    return (
        <span className={`inline-flex items-center gap-1 font-mono font-semibold tracking-wide text-slate-500 dark:text-slate-400 ${tamanho}`}>
            #{String(codigo).replace(/^#/, '')}
            {copiar && (
                <button onClick={copiarFn} title="Copiar protocolo" aria-label="Copiar protocolo" className="icon-btn !min-w-0 !p-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
            )}
        </span>
    );
}

// ---------- Indicador "tempo real" discreto ----------
function LiveDot({ label = 'Tempo real', pulse = true }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <span className="relative flex w-1.5 h-1.5">
                {pulse && <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" style={{animationDuration: '2.2s'}}></span>}
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </span>
            {label}
        </span>
    );
}

// ---------- Cabeçalho operacional padrão ----------
function PageHeader({ eyebrow, title, subtitle, back, backLabel = 'Voltar', actions, live = false, updatedAt }) {
    return (
        <div className="mb-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    {eyebrow && <p className="u-eyebrow mb-1">{eyebrow}</p>}
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
                    {subtitle && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
                    {(live || updatedAt) && (
                        <div className="mt-1.5 flex items-center gap-2">
                            {live && <LiveDot />}
                            {updatedAt && <span className="text-[11px] text-slate-400 dark:text-slate-500">{updatedAt}</span>}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                    {actions}
                    {back && (
                        <button onClick={back} className="btn-ghost">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                            {backLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------- Título de seção discreto ----------
function SectionTitle({ children, action }) {
    return (
        <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="u-eyebrow">{children}</h2>
            {action}
        </div>
    );
}

// ---------- Estado vazio ----------
function EmptyState({ title = 'Nenhum chamado encontrado', hint = 'Tente alterar os filtros ou o período.', action = null }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-[280px]">{hint}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

// ---------- Skeleton de carregamento ----------
function SkeletonRows({ linhas = 4 }) {
    return (
        <div className="space-y-2.5" aria-hidden="true">
            {Array.from({ length: linhas }, (_, i) => (
                <div key={i} className="u-skeleton h-16 rounded-xl" style={{ animationDelay: `${i * 90}ms` }}></div>
            ))}
        </div>
    );
}

// ---------- Timeline profissional ----------
const EVENTO_LABEL = {
    ABERTURA: 'Chamado aberto',
    ATRIBUICAO: 'Técnico atribuído',
    EM_ATENDIMENTO_INICIADO: 'Atendimento iniciado',
    EM_ATENDIMENTO_PAUSADO: 'Atendimento pausado',
    OBSERVACAO: 'Atualização adicionada',
    EVIDENCIA_ADICIONADA: 'Evidência anexada',
    CONCLUSAO_PARCIAL: 'Conclusão parcial registrada',
    ENCERRAMENTO: 'Chamado encerrado'
};

function TimelineView({ eventos = [], usuarioPorId = null }) {
    if (!eventos || eventos.length === 0) {
        return <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">Nenhuma atividade registrada.</p>;
    }
    return (
        <ol className="relative">
            {eventos.map((ev, idx) => {
                const ultimo = idx === eventos.length - 1;
                const nome = ev.usuarioNome || (usuarioPorId && usuarioPorId(ev.usuarioId)) || '';
                return (
                    <li key={ev.id || idx} className="relative flex gap-3 pb-5 last:pb-0">
                        {!ultimo && <span className="absolute left-[5px] top-4 bottom-0 w-px bg-slate-200 dark:bg-white/10"></span>}
                        <span className="relative z-10 mt-1.5 w-[11px] h-[11px] shrink-0 rounded-full border-2 border-white dark:border-slate-900 bg-slate-300 dark:bg-slate-600" style={idx === 0 ? { background: '#10b981' } : null}></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold leading-tight text-slate-800 dark:text-slate-100">{EVENTO_LABEL[ev.tipoEvento] || ev.tipoEvento}</p>
                            {ev.descricao && <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 break-words">{ev.descricao}</p>}
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{ev.criadoEm}{nome ? ` • ${nome}` : ''}</p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// ---------- Galeria de evidências ----------
function EvidenceGallery({ fotos = [], onExpand, compact = false }) {
    const [ampliada, setAmpliada] = React.useState(null);
    const abrir = (url) => { if (onExpand) onExpand(url); else setAmpliada(url); };
    return (
        <React.Fragment>
            {(!onExpand && ampliada) && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm fade-in" onClick={() => setAmpliada(null)}>
                    <img src={ampliada} alt="Evidência ampliada" className="max-h-full max-w-full rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setAmpliada(null)} aria-label="Fechar" className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20">✕</button>
                </div>
            )}
            {fotos.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-white/10 px-4 py-5 text-slate-400 dark:text-slate-500">
                    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h6l2 3h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z"/><circle cx="12" cy="13" r="3"/></svg>
                    <p className="text-xs">Nenhuma evidência anexada.</p>
                </div>
            ) : (
                <div className={`grid gap-2 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
                    {fotos.map((f, i) => {
                        const url = typeof f === 'string' ? f : f.url;
                        const nome = (f && f.nomeArquivo) || `Evidência ${i + 1}`;
                        const etapa = f && f.etapa;
                        return (
                            <button key={(f && f.id) || i} onClick={() => abrir(url)} title={nome} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                                <img src={url} alt={nome} loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:opacity-85" />
                                {etapa && <span className="absolute inset-x-0 bottom-0 truncate bg-slate-950/60 px-1 py-0.5 text-[10px] font-medium text-white">{etapa}</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </React.Fragment>
    );
}

// ---------- Tempo em aberto (destaque proporcional) ----------
function tempoAbertoInfo(dataAberturaStr) {
    try {
        const dt = (typeof parseDataBR === 'function') ? parseDataBR(dataAberturaStr) : null;
        if (!dt) return { texto: '-', minutos: 0, dias: 0, critico: false };
        const diffMs = Date.now() - dt.getTime();
        const minutos = Math.max(0, Math.floor(diffMs / 60000));
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);
        let texto;
        if (dias >= 1) texto = dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
        else if (horas >= 1) { const m = minutos % 60; texto = m ? `${String(horas).padStart(2, '0')}h ${String(m).padStart(2, '0')}min` : `${horas}h`; }
        else texto = minutos <= 1 ? 'agora' : `há ${minutos}min`;
        return { texto, minutos, dias, critico: dias >= 3 };
    } catch { return { texto: '-', minutos: 0, dias: 0, critico: false }; }
}

function TempoAberto({ dataAbertura, destaque = true }) {
    const info = tempoAbertoInfo(dataAbertura);
    return (
        <span title={dataAbertura || ''} className={`inline-flex items-center gap-1.5 text-xs ${info.critico ? 'font-bold text-red-600 dark:text-red-400' : destaque ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
            <svg className="h-3.5 w-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {info.texto}
        </span>
    );
}

// ---------- Paginação compacta compartilhada ----------
function Paginacao({ pagina, total, aoMudar }) {
    if (!total || total <= 1) return null;
    const ir = (n) => { if (n >= 1 && n <= total && n !== pagina) aoMudar(n); };
    const nums = [];
    for (let n = 1; n <= total; n++) {
        if (total <= 7 || n === 1 || n === total || Math.abs(n - pagina) <= 1) nums.push(n);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return (
        <div className="mt-5 flex items-center justify-center gap-1">
            <button disabled={pagina === 1} onClick={() => ir(pagina - 1)} aria-label="Anterior" className="btn-page">‹</button>
            {nums.map((n, i) => n === '…' ? (
                <span key={`e${i}`} className="px-1 text-xs text-slate-400">…</span>
            ) : (
                <button key={n} onClick={() => ir(n)} className={`btn-page ${pagina === n ? 'btn-page-ativo' : ''}`}>{n}</button>
            ))}
            <button disabled={pagina === total} onClick={() => ir(pagina + 1)} aria-label="Próxima" className="btn-page">›</button>
        </div>
    );
}
