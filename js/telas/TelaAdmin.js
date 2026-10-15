// TELA: Administração — usuários e movimentos (só administrador; a API retorna 403 aos demais)
function TelaAdmin() {
    const [aba, setAba] = React.useState('usuarios'); // usuarios | movimentos
    const [usuarios, setUsuarios] = React.useState([]);
    const [carregando, setCarregando] = React.useState(true);
    const [semAcesso, setSemAcesso] = React.useState(false);
    const [novoUsuario, setNovoUsuario] = React.useState('');
    const [novoPapel, setNovoPapel] = React.useState('atendente');
    const [criando, setCriando] = React.useState(false);
    const [confirmExcluir, setConfirmExcluir] = React.useState(null);
    const [agindoId, setAgindoId] = React.useState(null);
    const [filtroMov, setFiltroMov] = React.useState('');
    const [movimentos, setMovimentos] = React.useState([]);
    const [carregandoMov, setCarregandoMov] = React.useState(false);

    const erroAdmin = (e) => {
        const msg = (e && e.message) || 'Falha na operação.';
        if (/restrito|administrador|\(403\)/i.test(msg)) { setSemAcesso(true); return 'Acesso restrito ao administrador.'; }
        return msg;
    };

    const carregarUsuarios = async () => {
        setCarregando(true); setSemAcesso(false);
        try {
            const res = await ApiClient.get('/admin/usuarios');
            setUsuarios(res.usuarios || []);
        } catch (e) {
            window.notifyError && window.notifyError(erroAdmin(e));
        } finally { setCarregando(false); }
    };
    React.useEffect(() => { carregarUsuarios(); }, []);

    const carregarMovimentos = async (usuarioId) => {
        setCarregandoMov(true);
        try {
            const uid = typeof usuarioId === 'string' ? usuarioId : filtroMov;
            const q = uid ? `?usuarioId=${encodeURIComponent(uid)}&limite=100` : '?limite=100';
            const res = await ApiClient.get(`/admin/movimentos${q}`);
            setMovimentos(res.movimentos || []);
        } catch (e) {
            window.notifyError && window.notifyError(erroAdmin(e));
        } finally { setCarregandoMov(false); }
    };
    React.useEffect(() => { if (aba === 'movimentos') carregarMovimentos(); }, [aba]);
    React.useEffect(() => { if (aba === 'movimentos' && usuarios.length) carregarMovimentos(); }, [filtroMov]);

    const handleCriar = async (e) => {
        e.preventDefault();
        const u = novoUsuario.trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,40}$/.test(u)) { window.notifyWarning && window.notifyWarning('Usuário inválido: 3–40 letras minúsculas, números, ponto, _ ou -.'); return; }
        setCriando(true);
        try {
            await ApiClient.post('/admin/usuarios', { usuario: u, papel: novoPapel });
            window.notifySuccess && window.notifySuccess(`Usuário "${u}" criado com a senha padrão.`);
            setNovoUsuario('');
            carregarUsuarios();
        } catch (err) { window.notifyError && window.notifyError(erroAdmin(err)); }
        finally { setCriando(false); }
    };

    const handleExcluir = async (id) => {
        setAgindoId(id);
        try {
            await ApiClient.del(`/admin/usuarios/${id}`);
            window.notifySuccess && window.notifySuccess('Usuário excluído.');
            setConfirmExcluir(null);
            carregarUsuarios();
        } catch (err) { window.notifyError && window.notifyError(erroAdmin(err)); }
        finally { setAgindoId(null); }
    };

    const handleReset = async (u) => {
        setAgindoId(u.id);
        try {
            await ApiClient.post(`/admin/usuarios/${u.id}/reset-senha`, {});
            window.notifySuccess && window.notifySuccess(`Senha de "${u.usuario}" redefinida para a padrão.`);
            carregarUsuarios();
        } catch (err) { window.notifyError && window.notifyError(erroAdmin(err)); }
        finally { setAgindoId(null); }
    };

    const chipPapel = (papel) => {
        const cor = papel === 'administrador'
            ? 'bg-[#0E3263]/10 text-[#0E3263] dark:bg-sky-400/10 dark:text-sky-300'
            : papel === 'supervisor'
                ? 'bg-[#B9770E]/10 text-[#B9770E]'
                : 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
        return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${cor}`}>{papel}</span>;
    };

    const textoMovimento = (m) => {
        if (m.origem === 'admin') return `${m.acao} → ${m.alvo_usuario_nome || '-'}${m.detalhe ? ` (${m.detalhe})` : ''}`;
        if (m.origem === 'status') return `status ${m.status_anterior || '—'} → ${m.status_novo}`;
        return `${m.tipo_evento}: ${m.descricao || ''}`;
    };
    const quemMovimento = (m) => m.usuario_nome || m.feito_por_nome || '—';

    if (semAcesso) {
        return (
            <div className="w-full">
                <PageHeader title="Administração" />
                <div className="u-surface"><EmptyState numero="!" title="Acesso restrito ao administrador." /></div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <PageHeader
                title="Administração"
                meta={`${usuarios.length} usuários`}
                actions={
                    <div className="grid shrink-0 grid-cols-2 gap-1 rounded-md bg-slate-200/60 p-1 dark:bg-slate-800" role="tablist" aria-label="Administração">
                        {[['usuarios', 'Usuários'], ['movimentos', 'Movimentos']].map(([v, l]) => (
                            <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)} className={`rounded px-2.5 py-1.5 text-xs transition ${aba === v ? 'bg-white font-medium text-slate-900 dark:bg-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                }
            />

            {aba === 'usuarios' ? (
                <React.Fragment>
                    <form onSubmit={handleCriar} className="u-surface mb-4 flex flex-col gap-2 p-2 sm:flex-row">
                        <input type="text" placeholder="Novo usuário (ex.: joao)" aria-label="Novo usuário" className="u-input flex-1" value={novoUsuario} onChange={(e) => setNovoUsuario(e.target.value)} />
                        <select value={novoPapel} onChange={(e) => setNovoPapel(e.target.value)} aria-label="Papel" className="u-input sm:max-w-[170px]">
                            <option value="atendente">Atendente</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="administrador">Administrador</option>
                        </select>
                        <button type="submit" disabled={criando} className="btn-primary shrink-0 disabled:opacity-60">{criando ? 'Criando…' : 'Criar'}</button>
                    </form>

                    {carregando ? (
                        <div className="u-surface"><EmptyState numero="…" title="Carregando usuários." /></div>
                    ) : usuarios.length === 0 ? (
                        <div className="u-surface"><EmptyState numero="0" title="Nenhum usuário." /></div>
                    ) : (
                        <ul className="u-surface divide-y u-divider px-4">
                            {usuarios.map((u) => (
                                <li key={u.id} className="flex items-center gap-2 py-2">
                                    <p className="min-w-0 flex-1 truncate text-[13px] leading-5">
                                        <span className="font-medium text-slate-900 dark:text-slate-100">{u.usuario}</span>
                                        {u.precisaTrocarSenha && <span className="ml-2 rounded bg-[#B9770E]/10 px-1.5 py-0.5 text-[11px] text-[#B9770E]">senha padrão</span>}
                                    </p>
                                    {chipPapel(u.papel)}
                                    <span className="flex shrink-0 items-center gap-1.5">
                                        <button onClick={() => handleReset(u)} disabled={agindoId === u.id} className="btn-ghost !min-h-[32px] !px-2.5 !py-1 !text-xs disabled:opacity-60" title="Redefinir para a senha padrão">Resetar</button>
                                        {confirmExcluir === u.id ? (
                                            <React.Fragment>
                                                <button onClick={() => handleExcluir(u.id)} disabled={agindoId === u.id} className="btn-danger !min-h-[32px] !px-2.5 !py-1 !text-xs disabled:opacity-60">Confirmar</button>
                                                <button onClick={() => setConfirmExcluir(null)} className="btn-ghost !min-h-[32px] !px-2.5 !py-1 !text-xs">Não</button>
                                            </React.Fragment>
                                        ) : (
                                            <button onClick={() => setConfirmExcluir(u.id)} className="btn-ghost !min-h-[32px] !px-2.5 !py-1 !text-xs">Excluir</button>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </React.Fragment>
            ) : (
                <React.Fragment>
                    <div className="u-surface mb-4 flex gap-2 p-2">
                        <select value={filtroMov} onChange={(e) => setFiltroMov(e.target.value)} aria-label="Usuário" className="u-input flex-1">
                            <option value="">Movimentos: todos</option>
                            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.usuario}</option>)}
                        </select>
                        <button onClick={() => carregarMovimentos()} disabled={carregandoMov} className="btn-ghost shrink-0 disabled:opacity-60">{carregandoMov ? '…' : 'Atualizar'}</button>
                    </div>
                    {movimentos.length === 0 ? (
                        <div className="u-surface"><EmptyState numero="0" title="Sem movimentos." /></div>
                    ) : (
                        <ul className="u-surface divide-y u-divider px-4">
                            {movimentos.map((m) => (
                                <li key={`${m.origem}-${m.id}`} className="flex items-center gap-2 py-2">
                                    <span className="w-24 shrink-0 font-mono text-[11px] tabular-nums text-slate-400">{formatarApenasData(formatarDataBR(m.criado_em))}</span>
                                    <p className="min-w-0 flex-1 truncate text-[13px] text-slate-700 dark:text-slate-200" title={textoMovimento(m)}>{textoMovimento(m)}</p>
                                    <span className="max-w-[140px] shrink-0 truncate text-right text-[11px] text-slate-400">{quemMovimento(m)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </React.Fragment>
            )}
        </div>
    );
}
