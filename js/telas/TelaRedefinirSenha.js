// ==========================================================
// TELA: Redefinir Senha — usada após clicar no link do e-mail
// Lógica preservada; visual alinhado à linguagem do produto.
// ==========================================================
function TelaRedefinirSenha({ voltar, aoSucesso }) {
    const [novaSenha, setNovaSenha] = React.useState('');
    const [confirmar, setConfirmar] = React.useState('');
    const [erro, setErro] = React.useState('');
    const [ok, setOk] = React.useState('');
    const [carregando, setCarregando] = React.useState(false);

    const handleRedefinir = async (e) => {
        e.preventDefault();
        setErro(''); setOk('');
        if (novaSenha.length < 6) { const m = 'A senha deve ter pelo menos 6 caracteres.'; setErro(m); window.notifyWarning && window.notifyWarning(m); return; }
        if (novaSenha !== confirmar) { const m = 'As senhas não conferem.'; setErro(m); window.notifyWarning && window.notifyWarning(m); return; }
        setCarregando(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: novaSenha });
            if (error) throw error;
            const msg = 'Senha redefinida com sucesso! Faça login com a nova senha.';
            setOk(msg);
            window.notifySuccess && window.notifySuccess(msg);
            setTimeout(() => aoSucesso && aoSucesso(), 1800);
        } catch (err) {
            console.error('Erro redefinir:', err.message);
            const m = err.message || 'Não foi possível redefinir. O link pode ter expirado.';
            setErro(m);
            window.notifyError && window.notifyError(m);
        } finally { setCarregando(false); }
    };

    return (
        <div className="fade-in mx-auto w-full max-w-[420px]">
            <PageHeader eyebrow="Acesso" title="Redefinir senha" subtitle="Defina sua nova senha de acesso." back={voltar} backLabel="Voltar" />
            <div className="u-surface px-5 py-5">
                {erro && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-center text-[13px] font-medium text-red-700 dark:text-red-300">{erro}</div>}
                {ok && <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 text-center text-[13px] font-medium text-emerald-700 dark:text-emerald-300">{ok}</div>}
                <form onSubmit={handleRedefinir} className="space-y-3">
                    <div>
                        <label className="u-label">Nova senha</label>
                        <input type="password" required minLength="6" autoComplete="new-password" className="u-input" placeholder="Mínimo 6 caracteres" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
                    </div>
                    <div>
                        <label className="u-label">Confirmar senha</label>
                        <input type="password" required minLength="6" autoComplete="new-password" className="u-input" placeholder="Repita a nova senha" value={confirmar} onChange={e => setConfirmar(e.target.value)} />
                    </div>
                    <button type="submit" disabled={carregando} className="btn-primary w-full !justify-center !py-3 disabled:opacity-60">
                        {carregando ? 'Salvando…' : 'Salvar nova senha'}
                    </button>
                </form>
                <p className="mt-4 text-center text-[11px] text-slate-400">Link válido por 1 hora. Após redefinir, faça login novamente.</p>
            </div>
        </div>
    );
}
