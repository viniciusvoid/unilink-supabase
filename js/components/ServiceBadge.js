// ==========================================================
// COMPONENTE: ServiceBadge — pílula neutra com ponto por serviço
// Mesma API ({ servico, selected, onClick, className }).
// Leitura: múltiplos serviços separados por vírgula.
// Seleção (formulário): borda/cheia brand, sem arco-íris.
// ==========================================================
const SERVICE_DOT = {
    'PINTURA': 'bg-sky-500',
    'ELETRICA': 'bg-amber-500',
    'ELÉTRICA': 'bg-amber-500',
    'SOLDA': 'bg-orange-500',
    'MECANICA': 'bg-emerald-500',
    'MECÂNICA': 'bg-emerald-500',
    'BORRACHARIA': 'bg-slate-400',
    'TRANSLADO': 'bg-indigo-500'
};

const ServiceBadge = ({ servico, selected, onClick, className = "" }) => {
    const renderBadgeIndividual = (nomeServico) => {
        const srvClean = nomeServico.trim().toUpperCase();
        const dot = SERVICE_DOT[srvClean] || 'bg-slate-400';
        const base = selected
            ? 'bg-[#0E3263] text-white border-[#0E3263] dark:bg-white dark:text-slate-900 dark:border-white'
            : 'bg-slate-100 text-slate-600 border-transparent dark:bg-white/5 dark:text-slate-300';
        const inner = (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none whitespace-nowrap transition ${base}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-white dark:bg-slate-900' : dot}`}></span>
                {srvClean}
            </span>
        );
        return <span key={srvClean} className="inline-flex">{inner}</span>;
    };

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                aria-pressed={!!selected}
                className={`rounded-full transition active:scale-[0.97] ${selected ? '' : 'hover:bg-slate-200/60 dark:hover:bg-white/10'}`}
            >
                {renderBadgeIndividual(servico)}
            </button>
        );
    }

    if (!servico) return null;
    const listaServicos = String(servico).split(',').map(s => s.trim()).filter(Boolean);

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            {listaServicos.map(srv => renderBadgeIndividual(srv))}
        </div>
    );
};
