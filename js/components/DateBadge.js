// ==========================================================
// COMPONENTE: DateBadge — data + idade, destaque proporcional
// Mesma API ({ dataStr }). Crítico (>3 dias) ganha ênfase;
// demais casos são texto neutro com ponto sutil.
// ==========================================================
const DateBadge = ({ dataStr }) => {
    const dias = calcularDiasDecorridos(dataStr);
    const critico = dias > 3;
    const dot = dias > 90 ? 'bg-red-500' : dias > 60 ? 'bg-orange-500' : dias > 30 ? 'bg-amber-500' : critico ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600';
    const label = dias > 90 ? `há ${dias} dias` : dias > 60 ? `há ${dias} dias` : dias > 30 ? `há ${dias} dias` : dias >= 1 ? (dias === 1 ? 'há 1 dia' : `há ${dias} dias`) : 'hoje';
    return (
        <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap" title={`${formatarApenasData(dataStr)} • ${label}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`}></span>
            <span className={critico ? 'font-bold text-red-600 dark:text-red-400' : 'font-medium text-slate-500 dark:text-slate-400'}>{formatarApenasData(dataStr)}</span>
        </span>
    );
};
