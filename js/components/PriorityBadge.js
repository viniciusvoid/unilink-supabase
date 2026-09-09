// COMPONENTE: PriorityBadge — apenas ponto + rótulo
const PriorityBadge = ({ prioridade }) => {
    const mapa = {
        'Urgente': 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
        'Alta': 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
        'Média': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
        'Media': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
        'Baixa': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    };
    const ponto = {
        'Urgente': 'bg-red-500',
        'Alta': 'bg-orange-500',
        'Média': 'bg-amber-500',
        'Media': 'bg-amber-500',
        'Baixa': 'bg-slate-400'
    };
    const cls = mapa[prioridade] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    const dot = ponto[prioridade] || 'bg-slate-400';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap ${cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
            {prioridade || '-'}
        </span>
    );
};
