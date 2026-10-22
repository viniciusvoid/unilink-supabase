// TELA: Gerenciamento de Usuários — painel administrativo completo
function TelaGerenciarUsuarios({ onVoltar }) {
    const [usuarios, setUsuarios] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [busca, setBusca] = React.useState('');
    const [filtroPapel, setFiltroPapel] = React.useState('TODOS');
    const [filtroStatus, setFiltroStatus] = React.useState('TODOS');
    const [ordenarPor, setOrdenarPor] = React.useState('criadoEm_desc');
    const [pagina, setPagina] = React.useState(1);
    const [detalhe, setDetalhe] = React.useState(null);
    const [auditoria, setAuditoria] = React.useState([]);
    const [carregandoAud, setCarregandoAud] = React.useState(false);
    const [aba, setAba] = React.useState('usuarios'); // usuarios | auditoria
    const ITEMS = 15;

    const carregar = async () => {
        setCarregando(true);
        try {
            const res = await ApiClient.get('/admin/usuarios');
            setUsuarios(res.usuarios || []);
        } catch (e) {
            window.notifyError && window.notifyError(e.message || 'Erro ao carregar usuários.');
        } finally { setCarregando(false); }
    };
    React.useEffect(() => { carregar(); }, []);

    const carregarAuditoria = async () => {
        setCarregandoAud(true);
        try {
            const res = await ApiClient.get('/admin/audit-logs?page=1&limit=100');
            setAuditoria(res.logs || []);
        } catch (e) {
            window.notifyError && window.notifyError(e.message || 'Erro ao carregar auditoria.');
        } finally { setCarregandoAud(false); }
    };
    React.useEffect(() => { if (aba === 'auditoria') carregarAuditoria(); }, [aba]);

    const chipPapel = (p) => {
        const cor = p === 'administrador' ? 'bg-[#0E3263]/10 text-[#0E3263] dark:bg-sky-400/10 dark:text-sky-300'
            : p === 'supervisor' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
        return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${cor}`}>{p}</span>;
    };
    const chipStatus = (u) => {
        if (u.bloqueado) return <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Bloqueado</span>;
        if (!u.ativo) return <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inativo</span>;
        return <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Ativo</span>;
    };

    const q = busca.trim().toLowerCase();
    const filtrados = usuarios.filter((u) => {
        if (filtroPapel !== 'TODOS' && u.papel !== filtroPapel) return false;
        if (filtroStatus === 'ATIVO' && (!u.ativo || u.bloqueado)) return false;
        if (filtroStatus === 'INATIVO' && u.ativo) return false;
        if (filtroStatus === 'BLOQUEADO' && !u.bloqueado) return false;
        if (q && !((u.usuario || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))) return false;
        return true;
    }).sort((a, b) => {
        if (ordenarPor === 'nome_asc') return (a.usuario || '').localeCompare(b.usuario || '');
        if (ordenarPor === 'nome_desc') return (b.usuario || '').localeCompare(a.usuario || '');
        if (ordenarPor === 'criadoEm_asc') return new Date(a.criadoEm) - new Date(b.criadoEm);
        return new Date(b.criadoEm) - new Date(a.criadoEm);
    });

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS));
    const paginaAtual = Math.min(pagina, totalPaginas);
    const inicio = (paginaAtual - 1) * ITEMS;
    const visiveis = filtrados.slice(inicio, inicio + ITEMS);

    // indicadores
    const total = usuarios.length;
    const ativos = usuarios.filter((u) => u.ativo && !u.bloqueado).length;
    const suspensos = usuarios.filter((u) => !u.ativo).length;
    const bloqueados = usuarios.filter((u) => u.bloqueado).length;
    const admins = usuarios.filter((u) => u.papel === 'administrador' && u.ativo).length;
    const inconsistencias = usuarios.filter((u) => !u.email || !u.papel).length;

    const acaoPapel = async (u, novoPapel) => {
        try {
            await ApiClient.patch(`/admin/usuarios/${u.id}/role`, { papel: novoPapel });
            window.notifySuccess && window.notifySuccess(`Papel de "${u.usuario}" alterado para ${novoPapel}.`);
            carregar();
        } catch (e) { window.notifyError && window.notifyError(e.message || 'Erro ao alterar papel.'); }
    };
    const acaoStatus = async (u, ativo) => {
        try {
            await ApiClient.patch(`/admin/usuarios/${u.id}/status`, { ativo });
            window.notifySuccess && window.notifySuccess(`Usuário "${u.usuario}" ${ativo ? 'reativado' : 'suspenso'}.`);
            carregar();
        } catch (e) { window.notifyError && window.notifyError(e.message || 'Erro ao alterar situação.'); }
    };

    if (detalhe) {
        return (
            <div className="w-full">
                <PageHeader title="Detalhes do usuário" meta={detalhe.usuario} actions={<button onClick={() => setDetalhe(null)} className="btn-ghost">Voltar</button>} />
                <div className="u-surface p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-slate-500">Usuário</p><p className="font-medium">{detalhe.usuario}</p></div>
                        <div><p className="text-xs text-slate-500">E-mail</p><p className="font-medium">{detalhe.email}</p></div>
                        <div><p className="text-xs text-slate-500">Papel</p><p className="font-medium">{detalhe.papel}</p></div>
                        <div><p className="text-xs text-slate-500">Situação</p><p className="font-medium">{detalhe.ativo ? 'Ativo' : 'Inativo'}{detalhe.bloqueado ? ' (bloqueado)' : ''}</p></div>
                        <div><p className="text-xs text-slate-500">Criado em</p><p className="font-medium">{detalhe.criadoEm ? new Date(detalhe.criadoEm).toLocaleString('pt-BR') : '-'}</p></div>
                        <div><p className="text-xs text-slate-500">Último acesso</p><p className="font-medium">{detalhe.ultimoAcessoEm ? new Date(detalhe.ultimoAcessoEm).toLocaleString('pt-BR') : 'Nunca'}</p></div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        <button onClick={() => acaoStatus(detalhe, !detalhe.ativo)} className={detalhe.ativo ? 'btn-danger' : 'btn-success'}>{detalhe.ativo ? 'Suspender' : 'Reativar'}</button>
                        <button onClick={() => setDetalhe(null)} className="btn-ghost">Fechar</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <PageHeader title="Gerenciamento de usuários" meta="administração de contas e permissões" />
            {/* indicadores */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
                {[
                    ['Total', total],
                    ['Ativos', ativos],
                    ['Suspensos', suspensos],
                    ['Bloqueados', bloqueados],
                    ['Admins ativos', admins],
                    ['Inconsistências', inconsistencias]
                ].map(([label, val]) => (
                    <div key={label} className="u-surface p-3 text-center">
                        <div className="text-xl font-semibold tabular-nums">{val}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
                    </div>
                ))}
            </div>

            {/* abas */}
            <div className="u-surface mb-3 flex gap-1 p-1">
                {[['usuarios', 'Usuários'], ['auditoria', 'Auditoria']].map(([v, l]) => (
                    <button key={v} onClick={() => setAba(v)} className={`rounded px-3 py-1.5 text-xs ${aba === v ? 'bg-[#0E3263] text-white' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
                ))}
            </div>

            {aba === 'usuarios' ? (
                <>
                    <div className="u-surface mb-3 flex flex-col gap-2 p-2 sm:flex-row">
                        <input type="text" placeholder="Pesquisar por nome ou e-mail…" className="u-input flex-1" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} />
                        <select value={filtroPapel} onChange={(e) => { setFiltroPapel(e.target.value); setPagina(1); }} className="u-input sm:max-w-[160px]">
                            <option value="TODOS">Cargo: todos</option>
                            <option value="atendente">Atendente</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="administrador">Administrador</option>
                        </select>
                        <select value={filtroStatus} onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1); }} className="u-input sm:max-w-[160px]">
                            <option value="TODOS">Situação: todas</option>
                            <option value="ATIVO">Ativos</option>
                            <option value="INATIVO">Inativos</option>
                            <option value="BLOQUEADO">Bloqueados</option>
                        </select>
                        <select value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value)} className="u-input sm:max-w-[180px]">
                            <option value="criadoEm_desc">Mais recentes</option>
                            <option value="criadoEm_asc">Mais antigos</option>
                            <option value="nome_asc">Nome A-Z</option>
                            <option value="nome_desc">Nome Z-A</option>
                        </select>
                    </div>

                    {carregando ? (
                        <div className="u-surface"><EmptyState numero="…" title="Carregando usuários." /></div>
                    ) : visiveis.length === 0 ? (
                        <div className="u-surface"><EmptyState numero="0" title="Nenhum usuário encontrado." /></div>
                    ) : (
                        <>
                            <div className="u-surface overflow-x-auto">
                                <table className="u-table u-table-pin">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>E-mail</th>
                                            <th>Papel</th>
                                            <th>Situação</th>
                                            <th>Cadastro</th>
                                            <th>Último acesso</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visiveis.map((u) => (
                                            <tr key={u.id}>
                                                <td className="font-medium">{u.usuario}</td>
                                                <td className="text-xs text-slate-500">{u.email}</td>
                                                <td>{chipPapel(u.papel)}</td>
                                                <td>{chipStatus(u)}</td>
                                                <td className="text-xs tabular-nums">{u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="text-xs tabular-nums">{u.ultimoAcessoEm ? new Date(u.ultimoAcessoEm).toLocaleDateString('pt-BR') : 'Nunca'}</td>
                                                <td>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => setDetalhe(u)} className="btn-ghost !min-h-[28px] !px-2 !py-0.5 !text-xs">Ver</button>
                                                        <select value={u.papel} onChange={(e) => acaoPapel(u, e.target.value)} className="u-input !h-7 !text-xs sm:max-w-[120px]">
                                                            <option value="atendente">Atendente</option>
                                                            <option value="supervisor">Supervisor</option>
                                                            <option value="administrador">Administrador</option>
                                                        </select>
                                                        <button onClick={() => acaoStatus(u, !u.ativo)} className={u.ativo ? 'btn-danger !min-h-[28px] !px-2 !py-0.5 !text-xs' : 'btn-success !min-h-[28px] !px-2 !py-0.5 !text-xs'}>
                                                            {u.ativo ? 'Suspender' : 'Reativar'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPaginas > 1 && (
                                <div className="mt-3 flex items-center justify-center gap-1">
                                    <button disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)} className="btn-page">‹</button>
                                    <span className="text-xs text-slate-500 px-2">{paginaAtual} / {totalPaginas}</span>
                                    <button disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)} className="btn-page">›</button>
                                </div>
                            )}
                        </>
                    )}
                </>
            ) : (
                carregandoAud ? (
                    <div className="u-surface"><EmptyState numero="…" title="Carregando auditoria." /></div>
                ) : auditoria.length === 0 ? (
                    <div className="u-surface"><EmptyState numero="0" title="Sem registros de auditoria." /></div>
                ) : (
                    <div className="u-surface overflow-x-auto">
                        <table className="u-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Ação</th>
                                    <th>Alvo</th>
                                    <th>Por</th>
                                    <th>Detalhe</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditoria.map((a) => (
                                    <tr key={a.id}>
                                        <td className="text-xs tabular-nums">{a.criado_em ? new Date(a.criado_em).toLocaleString('pt-BR') : '-'}</td>
                                        <td className="text-xs font-medium">{a.acao}</td>
                                        <td className="text-xs">{a.alvo_usuario_nome || '-'}</td>
                                        <td className="text-xs">{a.feito_por_nome || '-'}</td>
                                        <td className="text-xs text-slate-500">{a.detalhe || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
}
