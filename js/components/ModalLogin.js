// ==========================================================
// COMPONENTE: ModalLogin — acesso restrito, visual integrado
// Mesma lógica de antes (login + recuperação). Mobile: bottom-sheet.
// ==========================================================
function ModalLogin({ aoAutenticar, fechar }) {
    const [usuario, setUsuario] = React.useState('');
    const [senha, setSenha] = React.useState('');
    const [erro, setErro] = React.useState('');
    const [carregando, setCarregando] = React.useState(false);
    const [modo, setModo] = React.useState('login'); // login | recuperar
    const [emailRecuperar, setEmailRecuperar] = React.useState('');
    const [msgRecuperar, setMsgRecuperar] = React.useState('');
    const [carregandoRecuperar, setCarregandoRecuperar] = React.useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);
        try {
            const emailLogin = usuario.includes('@') ? usuario : `${usuario}@unilink.local`;
            const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: senha });
            if (error) throw error;
            window.notifySuccess && window.notifySuccess('Login realizado com sucesso');
            aoAutenticar();
        } catch (err) {
            console.error('Erro de autenticação:', err.message);
            const msg = 'Usuário ou senha incorretos.';
            setErro(msg);
        } finally {
            setCarregando(false);
        }
    };

    const handleRecuperar = async (e) => {
        e.preventDefault();
        setErro(''); setMsgRecuperar('');
        const email = emailRecuperar.includes('@') ? emailRecuperar : `${emailRecuperar}@unilink.local`;
        if (!email || !email.includes('@')) { const m='Informe um e-mail válido.'; setErro(m); return; }
        setCarregandoRecuperar(true);
        try {
            const redirectTo = window.location.origin + window.location.pathname;
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
            const msg='Se o e-mail existir, você receberá um link para redefinir a senha.';
            setMsgRecuperar(msg);
            window.notifySuccess && window.notifySuccess('Link de recuperação enviado');
        } catch (err) {
            console.error('Erro recuperação:', err.message);
            setErro(err.message || 'Não foi possível enviar o e-mail.');
        } finally { setCarregandoRecuperar(false); }
    };

    return (
        <div className="sheet-mobile fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px] fade-in" onClick={fechar}>
            <div className="sheet-panel w-full max-w-sm overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 pt-6 pb-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <Logo variant="mark" />
                            <div>
                                <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">{modo === 'recuperar' ? 'Recuperar senha' : 'Acesso da manutenção'}</h3>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{modo === 'recuperar' ? 'Enviaremos um link ao seu e-mail.' : 'Um login libera todos os módulos.'}</p>
                            </div>
                        </div>
                        <button type="button" onClick={fechar} aria-label="Fechar" className="icon-btn">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {modo === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-3">
                            {erro && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-center text-[13px] font-medium text-red-700 dark:text-red-300">{erro}</div>}
                            <div>
                                <label className="u-label">Usuário</label>
                                <input type="text" required autoComplete="username" className="u-input" placeholder="Digite o usuário" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
                            </div>
                            <div>
                                <label className="u-label">Senha</label>
                                <input type="password" required autoComplete="current-password" className="u-input" placeholder="Digite a senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
                            </div>
                            <button type="button" onClick={() => { setErro(''); setMsgRecuperar(''); setModo('recuperar'); }} className="text-xs font-semibold text-slate-500 hover:text-[#0E3263] dark:hover:text-white underline underline-offset-2">Esqueci minha senha</button>
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={fechar} className="btn-ghost flex-1 !justify-center">Cancelar</button>
                                <button type="submit" disabled={carregando} className="btn-primary flex-1 !justify-center">
                                    {carregando ? 'Entrando…' : 'Entrar'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRecuperar} className="space-y-3">
                            {erro && <div className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-center text-[13px] font-medium text-red-700 dark:text-red-300">{erro}</div>}
                            {msgRecuperar && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-center text-[13px] font-medium text-emerald-700 dark:text-emerald-300">{msgRecuperar}</div>}
                            <div>
                                <label className="u-label">E-mail</label>
                                <input type="text" required autoComplete="email" className="u-input" placeholder="seu@email.com ou usuário" value={emailRecuperar} onChange={(e) => setEmailRecuperar(e.target.value)} />
                                <p className="mt-1.5 text-[11px] text-slate-400">Pode digitar só o usuário — completamos com @unilink.local</p>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setModo('login')} className="btn-ghost flex-1 !justify-center">Voltar</button>
                                <button type="submit" disabled={carregandoRecuperar} className="btn-primary flex-1 !justify-center">
                                    {carregandoRecuperar ? 'Enviando…' : 'Enviar link'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
