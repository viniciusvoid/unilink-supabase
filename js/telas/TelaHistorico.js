// ==========================================================
// TELA: Histórico — layout limpo, responsivo
// ==========================================================
function TelaHistorico({ chamados, voltar }) {
    const [busca, setBusca] = React.useState('');
    const [unidadeFiltro, setUnidadeFiltro] = React.useState('TODOS');
    const [statusFiltro, setStatusFiltro] = React.useState('TODOS');
    const [dataFiltro, setDataFiltro] = React.useState('TODOS');
    const [paginaAtual, setPaginaAtual] = React.useState(1);
    const [mostrarBaixar, setMostrarBaixar] = React.useState(false);
    const [baixarUnidade, setBaixarUnidade] = React.useState('TODOS');
    const [baixarFormato, setBaixarFormato] = React.useState('excel');
    const [detalhes, setDetalhes] = React.useState(null);
    const itensPorPagina = 6;
    const encerrados = chamados.filter(c => c.concluido);
    const parciais = chamados.filter(c => c.status === 'AGUARDANDO_USUARIO');
    const baseHistorico = statusFiltro === 'AGUARDANDO_USUARIO' ? parciais : statusFiltro === 'TODOS' ? [...encerrados, ...parciais] : encerrados;
    React.useEffect(()=>{setPaginaAtual(1);},[busca, unidadeFiltro, statusFiltro, dataFiltro]);
    let listaExibicao = baseHistorico.filter(c=>{
        const atendeEquipamento = c.equipamento && c.equipamento.toLowerCase().includes(busca.toLowerCase());
        const unidadeDoChamado = c.unidade || 'MATRIZ';
        const atendeUnidade = unidadeFiltro==='TODOS' || unidadeDoChamado===unidadeFiltro;
        const atendeStatus = statusFiltro==='TODOS' || (c.status||'FECHADO')===statusFiltro;
        return atendeEquipamento && atendeUnidade && atendeStatus;
    });
    if (dataFiltro !== 'TODOS') listaExibicao = filtrarChamadosPorData(listaExibicao, dataFiltro);
    listaExibicao.sort((a,b)=>(b.id||0)-(a.id||0));
    const totalPaginas = Math.ceil(listaExibicao.length/itensPorPagina);
    const listaExibicaoPaginada = listaExibicao.slice((paginaAtual-1)*itensPorPagina, paginaAtual*itensPorPagina);
    const handleImprimirOS = (c)=>imprimirOrdemServico(c);
    const handleImprimirHistoricoCompleto = ()=>imprimirRelatorioLista(listaExibicao, 'Relatório de Histórico de Chamados', unidadeFiltro);

    return (
        <div className="w-full flex justify-center fade-in">
            <div className="w-full max-w-7xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 dark:border-slate-800 overflow-hidden">
                <div className="h-1 bg-emerald-600 dark:bg-emerald-700 w-full"></div>
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Histórico</h2>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{statusFiltro === 'AGUARDANDO_USUARIO' ? `${parciais.length} parciais` : statusFiltro === 'TODOS' ? `${encerrados.length + parciais.length} concluídos/parciais` : `${encerrados.length} concluídos`} • {listaExibicao.length} filtrados</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative">
                                <button onClick={()=>setMostrarBaixar(v=>!v)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                    Baixar
                                    <svg className={`w-3 h-3 transition ${mostrarBaixar?'rotate-180':''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                                </button>
                                {mostrarBaixar && (
                                    <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mt-2 w-[92vw] sm:w-72 max-w-[320px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-20">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Filial</p>
                                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                                            {['TODOS','MATRIZ','PECÉM'].map(u=>(
                                                <button key={u} onClick={()=>setBaixarUnidade(u)} className={`py-1.5 rounded-lg text-xs font-bold ${baixarUnidade===u?'bg-slate-900 dark:bg-white text-white dark:text-slate-900':'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{u==='TODOS'?'Todos':u}</button>
                                            ))}
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">Formato</p>
                                        <div className="grid grid-cols-3 gap-1.5 mb-3">
                                            {[
                                                {k:'excel', l:'Excel'},
                                                {k:'xml', l:'XML'},
                                                {k:'pdf', l:'PDF'}
                                            ].map(f=>(
                                                <button key={f.k} onClick={()=>setBaixarFormato(f.k)} className={`py-1.5 rounded-lg text-xs font-bold ${baixarFormato===f.k?'bg-emerald-600 text-white':'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>{f.l}</button>
                                            ))}
                                        </div>
                                        <button onClick={()=>{
                                            const d = statusFiltro==='AGUARDANDO_USUARIO' ? parciais.filter(c=>baixarUnidade==='TODOS'||(c.unidade||'MATRIZ')===baixarUnidade) : encerrados.filter(c=>baixarUnidade==='TODOS'||(c.unidade||'MATRIZ')===baixarUnidade);
                                            const lista = dataFiltro!=='TODOS' ? filtrarChamadosPorData(d, dataFiltro).filter(c=>!busca || c.equipamento.toLowerCase().includes(busca.toLowerCase())) : d.filter(c=>!busca || c.equipamento.toLowerCase().includes(busca.toLowerCase()));
                                            if (baixarFormato==='excel') exportarParaExcel(lista, baixarUnidade);
                                            else if (baixarFormato==='xml') exportarParaXML(lista, baixarUnidade);
                                            else imprimirRelatorioLista(lista, 'Relatório de Histórico de Chamados', baixarUnidade);
                                            setMostrarBaixar(false);
                                        }} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-2 rounded-lg text-xs">Baixar {baixarFormato.toUpperCase()} {baixarUnidade==='TODOS'?'':`• ${baixarUnidade}`}</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={voltar} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-3 py-2 rounded-lg text-xs inline-flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg> Menu</button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mb-4">
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-[110px]">
                                <span className="text-[11px] font-bold text-slate-500 uppercase hidden sm:inline">Filial</span>
                                <select value={unidadeFiltro} onChange={e=>setUnidadeFiltro(e.target.value)} className="flex-1 min-w-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <option value="TODOS">Todas filiais</option>
                                    <option value="MATRIZ">Matriz</option>
                                    <option value="PECÉM">Pecém</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5 flex-1 min-w-[110px]">
                                <span className="text-[11px] font-bold text-slate-500 uppercase hidden sm:inline">Status</span>
                                <select value={statusFiltro} onChange={e=>setStatusFiltro(e.target.value)} className="flex-1 min-w-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <option value="TODOS">Todos status</option>
                                    <option value="FECHADO">Fechado</option>
                                    <option value="RESOLVIDO">Resolvido</option>
                                    <option value="AGUARDANDO_USUARIO">Parcial</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5 flex-1 min-w-[130px]">
                                <span className="text-[11px] font-bold text-slate-500 uppercase hidden sm:inline">Período</span>
                                <select value={dataFiltro} onChange={e=>setDataFiltro(e.target.value)} className="flex-1 min-w-0 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                                    <option value="TODOS">Todo período</option>
                                    <option value="HOJE">Hoje</option>
                                    <option value="7d">Últimos 7 dias</option>
                                    <option value="30d">Últimos 30 dias</option>
                                    <option value="MES_ATUAL">Mês atual</option>
                                    <option value="CALENDARIO">Calendário...</option>
                                </select>
                            </div>
                            {(statusFiltro!=='TODOS'||dataFiltro!=='TODOS'||unidadeFiltro!=='TODOS'|| busca) && (
                                <button onClick={()=>{setStatusFiltro('TODOS');setDataFiltro('TODOS');setUnidadeFiltro('TODOS');setBusca('');}} className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 underline px-2">Limpar</button>
                            )}
                        </div>
                        {dataFiltro==='CALENDARIO' && (
                            <div className="flex gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5">
                                <input type="date" onChange={e=>{
                                    const d = e.target.value ? new Date(e.target.value) : null;
                                    if (d) { d.setHours(0,0,0,0); setDataFiltro('CALENDARIO'); // usa filtrarChamadosPorIntervalo com d
                                    }
                                }} className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs" />
                                <span className="text-xs text-slate-500 self-center">até</span>
                                <input type="date" onChange={e=>{
                                    const d2 = e.target.value ? new Date(e.target.value) : null;
                                    if (d2) { d2.setHours(23,59,59,999); }
                                }} className="flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs" />
                            </div>
                        )}
                    </div>

                    <input type="text" placeholder="Pesquisar por equipamento..." className="w-full border border-slate-200 dark:border-slate-700 p-3 sm:p-2.5 rounded-lg mb-4 text-base sm:text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-500 min-h-[44px]" value={busca} onChange={(e)=>setBusca(e.target.value.toUpperCase())}/>

                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {listaExibicaoPaginada.map(c=>(
                            <div key={c.idFirebase} onClick={()=>setDetalhes(c)} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition active:scale-[0.98]">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md">{c.unidade||'MATRIZ'}</span>
                                    <PriorityBadge prioridade={c.prioridade}/>
                                </div>
                                <h3 className="font-semibold text-slate-900 dark:text-white text-base sm:text-sm">{c.equipamento}</h3>
                                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mb-2">{c.protocolo}</p>
                                <div className="mb-3"><ServiceBadge servico={c.servico}/></div>
                                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-700 dark:text-slate-300 dark:text-slate-300 space-y-1 mb-3">
                                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Abertura:</span> {formatarApenasData(c.dataAbertura)}</p>
                                    <p className="text-emerald-700"><span className="font-semibold">Encerrado:</span> {formatarApenasData(c.dataEncerramento)}</p>
                                    <p><span className="font-semibold text-slate-700 dark:text-slate-300">Feito:</span> {c.servicoFeito||'-'}</p>
                                </div>
                                <button onClick={(e)=>{e.stopPropagation(); handleImprimirOS(c)}} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.56-4.171L18 18M12 12a3 3 0 100-6 3 3 0 000 6z"/></svg> Imprimir OS</button>
                            </div>
                        ))}
                        {listaExibicaoPaginada.length===0 && <div className="p-6 text-center text-base sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">Nenhum chamado concluído.</div>}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="min-w-full text-base sm:text-sm">
                            <thead>
                                <tr className="bg-slate-900 dark:bg-slate-800 text-slate-100 text-xs uppercase">
                                    <th className="p-3 text-center font-semibold">Unidade</th>
                                    <th className="p-3 text-center font-semibold">Prioridade</th>
                                    <th className="p-3 text-center font-semibold">Abertura</th>
                                    <th className="p-3 font-semibold">Equipamento</th>
                                    <th className="p-3 text-center font-semibold">Serviço</th>
                                    <th className="p-3 font-semibold">Descrição</th>
                                    <th className="p-3 font-semibold">Feito</th>
                                    <th className="p-3 text-center font-semibold">Encerramento</th>
                                    <th className="p-3 text-center font-semibold">OS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listaExibicaoPaginada.map((c,i)=>(
                                    <tr key={c.idFirebase} onClick={()=>setDetalhes(c)} className={`cursor-pointer ${i%2===0?'bg-white dark:bg-slate-800':'bg-slate-50 dark:bg-slate-700'} hover:bg-slate-50 dark:hover:bg-slate-700`}>
                                        <td className="p-3 text-center"><span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300">{c.unidade||'MATRIZ'}</span></td>
                                        <td className="p-3 text-center"><PriorityBadge prioridade={c.prioridade}/></td>
                                        <td className="p-3 text-center text-xs text-slate-600 dark:text-slate-300">{formatarApenasData(c.dataAbertura)}</td>
                                        <td className="p-3 font-medium text-slate-900">{c.equipamento}<div className="text-[11px] font-mono text-slate-600 dark:text-slate-300">{c.protocolo}</div></td>
                                        <td className="p-3 text-center"><ServiceBadge servico={c.servico}/></td>
                                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{c.descricao}</td>
                                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{c.servicoFeito||'-'}</td>
                                        <td className="p-3 text-center text-xs font-medium text-emerald-700">{formatarApenasData(c.dataEncerramento)}</td>
                                        <td className="p-3 text-center"><button onClick={(e)=>{e.stopPropagation(); handleImprimirOS(c)}} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700"><svg className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.56-4.171L18 18M12 12a3 3 0 100-6 3 3 0 000 6z"/></svg></button></td>
                                    </tr>
                                ))}
                                {listaExibicaoPaginada.length===0 && <tr><td colSpan="9" className="p-8 text-center text-slate-700 dark:text-slate-300">Nenhum chamado concluído.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {detalhes && <ModalDetalhes chamado={detalhes} aoFechar={()=>setDetalhes(null)} aoImprimir={handleImprimirOS} />}
                    {totalPaginas>1 && (
                        <div className="flex justify-center items-center gap-1.5 mt-5">
                            <button disabled={paginaAtual===1} onClick={()=>setPaginaAtual(paginaAtual-1)} className="w-8 h-8 border rounded-lg bg-white disabled:opacity-40 text-base sm:text-sm">‹</button>
                            {Array.from({length: totalPaginas},(_,i)=>i+1).map(n=>(
                                <button key={n} onClick={()=>setPaginaAtual(n)} className={`w-8 h-8 rounded-lg text-base sm:text-sm font-medium ${paginaAtual===n?'bg-emerald-600 text-white':'bg-white border text-slate-600 dark:text-slate-300'}`}>{n}</button>
                            ))}
                            <button disabled={paginaAtual===totalPaginas} onClick={()=>setPaginaAtual(paginaAtual+1)} className="w-8 h-8 border rounded-lg bg-white disabled:opacity-40 text-base sm:text-sm">›</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
