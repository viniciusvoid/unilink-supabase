// ==========================================================
// TELA: Sucesso — confirmação elegante, protocolo em destaque
// ==========================================================
function TelaSucesso({ voltarInicio, chamado, aoAcompanhar, aoNovo }) {
    return (
        <div className="fade-in mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Chamado registrado</h1>
            <p className="mt-1 text-center text-[13px] text-slate-500 dark:text-slate-400">Recebido pela manutenção. Guarde o protocolo para acompanhar.</p>

            {chamado?.protocolo && (
                <div className="u-surface mt-6 w-full px-6 py-5 text-center">
                    <p className="u-eyebrow">Protocolo</p>
                    <p className="mt-1.5 font-mono text-[26px] font-semibold tracking-wide text-slate-900 dark:text-white">#{String(chamado.protocolo).replace(/^#/, '')}</p>
                    <button onClick={() => { try { navigator.clipboard.writeText(chamado.protocolo).then(() => window.notifySuccess && window.notifySuccess('Protocolo copiado')); } catch {} }} className="mt-2 text-xs font-semibold text-[#0E3263] hover:underline dark:text-sky-300">Copiar protocolo</button>
                </div>
            )}

            <div className="mt-4 w-full space-y-2">
                {chamado?.protocolo && (
                    <button onClick={aoAcompanhar} className="btn-primary w-full !py-3">
                        Acompanhar chamado
                    </button>
                )}
                <button onClick={aoNovo || voltarInicio} className="btn-ghost w-full !justify-center !py-3">Abrir novo chamado</button>
                <button onClick={voltarInicio} className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Voltar ao início</button>
            </div>
        </div>
    );
}
