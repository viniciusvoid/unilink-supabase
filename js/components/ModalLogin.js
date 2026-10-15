// COMPONENTE: ModalLogin — acesso por usuário, sem ruído
function ModalLogin({ aoAutenticar, fechar }) {
    const [usuario, setUsuario] = React.useState('');
    const [senha, setSenha] = React.useState('');
    const [erro, setErro] = React.useState('');
    const [carregando, setCarregando] = React.useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro('');
        setCarregando(true);
        try {
            const login = usuario.trim().toLowerCase();
            const emailLogin = login.includes('@') ? login : `${login}@unilink.local`;
            const { error } = await supabase.auth.signInWithPassword({ email: emailLogin, password: senha });
            if (error) throw error;
            window.notifySuccess && window.notifySuccess('Login efetuado.');
            aoAutenticar();
        } catch (err) {
            // Credencial inválida é fluxo esperado (usuário errou senha) — warn, não error
            console.warn('Erro de autenticação:', err.message);
            setErro('Usuário ou senha incorretos.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 fade-in" onClick={fechar}>
            <div className="modal-pop w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">Acesso</h3>
                    <button type="button" onClick={fechar} aria-label="Fechar" className="icon-btn">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                    {erro && <p className="rounded-md bg-[#B3261E]/10 px-3 py-2 text-[13px] text-[#B3261E] dark:bg-red-500/10 dark:text-red-300">{erro}</p>}
                    <div>
                        <label className="u-label">Usuário</label>
                        <input type="text" required autoComplete="username" className="u-input" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
                    </div>
                    <div>
                        <label className="u-label">Senha</label>
                        <input type="password" required autoComplete="current-password" className="u-input" value={senha} onChange={(e) => setSenha(e.target.value)} />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={fechar} className="btn-ghost flex-1 !justify-center">Cancelar</button>
                        <button type="submit" disabled={carregando} className="btn-primary flex-1 !justify-center">
                            {carregando ? 'Entrando…' : 'Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
