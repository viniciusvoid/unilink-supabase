// ==========================================================
// APP: UNILINK — navegação por ambientes, linguagem operacional
// Lógica preservada integralmente; apenas layout/hierarquia
// foram redesenhados (header discreto, splash elegante).
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
                    if (e.message.includes('(404)') || e.message.includes('API não encontrada')) {
                        console.warn('obterMeuPerfil 404 — API_BASE_URL provavelmente aponta para front, não API. Usando fallback.', e.message);
                    } else {
                        console.warn('obterMeuPerfil falhou/timeout, usando fallback', e?.message);
                    }
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

    const solicitarAcessoChamados = () => {
        if (autenticado) { setTelaAtual('pendencia'); return; }
        setDestinoAposLogin('pendencia');
        setExibirLogin(true);
    };
    const solicitarAcessoHistorico = () => {
        if (autenticado) { setTelaAtual('historico'); return; }
        setDestinoAposLogin('historico');
        setExibirLogin(true);
    };
    const solicitarAcessoDashboard = () => {
        if (autenticado) { setTelaAtual('dashboard'); return; }
        setDestinoAposLogin('dashboard');
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
        window.notifyInfo && window.notifyInfo('Você saiu do sistema');
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
                    catch (erroFoto) { console.error('Erro ao enviar evidência da abertura:', erroFoto); window.notifyWarning && window.notifyWarning('Chamado aberto, mas falha ao enviar foto: '+erroFoto.message); }
                }
            }
            setChamadoRecemCriado(criado);
            setTelaAtual('sucesso');
            window.notifySuccess && window.notifySuccess('Chamado aberto! Protocolo: ' + criado.protocolo);
        } catch (e) {
            console.error("Erro ao adicionar chamado: ", e);
            const msg = 'Não foi possível abrir o chamado. Verifique sua conexão e tente novamente.';
            setErroAcao(msg);
            window.notifyError && window.notifyError(msg + ' ('+e.message+')');
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
            const msgOk = `✓ ${chamado.protocolo || ''} assumido! Em atendimento por você.`.trim();
            if (window.notifySuccess) window.notifySuccess(msgOk);
            else { setErroAcao(msgOk); setTimeout(()=>setErroAcao(''), 3000); }
            console.log(msgOk);
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
            setTimeout(()=>setErroAcao(''), 5000);
            throw e;
        }
    };
    React.useEffect(() => {
        if (autenticado && chamadoPendenteAcao && !carregandoAuth) {
            const c = chamadoPendenteAcao;
            setChamadoPendenteAcao(null);
            assumirChamado(c).catch(()=>{});
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
            window.notifySuccess && window.notifySuccess(res?.tipo === 'parcial' ? 'Conclusão parcial registrada' : 'Chamado concluído com sucesso');
            return res;
        } catch (e) {
            console.error("Erro ao concluir: ", e);
            const msg = e.message || 'Não foi possível concluir.';
            setErroAcao(msg);
            window.notifyError && window.notifyError(msg);
            setTimeout(()=>setErroAcao(''), 4000);
            throw e;
        }
    };

    const ToggleDark = () => (
        <button
            onClick={() => setDarkMode(v => !v)}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
            {darkMode ? (
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            ) : (
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
        </button>
    );

    // Ambiente atual — sempre visível no header
    const ambiente = ['pendencia', 'historico', 'dashboard', 'manutencao'].includes(telaAtual)
        ? 'Manutenção'
        : ['corretiva', 'acompanhamento', 'sucesso', 'solicitante'].includes(telaAtual)
            ? 'Solicitante'
            : null;

    const pendentesCount = chamados.filter(c => !c.concluido).length;

    // Linha de navegação operacional (sem card-em-card)
    const NavRow = ({ icon, title, desc, badge, onClick, destaque }) => (
        <button onClick={onClick} className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03] sm:px-5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition ${destaque ? 'bg-[#0E3263] text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300'}`}>
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
                    {badge}
                </span>
                {desc && <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{desc}</span>}
            </span>
            <svg className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
    );

    // Entrada de ambiente no splash — duas portas do mesmo produto
    const EnvEntry = ({ icon, title, desc, cta, onClick, primario }) => (
        <button onClick={onClick} className={`group flex w-full flex-col rounded-xl border p-5 text-left transition active:scale-[0.99] ${primario ? 'border-[#0E3263] bg-[#0E3263] text-white hover:bg-[#0A2447] dark:border-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100' : 'u-surface hover:border-slate-300 dark:hover:border-white/20'}`}>
            <span className={`mb-8 flex h-9 w-9 items-center justify-center rounded-[10px] ${primario ? 'bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300'}`}>
                {icon}
            </span>
            <span className={`text-[15px] font-bold tracking-tight ${primario ? '' : 'text-slate-900 dark:text-white'}`}>{title}</span>
            <span className={`mt-1 text-[13px] leading-relaxed ${primario ? 'opacity-75' : 'text-slate-500 dark:text-slate-400'}`}>{desc}</span>
            <span className={`mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold ${primario ? '' : 'text-[#0E3263] dark:text-white'}`}>
                {cta}
                <svg className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" /></svg>
            </span>
        </button>
    );

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#EDF0F5] text-slate-900 antialiased selection:bg-[#0E3263]/10 dark:bg-slate-950 dark:text-slate-100">
            <ToastContainer />
            {exibirLogin && (
                <ModalLogin
                    aoAutenticar={handleLoginSucesso}
                    fechar={() => setExibirLogin(false)}
                />
            )}
            {erroAcao && (
                <div className="toast-in fixed left-1/2 top-4 z-[60] flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 py-2.5 pl-4 pr-3 text-xs font-medium text-white shadow-xl dark:bg-white dark:text-slate-900">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"></span>
                    <span className="break-words">{erroAcao}</span>
                    <button onClick={() => setErroAcao('')} aria-label="Fechar" className="shrink-0 rounded-full p-1 hover:bg-white/15 dark:hover:bg-slate-900/10">✕</button>
                </div>
            )}

            {/* Header discreto: marca + ambiente + usuário + dark */}
            {telaAtual !== 'splash' && (
                <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-white/[0.07] dark:bg-slate-950/85">
                    <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-3 sm:px-5">
                        <button onClick={() => setTelaAtual('splash')} className="flex min-w-0 items-center gap-2.5" title="Voltar ao início">
                            <Logo variant="mark" />
                            <span className="hidden flex-col leading-none min-[400px]:flex">
                                <span className="text-[13px] font-extrabold italic tracking-tight text-[#0E3263] dark:text-white">UNILINK</span>
                                {ambiente && <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{ambiente}</span>}
                            </span>
                        </button>
                        <button onClick={() => setTelaAtual('splash')} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            <span className="hidden sm:inline">Início</span>
                        </button>
                        <div className="ml-auto flex items-center gap-1.5">
                            {autenticado && meuPerfil ? (
                                <span className="mr-1 hidden items-center gap-1.5 rounded-full bg-emerald-500/10 py-1.5 pl-2.5 pr-3 text-xs font-medium text-emerald-700 md:inline-flex dark:text-emerald-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                    {meuPerfil.email}
                                </span>
                            ) : (
                                <button onClick={solicitarLoginUnico} className="mr-1 hidden rounded-full px-3 py-1.5 text-xs font-semibold text-[#0E3263] hover:bg-[#0E3263]/5 md:block dark:text-slate-200 dark:hover:bg-white/10">Entrar</button>
                            )}
                            <ToggleDark />
                        </div>
                    </div>
                </header>
            )}

            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-4 sm:px-5 sm:py-6">
                {telaAtual === 'splash' && (
                    <div className="fade-in mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center py-6">
                        <div className="absolute right-3 top-3"><ToggleDark /></div>
                        <Logo variant="full" />
                        <p className="u-eyebrow mt-5">Gestão de chamados de TI</p>
                        <h1 className="mt-2 text-center text-[22px] font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">Selecione seu ambiente</h1>
                        <p className="mt-1.5 text-center text-[13px] text-slate-500 dark:text-slate-400">Duas entradas, um só produto.</p>

                        <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                            <EnvEntry
                                icon={<svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                title="Solicitante"
                                desc="Abra e acompanhe chamados, sem login."
                                cta="Continuar"
                                onClick={() => setTelaAtual('solicitante')}
                            />
                            <EnvEntry
                                primario
                                icon={<svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.734-.05a2.5 2.5 0 111.316 4.813 2.5 2.5 0 01-3.05-3.05z" /></svg>}
                                title="Manutenção"
                                desc={autenticado ? `${pendentesCount} chamados pendentes aguardando.` : 'Gerencie chamados e atendimentos.'}
                                cta="Continuar"
                                onClick={() => setTelaAtual('manutencao')}
                            />
                        </div>
                    </div>
                )}

                {telaAtual === 'solicitante' && (
                    <div className="fade-in mx-auto w-full max-w-[560px]">
                        <PageHeader eyebrow="Solicitante" title="O que você precisa?" back={() => setTelaAtual('splash')} backLabel="Trocar ambiente" />
                        <div className="u-surface divide-y u-divider overflow-hidden">
                            <NavRow
                                destaque
                                title="Abrir chamado"
                                desc="Registrar nova solicitação de corretiva"
                                onClick={() => setTelaAtual('corretiva')}
                                icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>}
                            />
                            <NavRow
                                title="Acompanhar chamado"
                                desc="Consultar pelo protocolo"
                                onClick={() => abrirAcompanhamento()}
                                icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>}
                            />
                        </div>
                    </div>
                )}

                {telaAtual === 'manutencao' && (
                    <div className="fade-in mx-auto w-full max-w-[560px]">
                        <PageHeader eyebrow="Manutenção · área restrita" title="Operação" subtitle={autenticado && meuPerfil ? `${meuPerfil.email} • ${meuPerfil.papel}` : 'Faça login uma vez para liberar os módulos.'} back={() => setTelaAtual('splash')} backLabel="Trocar ambiente" />

                        {!autenticado ? (
                            <div className="u-surface mb-3 flex items-center justify-between gap-3 px-4 py-3.5">
                                <p className="text-[13px] text-slate-500 dark:text-slate-400">Login único para pendentes, histórico e dashboard.</p>
                                <button onClick={solicitarLoginUnico} className="btn-primary shrink-0 !py-2.5">Entrar</button>
                            </div>
                        ) : !meuPerfil ? (
                            <div className="u-surface mb-3 flex items-center justify-between gap-3 px-4 py-3.5">
                                <p className="text-[13px] text-slate-500">Perfil não carregou.</p>
                                <button onClick={() => window.location.reload()} className="btn-ghost shrink-0 !py-2">Recarregar</button>
                            </div>
                        ) : (
                            <div className="mb-3 flex items-center justify-between gap-3 px-1">
                                <LiveDot label={`${meuPerfil.email} • ${meuPerfil.papel}`} />
                                <span className="flex items-center gap-3">
                                    <button onClick={() => setTelaAtual('redefinir')} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Alterar senha</button>
                                    <button onClick={handleSair} className="text-[11px] font-semibold text-slate-400 hover:text-red-600">Sair</button>
                                </span>
                            </div>
                        )}

                        <div className="u-surface divide-y u-divider overflow-hidden">
                            <NavRow
                                destaque
                                title="Chamados pendentes"
                                desc={pendentesCount === 0 ? 'Nada em aberto' : `${pendentesCount} em aberto`}
                                onClick={solicitarAcessoChamados}
                                badge={pendentesCount > 0 ? <span className="rounded-full bg-[#0E3263] px-2 py-0.5 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">{pendentesCount}</span> : null}
                                icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.5a2.5 2.5 0 110 5H14m-4-5h-2a2 2 0 00-2 2v4a2 2 0 002 2h2m4-8v8m-4-8v8" /></svg>}
                            />
                            <NavRow
                                title="Histórico"
                                desc="Chamados concluídos"
                                onClick={solicitarAcessoHistorico}
                                icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            />
                            <NavRow
                                title="Dashboard"
                                desc={autenticado ? 'Indicadores da operação' : 'Requer login'}
                                onClick={solicitarAcessoDashboard}
                                badge={!autenticado ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">login</span> : null}
                                icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 12l3-3 3 3 4-4" /></svg>}
                            />
                        </div>
                    </div>
                )}

                {telaAtual === 'menu' && (
                    <div className="u-surface mx-auto w-full max-w-[480px] p-6 text-center">
                        <p className="text-sm text-slate-500">Esta área foi reorganizada.</p>
                        <button onClick={() => setTelaAtual('splash')} className="btn-primary mt-3">Voltar ao início</button>
                    </div>
                )}

                {telaAtual === 'corretiva' && <TelaCorretiva aoSalvar={adicionarChamado} voltar={() => setTelaAtual('solicitante')} />}
                {telaAtual === 'acompanhamento' && (
                    <TelaAcompanhamento
                        protocoloInicial={protocoloBusca}
                        voltar={() => setTelaAtual('solicitante')}
                    />
                )}
                {telaAtual === 'pendencia' && (
                    <TelaPendencia
                        chamados={chamados}
                        voltar={() => setTelaAtual('manutencao')}
                        assumir={assumirChamado}
                        concluir={concluirChamado}
                        encerrar={encerrarChamado}
                        toggleAtendimento={toggleAtendimento}
                    />
                )}
                {telaAtual === 'historico' && (
                    <TelaHistorico
                        chamados={chamados}
                        voltar={() => setTelaAtual('manutencao')}
                    />
                )}
                {telaAtual === 'dashboard' && (
                    <TelaDashboard
                        chamados={chamados}
                        voltar={() => setTelaAtual('manutencao')}
                    />
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
                        voltar={() => { window.history.replaceState(null,'',window.location.pathname); setTelaAtual('splash'); }}
                        aoSucesso={() => { window.history.replaceState(null,'',window.location.pathname); setTelaAtual('splash'); setErroAcao('Senha atualizada! Faça login.'); setTimeout(()=>setErroAcao(''), 4000); }}
                    />
                )}
            </main>

            <footer className="shrink-0 py-4 text-center text-[11px] font-medium text-slate-400 dark:text-slate-600">
                UNILINK Transportes Integrados Ltda. · Manutenção
            </footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
