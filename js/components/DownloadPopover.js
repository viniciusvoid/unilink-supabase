// Componente reutilizável de exportação — mesma aparência em todas as telas
// Props: dados (array filtrado), unidadeFiltro, statusFiltro, dataFiltro, busca, onExportExcel, onExportXML, onExportPDF
function DownloadPopover({ dados, unidadeFiltro, statusFiltro, dataFiltro, busca, prefixoFilial = true }) {
    const [aberto, setAberto] = React.useState(false);
    const [filial, setFilial] = React.useState(unidadeFiltro || 'TODOS');
    const [formato, setFormato] = React.useState('excel');
    const ref = React.useRef(null);
    React.useEffect(()=>{ setFilial(unidadeFiltro || 'TODOS'); }, [unidadeFiltro]);
    React.useEffect(() => {
        const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
        const esc = (e) => { if (e.key === 'Escape') setAberto(false); };
        document.addEventListener('mousedown', fechar);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', fechar); document.removeEventListener('keydown', esc); };
    }, []);

    const getLista = () => {
        let base = dados;
        if (prefixoFilial && filial !== 'TODOS') base = base.filter(c => (c.unidade||'MATRIZ')===filial);
        if (statusFiltro && statusFiltro!=='TODOS') base = base.filter(c => (c.status||'FECHADO')===statusFiltro);
        if (dataFiltro && dataFiltro!=='TODOS') {
            try { base = filtrarChamadosPorData(base, dataFiltro); } catch {}
        }
        if (busca) base = base.filter(c => c.equipamento && c.equipamento.toLowerCase().includes(busca.toLowerCase()));
        return base;
    };

    const handleBaixar = () => {
        const lista = getLista();
        if (lista.length===0) { window.notifyWarning && window.notifyWarning('Nenhum dado para exportar com os filtros atuais'); return; }
        if (formato==='excel') exportarParaExcel(lista, filial);
        else if (formato==='xml') exportarParaXML(lista, filial);
        else imprimirRelatorioLista(lista, 'Relatório de Chamados', filial);
        setAberto(false);
    };

    return (
        <div className="relative" ref={ref}>
            <button onClick={()=>setAberto(v=>!v)} aria-expanded={aberto} className="btn-ghost">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-3.5-3.5M12 15l3.5-3.5M4 19h16"/></svg>
                Exportar
                <svg className={`w-3 h-3 opacity-60 transition ${aberto?'rotate-180':''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            {aberto && (
                <div className="fade-in absolute right-0 z-30 mt-2 w-64 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-xl">
                    {prefixoFilial && (
                        <div className="mb-3">
                            <p className="u-eyebrow mb-1.5">Unidade</p>
                            <div className="grid grid-cols-3 gap-1">
                                {['TODOS','MATRIZ','PECÉM'].map(u=>(
                                    <button key={u} onClick={()=>setFilial(u)} className={`rounded-lg py-1.5 text-xs font-semibold transition ${filial===u?'bg-[#0E3263] text-white dark:bg-white dark:text-slate-900':'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}>{u==='TODOS'?'Todas':u}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <p className="u-eyebrow mb-1.5">Formato</p>
                    <div className="grid grid-cols-3 gap-1 mb-3">
                        {[
                            {k:'excel', l:'Excel'},
                            {k:'xml', l:'XML'},
                            {k:'pdf', l:'PDF'}
                        ].map(f=>(
                            <button key={f.k} onClick={()=>setFormato(f.k)} className={`rounded-lg py-1.5 text-xs font-semibold transition ${formato===f.k?'bg-slate-900 text-white dark:bg-white dark:text-slate-900':'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}>{f.l}</button>
                        ))}
                    </div>
                    <button onClick={handleBaixar} className="btn-primary w-full !py-2.5">Baixar {formato.toUpperCase()}</button>
                    <p className="mt-2 text-center text-[11px] text-slate-400">{getLista().length} registros • respeita os filtros</p>
                </div>
            )}
        </div>
    );
}
