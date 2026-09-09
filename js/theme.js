// ==========================================================
// UNILINK — Design System corporativo
// Fala pouco, mostra muito: tabelas, listas, divisores.
// Badges só para status e prioridade. Azul com parcimônia.
// ==========================================================

const BRAND = '#0E3263';

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
    ABERTO: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
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
        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap ${STATUS_STYLE[s] || STATUS_STYLE.ABERTO}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
            {label}
        </span>
    );
}

// ---------- Protocolo (identificador técnico) ----------
function ProtocoloTag({ codigo, copiar = true }) {
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
        <span className="inline-flex items-center gap-1 font-mono text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">
            #{String(codigo).replace(/^#/, '')}
            {copiar && (
                <button onClick={copiarFn} title="Copiar protocolo" aria-label="Copiar protocolo" className="icon-btn !min-w-0 !p-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </button>
            )}
        </span>
    );
}

// ---------- Indicador de atualização (estático, discreto) ----------
function LiveDot({ label = 'Atualizado agora' }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {label}
        </span>
    );
}

// ---------- Cabeçalho de página ----------
function PageHeader({ title, meta, actions }) {
    return (
        <div className="mb-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 items-baseline gap-3">
                    <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
                    {meta && <span className="text-xs text-slate-500 dark:text-slate-400">{meta}</span>}
                </div>
                {actions && <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>}
            </div>
        </div>
    );
}

// ---------- Título de seção ----------
function SectionTitle({ children, action }) {
    return (
        <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">{children}</h2>
            {action}
        </div>
    );
}

// ---------- Estado vazio ----------
function EmptyState({ title = 'Nenhum resultado.', action = null }) {
    return (
        <div className="px-6 py-10 text-center">
            <p className="text-sm text-slate-700 dark:text-slate-300">{title}</p>
            {action && <div className="mt-3">{action}</div>}
        </div>
    );
}

// ---------- Skeleton ----------
function SkeletonRows({ linhas = 4 }) {
    return (
        <div className="divide-y u-divider border-y u-divider" aria-hidden="true">
            {Array.from({ length: linhas }, (_, i) => (
                <div key={i} className="py-3"><div className="u-skeleton h-4 rounded" style={{ width: `${92 - i * 7}%` }}></div></div>
            ))}
        </div>
    );
}

// ---------- Timeline simples: hora + evento, linha vertical ----------
function horaCurta(dataStr) {
    if (!dataStr) return '';
    const m = String(dataStr).match(/(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
}

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

function TimelineView({ eventos = [] }) {
    if (!eventos || eventos.length === 0) {
        return <p className="py-2 text-xs text-slate-500 dark:text-slate-400">Sem atividade registrada.</p>;
    }
    return (
        <ol className="ml-1 space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
            {eventos.map((ev, idx) => (
                <li key={ev.id || idx} className="min-w-0">
                    <div className="flex items-baseline gap-2">
                        <span className="w-9 shrink-0 font-mono text-xs text-slate-400 dark:text-slate-500" title={ev.criadoEm || ''}>{horaCurta(ev.criadoEm)}</span>
                        <p className="truncate text-sm text-slate-700 dark:text-slate-200">{EVENTO_LABEL[ev.tipoEvento] || ev.tipoEvento}</p>
                    </div>
                    {ev.descricao && <p className="mt-0.5 break-words pl-11 text-xs text-slate-500 dark:text-slate-400">{ev.descricao}</p>}
                </li>
            ))}
        </ol>
    );
}

// ---------- Galeria simples ----------
function EvidenceGallery({ fotos = [], onExpand }) {
    const [ampliada, setAmpliada] = React.useState(null);
    const abrir = (url) => { if (onExpand) onExpand(url); else setAmpliada(url); };
    if (fotos.length === 0) {
        return <p className="py-1 text-xs text-slate-500 dark:text-slate-400">Sem evidências.</p>;
    }
    return (
        <React.Fragment>
            {(!onExpand && ampliada) && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 fade-in" onClick={() => setAmpliada(null)}>
                    <img src={ampliada} alt="Evidência ampliada" className="max-h-full max-w-full rounded-lg" onClick={(e) => e.stopPropagation()} />
                    <button onClick={() => setAmpliada(null)} aria-label="Fechar" className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20">✕</button>
                </div>
            )}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {fotos.map((f, i) => {
                    const url = typeof f === 'string' ? f : f.url;
                    const nome = (f && f.nomeArquivo) || `Evidência ${i + 1}`;
                    return (
                        <button key={(f && f.id) || i} onClick={() => abrir(url)} title={nome} className="aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                            <img src={url} alt={nome} loading="lazy" className="h-full w-full object-cover hover:opacity-85" />
                        </button>
                    );
                })}
            </div>
        </React.Fragment>
    );
}

// ---------- Tempo em aberto ----------
function tempoAbertoInfo(dataAberturaStr) {
    try {
        const dt = (typeof parseDataBR === 'function') ? parseDataBR(dataAberturaStr) : null;
        if (!dt) return { texto: '-', minutos: 0, dias: 0, critico: false };
        const diffMs = Date.now() - dt.getTime();
        const minutos = Math.max(0, Math.floor(diffMs / 60000));
        const horas = Math.floor(minutos / 60);
        const dias = Math.floor(horas / 24);
        let texto;
        if (dias >= 1) texto = dias === 1 ? '1 dia' : `${dias} dias`;
        else if (horas >= 1) { const m = minutos % 60; texto = m ? `${horas}h ${String(m).padStart(2, '0')}` : `${horas}h`; }
        else texto = minutos <= 1 ? 'agora' : `${minutos} min`;
        return { texto, minutos, dias, critico: dias >= 3 };
    } catch { return { texto: '-', minutos: 0, dias: 0, critico: false }; }
}

function TempoAberto({ dataAbertura }) {
    const info = tempoAbertoInfo(dataAbertura);
    return (
        <span title={dataAbertura || ''} className={`text-xs tabular-nums ${info.critico ? 'font-medium text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {info.texto}
        </span>
    );
}

// ---------- Paginação ----------
function Paginacao({ pagina, total, aoMudar }) {
    if (!total || total <= 1) return null;
    const ir = (n) => { if (n >= 1 && n <= total && n !== pagina) aoMudar(n); };
    const nums = [];
    for (let n = 1; n <= total; n++) {
        if (total <= 7 || n === 1 || n === total || Math.abs(n - pagina) <= 1) nums.push(n);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return (
        <div className="mt-4 flex items-center justify-center gap-1">
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
