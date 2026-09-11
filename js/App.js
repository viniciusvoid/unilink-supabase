// ==========================================================
// APP: UNILINK — lógica preservada; navegação corporativa
// (breadcrumb + menu por ambiente, sem telas de apresentação).
// ==========================================================
function App() {
    const [telaAtual, setTelaAtual] = React.useState('splash');
    const [chamados, setChamados] = React.useState([]);
    const [exibirLogin, setExibirLogin] = React.useState(false);
    const [destinoAposLogin, setDestinoAposLogin] = React.useState('pendencia');
    const [chamadoRecemCriado, setChamadoRecemCriado] = React.useState(null);
    const [detalheRapido, setDetalheRapido] = React.useState(null);
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
        if (autenticado) { setTelaAtual('manutencao'); return; }
        setDestinoAposLogin('manutencao');
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
            window.notifyError && window.notifyError('Não foi possível abrir o chamado. Verifique sua conexão e tente novamente. (' + e.message + ')');
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
            if (msg.includes('Sessão') || msg.includes('expirada') || msg.includes('Token')) {
                setChamadoPendenteAcao(chamado);
                setDestinoAposLogin('pendencia');
                setExibirLogin(true);
                window.notifyWarning && window.notifyWarning('Sessão expirada. Faça login para assumir.');
            } else {
                window.notifyError && window.notifyError(msg);
                if (msg.includes('conectar à API')) setChamadoPendenteAcao(chamado);
            }
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
            window.notifyError && window.notifyError(e.message || 'Não foi possível atualizar. Faça login novamente.');
        }
    };
    const encerrarChamado = async (chamado, servicoFeito, pendencia) => {
        try { await ChamadosService.encerrarChamado(chamado, servicoFeito, pendencia); }
        catch (e) {
            console.error("Erro ao encerrar chamado: ", e);
            window.notifyError && window.notifyError(e.message || 'Não foi possível encerrar. Faça login novamente.');
        }
    };
    const concluirChamado = async (chamado, dados) => {
        try {
            const res = await ChamadosService.concluirChamado(chamado, dados);
            window.notifySuccess && window.notifySuccess(res?.tipo === 'parcial' ? 'Conclusão parcial registrada.' : 'Chamado concluído.');
            return res;
        } catch (e) {
            console.error("Erro ao concluir: ", e);
            window.notifyError && window.notifyError(e.message || 'Não foi possível concluir.');
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
    const telasConteudo = ['corretiva', 'acompanhamento', 'sucesso', 'pendencia', 'historico', 'dashboard'];
    const showDock = telasConteudo.includes(telaAtual) && (ambiente === 'Solicitante' || autenticado);
    const emAtendimento = chamados
        .filter(c => !c.concluido && (c.status === 'EM_ATENDIMENTO' || c.emAtendimento || c.status === 'AGUARDANDO_USUARIO'))
        .sort((a, b) => {
            const ua = a.prioridade === 'Urgente';
            const ub = b.prioridade === 'Urgente';
            if (ua !== ub) return ua ? -1 : 1;
            return calcularDiasDecorridos(b.dataAbertura) - calcularDiasDecorridos(a.dataAbertura);
        })
        .slice(0, 5);

    const opsAbertos = chamados.filter(c => !c.concluido);
    const opsEmAtend = opsAbertos.filter(c => c.status === 'EM_ATENDIMENTO' || c.emAtendimento);
    const opsUrg = opsAbertos.filter(c => c.prioridade === 'Urgente');
    const opsHoje = chamados.filter(c => {
        try {
            if (typeof parseDataBR !== 'function') return false;
            const dt = parseDataBR(c.dataAbertura);
            const h = new Date();
            return dt && dt.getFullYear() === h.getFullYear() && dt.getMonth() === h.getMonth() && dt.getDate() === h.getDate();
        } catch { return false; }
    });
    const recentesSol = obterProtocolosRecentes();

    const EnvRow = ({ icon, label, badge, onClick, destaque }) => (
        <button onClick={onClick} className="u-surface flex w-full items-center gap-3 p-4 text-left transition hover:border-slate-300 dark:hover:border-slate-600">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${destaque ? 'bg-[#0E3263] text-white dark:bg-sky-400/15 dark:text-sky-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{icon}</span>
            <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{label}</span>
            {badge}
            <svg className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
    );
    const ICONS = {
        plus: <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>,
        search: <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>,
        wrench: <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.734-.05a2.5 2.5 0 111.316 4.813 2.5 2.5 0 01-3.05-3.05z" /></svg>,
        clock: <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        chart: <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 12l3-3 3 3 4-4" /></svg>
    };

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#F4F6F8] text-slate-900 antialiased selection:bg-[#0E3263]/10 dark:bg-[#0B1220] dark:text-slate-100">
            <ToastContainer />
            {exibirLogin && (
                <ModalLogin
                    aoAutenticar={handleLoginSucesso}
                    fechar={() => setExibirLogin(false)}
                />
            )}
            {detalheRapido && (
                <ModalDetalhes
                    chamado={detalheRapido}
                    chamados={chamados}
                    aoFechar={() => setDetalheRapido(null)}
                    aoImprimir={(c) => imprimirOrdemServico(c)}
                />
            )}

            {telaAtual !== 'splash' && (
                <header className="sticky top-0 z-20 border-b border-slate-200 bg-white dark:border-[#1F2937] dark:bg-[#0B1220]">
                    <div className="mx-auto flex h-12 w-full max-w-[1280px] items-center gap-3 px-4 sm:px-5">
                        <button onClick={() => setTelaAtual('splash')} className="flex min-w-0 items-baseline gap-1.5" title="Início">
                            <span className="text-[15px] font-extrabold italic tracking-tight text-[#0E3263] dark:text-white">UNILINK</span>
                            {ambiente && <span className="whitespace-nowrap text-[13px] text-slate-400">/ {ambiente}</span>}
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
                </header>
            )}

            <main className={`mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 pt-8 sm:px-5 sm:pt-10 ${showDock ? 'pb-28' : 'pb-6'}`}>
                {telaAtual === 'splash' && (
                    <div className="splash-art mx-auto flex w-full max-w-[640px] flex-1 flex-col py-6">
                        <div className="absolute right-3 top-3"><ToggleDark /></div>
                        <div className="m-auto w-full">
                        <div className="anim-rise d1 mb-8 flex justify-center">
                            <Logo variant="full" />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="anim-rise d2">
                            <button onClick={() => setTelaAtual('solicitante')} className="env-card u-surface h-full w-full p-5 text-left sm:p-6">
                                <span className="env-ic flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                </span>
                                <span className="mt-4 flex items-center justify-between text-[15px] font-medium text-slate-800 dark:text-slate-100">
                                    Solicitante
                                    <svg className="h-4 w-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>
                            </div>
                            <div className="anim-rise d3">
                            <button onClick={irManutencao} className="env-card u-surface h-full w-full border-[#0E3263]/30 p-5 text-left sm:p-6 dark:border-sky-400/20 dark:hover:border-sky-400/40">
                                <span className="env-ic flex h-11 w-11 items-center justify-center rounded-md bg-[#0E3263] text-white dark:bg-sky-400/15 dark:text-sky-300">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.734-.05a2.5 2.5 0 111.316 4.813 2.5 2.5 0 01-3.05-3.05z" /></svg>
                                </span>
                                <span className="mt-4 flex items-center justify-between text-[15px] font-medium text-slate-800 dark:text-slate-100">
                                    <span className="flex items-center gap-2">
                                        Manutenção
                                        {pendentesCount > 0 && <span className="rounded bg-[#0E3263]/10 px-1.5 py-0.5 text-[11px] tabular-nums text-[#0E3263] dark:bg-sky-400/10 dark:text-sky-300">{pendentesCount}</span>}
                                    </span>
                                    <svg className="h-4 w-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>
                            </div>
                        </div>
                        <div className="anim-rise d4 mt-5 flex items-center justify-center gap-1.5 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            <span className="relative flex w-1.5 h-1.5">
                                <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-[#1B7A4D]"></span>
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1B7A4D]"></span>
                            </span>
                            {opsAbertos.length} abertos, {opsEmAtend.length} em atendimento
                        </div>
                        </div>
                    </div>
                )}

                {telaAtual === 'menu' && (
                    <div className="u-surface mx-auto w-full max-w-[480px] p-6 text-center">
                        <p className="text-sm text-slate-500">Área reorganizada.</p>
                        <button onClick={() => setTelaAtual('splash')} className="btn-primary mt-3">Início</button>
                    </div>
                )}

                {telaAtual === 'solicitante' && (
                    <div className="mx-auto my-auto w-full max-w-[720px] py-6">
                        <PageHeader title="Solicitante" />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <EnvRow destaque label="Novo chamado" onClick={() => setTelaAtual('corretiva')} icon={ICONS.plus} />
                            <EnvRow label="Acompanhar chamado" badge={recentesSol.length > 0 ? <span className="font-mono text-[11px] text-slate-400">#{String(recentesSol[0]).replace(/^#/, '')}</span> : null} onClick={() => abrirAcompanhamento()} icon={ICONS.search} />
                        </div>
                    </div>
                )}
                {telaAtual === 'corretiva' && <TelaCorretiva aoSalvar={adicionarChamado} />}
                {telaAtual === 'acompanhamento' && (
                    <TelaAcompanhamento protocoloInicial={protocoloBusca} />
                )}
                {telaAtual === 'manutencao' && autenticado && (
                    <div className="mx-auto w-full max-w-[960px] py-6">
                        <PageHeader
                            title="Manutenção"
                            meta={meuPerfil ? `${meuPerfil.email}, ${meuPerfil.papel}` : null}
                            actions={<button onClick={handleSair} className="btn-ghost !min-h-[32px] !px-3 !py-1.5 !text-xs">Sair</button>}
                        />
                        <div className="grid items-start gap-4 lg:grid-cols-2">
                        <div className="u-surface mb-4 grid grid-cols-4 divide-x u-divider lg:col-start-1 lg:mb-0">
                            {[
                                ['Abertos', opsAbertos.length, false],
                                ['Em atendimento', opsEmAtend.length, false],
                                ['Urgentes', opsUrg.length, opsUrg.length > 0],
                                ['Hoje', opsHoje.length, false]
                            ].map(([rotulo, valor, alerta]) => (
                                <div key={rotulo} className="px-3 py-2.5 text-center">
                                    <div className={`text-xl font-semibold tabular-nums leading-none ${alerta ? 'text-[#B3261E] dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>{valor}</div>
                                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{rotulo}</div>
                                </div>
                            ))}
                        </div>
                        <div className="u-surface mb-4 px-4 py-3 lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:mb-0">
                            <SectionTitle action={emAtendimento.length > 0 ? <span className="text-[11px] tabular-nums text-slate-400">{emAtendimento.length}</span> : null}>Em atendimento</SectionTitle>
                            {emAtendimento.length === 0 ? (
                                <p className="py-1 text-xs text-slate-500 dark:text-slate-400">Nenhum chamado em atendimento.</p>
                            ) : (
                                <ul className="divide-y u-divider">
                                    {emAtendimento.map(c => (
                                        <li key={c.idFirebase}>
                                            <button onClick={() => setDetalheRapido(c)} className="flex w-full items-center gap-3 py-2 text-left">
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.equipamento}</span>
                                                    <ProtocoloTag codigo={c.protocolo} />
                                                </span>
                                                <PriorityBadge prioridade={c.prioridade} />
                                                <span className="w-14 shrink-0 text-right"><TempoAberto dataAbertura={c.dataAbertura} /></span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="grid gap-3 lg:col-start-1">
                            <EnvRow destaque label="Chamados" badge={pendentesCount > 0 ? <span className="rounded bg-[#0E3263]/10 px-1.5 py-0.5 text-[11px] tabular-nums text-[#0E3263] dark:bg-sky-400/10 dark:text-sky-300">{pendentesCount}</span> : null} onClick={() => setTelaAtual('pendencia')} icon={ICONS.wrench} />
                            <EnvRow label="Histórico" onClick={() => setTelaAtual('historico')} icon={ICONS.clock} />
                            <EnvRow label="Dashboard" onClick={() => setTelaAtual('dashboard')} icon={ICONS.chart} />
                        </div>
                        <button onClick={() => setTelaAtual('redefinir')} className="justify-self-start text-xs text-slate-400 hover:text-slate-600 lg:col-start-1 dark:hover:text-slate-200">Alterar senha</button>
                        </div>
                    </div>
                )}
                {telaAtual === 'manutencao' && !autenticado && (
                    <div className="mx-auto my-auto w-full max-w-[420px] py-6">
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Manutenção</h1>
                        <div className="u-surface mt-3 flex items-center justify-between gap-3 px-4 py-3">
                            <p className="text-sm text-slate-500 dark:text-slate-400">Acesso restrito.</p>
                            <button onClick={solicitarLoginUnico} className="btn-primary shrink-0">Entrar</button>
                        </div>
                    </div>
                )}
                {telaAtual === 'pendencia' && (
                    <TelaPendencia
                        chamados={chamados}
                        assumir={assumirChamado}
                        concluir={concluirChamado}
                        encerrar={encerrarChamado}
                        toggleAtendimento={toggleAtendimento}
                        aoNovo={() => setTelaAtual('corretiva')}
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
                        aoSucesso={() => { window.history.replaceState(null, '', window.location.pathname); setTelaAtual('splash'); window.notifySuccess && window.notifySuccess('Senha atualizada.'); }}
                    />
                )}
            </main>

            {showDock && (
                <nav className="print:hidden fixed inset-x-0 bottom-0 z-30 flex justify-center px-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                    <div className="flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-white/95 px-1.5 py-1.5 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                        <button
                            onClick={() => setTelaAtual('splash')}
                            title="Voltar ao início"
                            aria-label="Voltar ao início"
                            className="flex items-center justify-center rounded-xl px-3 py-2 text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10" /></svg>
                        </button>
                        <span className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700"></span>
                        {NAV[ambiente].map(item => {
                            const ativo = telaAtual === item.k;
                            return (
                                <button
                                    key={item.k}
                                    onClick={() => irNav(item.k)}
                                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[13px] transition ${ativo ? 'bg-[#0E3263]/[0.07] font-medium text-[#0E3263] dark:bg-sky-400/10 dark:text-sky-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                >
                                    {item.icon}
                                    {item.l}
                                    {ambiente === 'Manutenção' && item.k === 'pendencia' && pendentesCount > 0 && (
                                        <span className="rounded-full bg-[#0E3263] px-1.5 text-[10px] font-medium tabular-nums text-white dark:bg-sky-400 dark:text-slate-950">{pendentesCount}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </nav>
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
