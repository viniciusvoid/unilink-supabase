// Componente PieChart minimalista — SVG puro, sem deps
function PieChart({ data, colors }) {
    const total = Object.values(data).reduce((a,b)=>a+b, 0) || 1;
    let acc = 0;
    const segments = Object.entries(data).map(([label, value], i) => {
        const start = acc;
        const portion = value / total;
        acc += portion;
        const end = acc;
        const large = portion > 0.5 ? 1 : 0;
        const a1 = 2 * Math.PI * start - Math.PI/2;
        const a2 = 2 * Math.PI * end - Math.PI/2;
        const x1 = 50 + 45 * Math.cos(a1), y1 = 50 + 45 * Math.sin(a1);
        const x2 = 50 + 45 * Math.cos(a2), y2 = 50 + 45 * Math.sin(a2);
        const color = colors[label] || colors[i % Object.keys(colors).length] || '#64748b';
        const d = portion === 1 ? `M 50 5 A 45 45 0 1 1 49.9 5 Z` : `M 50 50 L ${x1} ${y1} A 45 45 0 ${large} 1 ${x2} ${y2} Z`;
        return { label, value, d, color, percent: Math.round(portion*100) };
    });

    return (
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <svg viewBox="0 0 100 100" className="w-32 h-32 sm:w-36 sm:h-36 shrink-0">
                {segments.map(s => <path key={s.label} d={s.d} fill={s.color} stroke="white" strokeWidth="1" className="hover:opacity-90 transition" />)}
                <circle cx="50" cy="50" r="18" fill="white" className="dark:fill-slate-900" />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-slate-900 dark:fill-white text-[8px] font-bold">{total}</text>
            </svg>
            <div className="flex-1 w-full space-y-1.5">
                {segments.map(s => (
                    <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background: s.color}}></span>
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{s.label}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">{s.value} <span className="font-normal text-slate-500">({s.percent}%)</span></span>
                    </div>
                ))}
            </div>
        </div>
    );
}
