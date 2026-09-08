// Componente reutilizável para download minimalista — mesma aparência em todas as telas
// Props: dados (array filtrado), unidadeFiltro, statusFiltro, dataFiltro, busca, onExportExcel, onExportXML, onExportPDF
function DownloadPopover({ dados, unidadeFiltro, statusFiltro, dataFiltro, busca, prefixoFilial = true }) {
    const [aberto, setAberto] = React.useState(false);
    const [filial, setFilial] = React.useState(unidadeFiltro || 'TODOS');
    const [formato, setFormato] = React.useState('excel');
    React.useEffect(()=>{ setFilial(unidadeFiltro || 'TODOS'); }, [unidadeFiltro]);

    const getLista = () => {
        let base = dados;
        // filtra por filial se prefixoFilial
        if (prefixoFilial && filial !== 'TODOS') base = base.filter(c => (c.unidade||'MATRIZ')===filial);
        // filtra por status se disponível
        if (statusFiltro && statusFiltro!=='TODOS') base = base.filter(c => (c.status||'FECHADO')===statusFiltro);
        // filtra por data se disponível
        if (dataFiltro && dataFiltro!=='TODOS') {
            try { base = filtrarChamadosPorData(base, dataFiltro); } catch {}
        }
        // filtra por busca
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
        window.notifySuccess && window.notifySuccess(`${formato.toUpperCase()} com ${lista.length} registros baixado`);
    };

    return (
        <div className="relative">
            <button onClick={()=>setAberto(v=>!v)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Baixar
                <svg className={`w-3 h-3 transition ${aberto?'rotate-180':''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </button>
            {aberto && (
                <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 mt-2 w-auto sm:w-72 max-w-[380px] mx-auto sm:mx-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-30">
                    {prefixoFilial && (
                        <>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Filial</p>
                            <div className="grid grid-cols-3 gap-1.5 mb-3">
                                {['TODOS','MATRIZ','PECÉM'].map(u=>(
                                    <button key={u} onClick={()=>setFilial(u)} className={`py-1.5 rounded-lg text-xs font-bold ${filial===u?'bg-slate-900 dark:bg-white text-white dark:text-slate-900':'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{u==='TODOS'?'Todos':u}</button>
                                ))}
                            </div>
                        </>
                    )}
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Formato</p>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {[
                            {k:'excel', l:'Excel'},
                            {k:'xml', l:'XML'},
                            {k:'pdf', l:'PDF'}
                        ].map(f=>(
                            <button key={f.k} onClick={()=>setFormato(f.k)} className={`py-1.5 rounded-lg text-xs font-bold ${formato===f.k?'bg-emerald-600 text-white':'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{f.l}</button>
                        ))}
                    </div>
                    <button onClick={handleBaixar} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2 rounded-lg text-xs">Baixar {formato.toUpperCase()} {filial!=='TODOS'?`• ${filial}`:''}</button>
                    <p className="text-[11px] text-slate-500 text-center mt-1.5">{getLista().length} registros • respeita filtros de status/data/busca</p>
                </div>
            )}
        </div>
    );
}
