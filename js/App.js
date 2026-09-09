// ==========================================================
// APP: UNILINK — lógica preservada; navegação corporativa
// (breadcrumb + menu por ambiente, sem telas de apresentação).
// ==========================================================
function App() {
    const [telaAtual, setTelaAtual] = React.useState('splash');
    const [chamados, setChamados] = React.useState([]);
    const [exibirLogin, setExibirLogin] = React.useState(false);
    const [destinoAposLogin, setDestinoAposLogin] = React.useState('pendencia');
    const [erroAcao, setErroAcao] = React.useState('');
    const [chamadoRecemCriado, setChamadoRecemCriado] = React.useState(null);
    const [protocoloBusca, setProtocoloBusca] = React.useState('');
    const [meuPerfil, setMeuPerfil] = React.useState(null);
    const [autenticado, setAutenticado] = React.useState(false);
    const [carregandoAuth, setCarregandoAuth] = React.useState(true);
    const [darkMode, setDarkMode] = React.useState(() => {
        try {
            const salvo = localStorage.getItem('unilink_dark');
            if (salvo !== null) return salvo === 'true';
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        } catch { return false; }
    });

    React.useEffect(() => {
        try { localStorage.setItem('unilink_dark', String(darkMode)); } catch {}
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    React.useEffect(() => {
        const unsubscribe = ChamadosService.assinarChamados(setChamados);
        return () => unsubscribe();
    }, []);

    const lastSessionIdRef = React.useRef(null);
    const isFetchingPerfilRef = React.useRef(false);
    const meuPerfilRef = React.useRef(meuPerfil);
    React.useEffect(() => { meuPerfilRef.current = meuPerfil; }, [meuPerfil]);
    React.useEffect(() => {
        const aplicarSessao = async (session) => {
            const sessionId = session?.user?.id || null;
            if (sessionId && lastSessionIdRef.current === sessionId && !session) return;
            if (isFetchingPerfilRef.current) return;
            lastSessionIdRef.current = sessionId;
            const isAuth = !!session;
            if (isAuth) setCarregandoAuth(true);
            setAutenticado(isAuth);
            if (isAuth) {
                if (isFetchingPerfilRef.current) { setCarregandoAuth(false); return; }
                isFetchingPerfilRef.current = true;
                try {
                    const perfil = await Promise.race([
                        ChamadosService.obterMeuPerfil(),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout perfil')), 2500))
                    ]);
                    if (perfil) setMeuPerfil(perfil);
                    else setMeuPerfil({ email: session?.user?.email || 'usuario', papel: 'atendente' });
                } catch (e) {
                    console.warn('obterMeuPerfil falhou, usando fallback', e?.message);
                    setMeuPerfil({ email: session?.user?.email || 'usuario', papel: 'atendente' });
                } finally {
                    isFetchingPerfilRef.current = false;
                }
            } else {
                setMeuPerfil(null);
                lastSessionIdRef.current = null;
            }
            setCarregandoAuth(false);
        };
        const timeout = setTimeout(() => setCarregandoAuth(false), 3000);
        try {
            if (typeof supabase === 'undefined' || !supabase?.auth) {
                console.error('Supabase não carregou (CDN bloqueado?)');
                setCarregandoAuth(false);
            } else {
                supabase.auth.getSession().then(({ data: { session } }) => {
                    clearTimeout(timeout);
                    const hasRecovery = window.location.hash.includes('type=recovery') || window.location.search.includes('code=');
                    if (hasRecovery) setTelaAtual('redefinir');
                    aplicarSessao(session);
                }).catch(err => {
                    console.error('getSession falhou:', err);
                    clearTimeout(timeout);
                    setCarregandoAuth(false);
                    setAutenticado(false);
                });
                const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'PASSWORD_RECOVERY') setTelaAtual('redefinir');
                    const newId = session?.user?.id || null;
                    if (event === 'TOKEN_REFRESHED' && newId && lastSessionIdRef.current === newId && meuPerfilRef.current) return;
                    await aplicarSessao(session);
                });
                return () => { clearTimeout(timeout); listener?.subscription?.unsubscribe(); };
            }
        } catch (e) {
            console.error('Erro inicial auth:', e);
            setCarregandoAuth(false);
        }
        return () => clearTimeout(timeout);
    }, []);

    const irManutencao = () => {
        if (autenticado) { setTelaAtual('pendencia'); return; }
        setDestinoAposLogin('pendencia');
        setExibirLogin(true);
    };
    const solicitarLoginUnico = () => {
        if (autenticado) return;
        setDestinoAposLogin('manutencao');
        setExibirLogin(true);
    };

    const handleSair = async () => {
        await ChamadosService.logout();
        setTelaAtual('splash');
        window.notifyInfo && window.notifyInfo('Sessão encerrada.');
    };
    const handleLoginSucesso = () => {
        setExibirLogin(false);
        setTelaAtual(destinoAposLogin);
    };

    const adicionarChamado = async (novoChamado) => {
        try {
            const { fotos, ...dadosChamado } = novoChamado;
            const criado = await ChamadosService.criarChamado(dadosChamado);
            if (fotos && fotos.length > 0) {
                for (const foto of fotos) {
                    try { await ChamadosService.uploadEvidencia(criado.idFirebase, foto, 'ABERTURA'); }
                    catch (erroFoto) { console.error('Erro ao enviar evidência da abertura:', erroFoto); window.notifyWarning && window.notifyWarning('Chamado aberto, mas falha ao enviar foto: ' + erroFoto.message); }
                }
            }
            setChamadoRecemCriado(criado);
            setTelaAtual('sucesso');
            window.notifySuccess && window.notifySuccess('Protocolo ' + criado.protocolo + ' registrado.');
        } catch (e) {
            console.error("Erro ao adicionar chamado: ", e);
            const msg = 'Não foi possível abrir o chamado. Verifique sua conexão e tente novamente.';
            setErroAcao(msg);
            window.notifyError && window.notifyError(msg + ' (' + e.message + ')');
            setTimeout(() => setErroAcao(''), 4000);
        }
    };

    const abrirAcompanhamento = (protocolo = '') => {
        setProtocoloBusca(protocolo);
        setTelaAtual('acompanhamento');
    };
    const [chamadoPendenteAcao, setChamadoPendenteAcao] = React.useState(null);
    const assumirChamado = async (chamado) => {
        try {
            await ChamadosService.assumirChamado(chamado);
            setChamadoPendenteAcao(null);
            window.notifySuccess && window.notifySuccess(`${chamado.protocolo || ''} em atendimento.`.trim());
        }
        catch (e) {
            console.error("Erro ao assumir: ", e);
            const msg = e.message || 'Não foi possível assumir.';
            window.notifyError && window.notifyError(msg);
            if (msg.includes('Sessão') || msg.includes('expirada') || msg.includes('Token') || msg.includes('conectar à API')) {
                setChamadoPendenteAcao(chamado);
                if (msg.includes('conectar à API')) {
                    setErroAcao(msg);
                } else {
                    setDestinoAposLogin('pendencia');
                    setExibirLogin(true);
                    setErroAcao('Sessão expirada. Faça login para assumir.');
                }
            } else {
                setErroAcao(msg);
            }
            setTimeout(() => setErroAcao(''), 5000);
            throw e;
        }
    };
    React.useEffect(() => {
        if (autenticado && chamadoPendenteAcao && !carregandoAuth) {
            const c = chamadoPendenteAcao;
            setChamadoPendenteAcao(null);
            assumirChamado(c).catch(() => {});
        }
    }, [autenticado, carregandoAuth]);
    const toggleAtendimento = async (chamado) => {
        try { await ChamadosService.toggleAtendimento(chamado); }
        catch (e) {
            console.error("Erro ao atualizar atendimento: ", e);
            setErroAcao(e.message || 'Não foi possível atualizar. Faça login novamente.');
            setTimeout(() => setErroAcao(''), 4000);
        }
    };
    const encerrarChamado = async (chamado, servicoFeito, pendencia) => {
        try { await ChamadosService.encerrarChamado(chamado, servicoFeito, pendencia); }
        catch (e) {
            console.error("Erro ao encerrar chamado: ", e);
            setErroAcao(e.message || 'Não foi possível encerrar. Faça login novamente.');
            setTimeout(() => setErroAcao(''), 4000);
        }
    };
    const concluirChamado = async (chamado, dados) => {
        try {
            const res = await ChamadosService.concluirChamado(chamado, dados);
            window.notifySuccess && window.notifySuccess(res?.tipo === 'parcial' ? 'Conclusão parcial registrada.' : 'Chamado concluído.');
            return res;
        } catch (e) {
            console.error("Erro ao concluir: ", e);
            const msg = e.message || 'Não foi possível concluir.';
            setErroAcao(msg);
            window.notifyError && window.notifyError(msg);
            setTimeout(() => setErroAcao(''), 4000);
            throw e;
        }
    };

    const ToggleDark = () => (
        <button
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
            className="icon-btn"
        >
            {darkMode ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            )}
        </button>
    );

    const ambiente = ['pendencia', 'historico', 'dashboard', 'manutencao'].includes(telaAtual)
        ? 'Manutenção'
        : ['corretiva', 'acompanhamento', 'sucesso', 'solicitante'].includes(telaAtual)
            ? 'Solicitante'
            : null;

    const NAV = {
        'Solicitante': [
            { k: 'corretiva', l: 'Novo', icon: <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> },
            { k: 'acompanhamento', l: 'Acompanhar', icon: <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg> }
        ],
        'Manutenção': [
            { k: 'pendencia', l: 'Chamados', icon: <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.734-.05a2.5 2.5 0 111.316 4.813 2.5 2.5 0 01-3.05-3.05z" /></svg> },
            { k: 'historico', l: 'Histórico', icon: <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { k: 'dashboard', l: 'Dashboard', icon: <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 12l3-3 3 3 4-4" /></svg> }
        ]
    };

    const irNav = (k) => {
        if (k === 'pendencia' || k === 'historico' || k === 'dashboard') {
            if (autenticado) { setTelaAtual(k); return; }
            setDestinoAposLogin(k);
            setExibirLogin(true);
            return;
        }
        setTelaAtual(k);
    };

    const pendentesCount = chamados.filter(c => !c.concluido).length;
    const conteudoManutencao = telaAtual === 'manutencao'
        ? (autenticado ? 'pendencia' : 'gate')
        : telaAtual;
    const conteudoSolicitante = telaAtual === 'solicitante' ? 'corretiva' : telaAtual;

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-100 text-slate-900 antialiased selection:bg-[#0E3263]/10 dark:bg-slate-950 dark:text-slate-100">
            <ToastContainer />
            {exibirLogin && (
                <ModalLogin
                    aoAutenticar={handleLoginSucesso}
                    fechar={() => setExibirLogin(false)}
                />
            )}
            {erroAcao && (
                <div className="toast-in fixed left-1/2 top-4 z-[60] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-md border border-slate-200 bg-white py-2.5 pl-3.5 pr-2 text-[13px] text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"></span>
                    <span className="break-words">{erroAcao}</span>
                    <button onClick={() => setErroAcao('')} aria-label="Fechar" className="icon-btn shrink-0">✕</button>
                </div>
            )}

            {telaAtual !== 'splash' && (
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                    <div className="mx-auto flex h-12 w-full max-w-6xl items-center gap-3 px-3 sm:px-5">
                        <button onClick={() => setTelaAtual('splash')} className="flex min-w-0 items-center gap-2" title="Início">
                            <Logo variant="mark" />
                            <span className="whitespace-nowrap text-[13px] text-slate-500 dark:text-slate-400">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">UNILINK</span>
                                {ambiente && <span> / {ambiente}</span>}
                            </span>
                        </button>
                        <div className="ml-auto flex items-center gap-1">
                            {autenticado && meuPerfil && (
                                <span className="mr-1 hidden items-center gap-2 md:flex">
                                    <span className="max-w-[220px] truncate text-xs text-slate-500 dark:text-slate-400">{meuPerfil.email}</span>
                                    <button onClick={handleSair} className="text-xs text-slate-500 hover:text-slate-800 hover:underline dark:hover:text-slate-200">Sair</button>
                                </span>
                            )}
                            {autenticado && meuPerfil && (
                                <button onClick={handleSair} className="mr-1 text-xs text-slate-500 hover:underline md:hidden">Sair</button>
                            )}
                            <ToggleDark />
                        </div>
                    </div>
                    {ambiente && (ambiente === 'Solicitante' || autenticado) && (
                        <nav className="border-t border-slate-100 dark:border-slate-800">
                            <div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-3 sm:px-5">
                                {NAV[ambiente].map(item => {
                                    const ativo = telaAtual === item.k || (telaAtual === 'manutencao' && item.k === 'pendencia') || (telaAtual === 'solicitante' && item.k === 'corretiva');
                                    return (
                                        <button
                                            key={item.k}
                                            onClick={() => irNav(item.k)}
                                            className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-[13px] transition ${ativo ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                        >
                                            {item.icon}
                                            {item.l}
                                            {ativo && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#0E3263] dark:bg-sky-400"></span>}
                                        </button>
                                    );
                                })}
                                {ambiente === 'Manutenção' && pendentesCount > 0 && (
                                    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">{pendentesCount}</span>
                                )}
                            </div>
                        </nav>
                    )}
                </header>
            )}

            <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-5">
                {telaAtual === 'splash' && (
                    <div className="fade-in mx-auto w-full max-w-[560px] pt-10 sm:pt-16">
                        <div className="absolute right-3 top-3"><ToggleDark /></div>
                        <div className="mb-6 flex items-center gap-2.5">
                            <Logo variant="mark" />
                            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">UNILINK</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <button onClick={() => setTelaAtual('solicitante')} className="u-surface p-4 text-left transition hover:border-slate-300 dark:hover:border-slate-600">
                                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </span>
                                <span className="mt-3 flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-100">
                                    Solicitante
                                    <svg className="h-4 w-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>
                            <button onClick={irManutencao} className="u-surface border-[#0E3263]/30 p-4 text-left transition hover:border-[#0E3263]/60 dark:border-sky-400/20 dark:hover:border-sky-400/40">
                                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#0E3263] text-white dark:bg-sky-400/15 dark:text-sky-300">
                                    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.734-.05a2.5 2.5 0 111.316 4.813 2.5 2.5 0 01-3.05-3.05z" /></svg>
                                </span>
                                <span className="mt-3 flex items-center justify-between text-sm font-medium text-slate-800 dark:text-slate-100">
                                    <span className="flex items-center gap-2">
                                        Manutenção
                                        {pendentesCount > 0 && <span className="rounded bg-[#0E3263]/10 px-1.5 py-0.5 text-[11px] tabular-nums text-[#0E3263] dark:bg-sky-400/10 dark:text-sky-300">{pendentesCount}</span>}
                                    </span>
                                    <svg className="h-4 w-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>
                        </div>
                    </div>
                )}

                {telaAtual === 'menu' && (
                    <div className="u-surface mx-auto w-full max-w-[480px] p-6 text-center">
                        <p className="text-sm text-slate-500">Área reorganizada.</p>
                        <button onClick={() => setTelaAtual('splash')} className="btn-primary mt-3">Início</button>
                    </div>
                )}

                {conteudoSolicitante === 'corretiva' && <TelaCorretiva aoSalvar={adicionarChamado} />}
                {telaAtual === 'acompanhamento' && (
                    <TelaAcompanhamento protocoloInicial={protocoloBusca} />
                )}
                {conteudoManutencao === 'gate' && (
                    <div className="fade-in mx-auto w-full max-w-[420px] pt-10">
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Manutenção</h1>
                        <div className="u-surface mt-3 flex items-center justify-between gap-3 px-4 py-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Acesso restrito.</p>
                            <button onClick={solicitarLoginUnico} className="btn-primary shrink-0">Entrar</button>
                        </div>
                    </div>
                )}
                {conteudoManutencao === 'pendencia' && (
                    <TelaPendencia
                        chamados={chamados}
                        assumir={assumirChamado}
                        concluir={concluirChamado}
                        encerrar={encerrarChamado}
                        toggleAtendimento={toggleAtendimento}
                    />
                )}
                {telaAtual === 'historico' && (
                    <TelaHistorico chamados={chamados} />
                )}
                {telaAtual === 'dashboard' && (
                    <TelaDashboard chamados={chamados} />
                )}
                {telaAtual === 'sucesso' && (
                    <TelaSucesso
                        chamado={chamadoRecemCriado}
                        voltarInicio={() => setTelaAtual('splash')}
                        aoNovo={() => setTelaAtual('corretiva')}
                        aoAcompanhar={() => abrirAcompanhamento(chamadoRecemCriado?.protocolo)}
                    />
                )}
                {telaAtual === 'redefinir' && (
                    <TelaRedefinirSenha
                        voltar={() => { window.history.replaceState(null, '', window.location.pathname); setTelaAtual('splash'); }}
                        aoSucesso={() => { window.history.replaceState(null, '', window.location.pathname); setTelaAtual('splash'); setErroAcao('Senha atualizada.'); setTimeout(() => setErroAcao(''), 4000); }}
                    />
                )}
            </main>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
