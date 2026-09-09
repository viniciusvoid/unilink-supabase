// ==========================================================
// COMPONENTE: Toast — notificações compactas e discretas
// Mesma API (window.showToast / notifySuccess|Error|Warning|Info).
// Visual: pílula escura neutra, ícone de 14px, sem alerta gigante.
// ==========================================================
function ToastContainer() {
    const [toasts, setToasts] = React.useState([]);

    const addToast = React.useCallback((msg, type = "info", duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-3), { id, msg, type }]);
        if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }, []);

    const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    React.useEffect(() => {
        window.showToast = addToast;
        window.notifySuccess = (m, d) => addToast(m, "success", d || 3000);
        window.notifyError = (m, d) => addToast(m, "error", d || 5000);
        window.notifyWarning = (m, d) => addToast(m, "warning", d || 4000);
        window.notifyInfo = (m, d) => addToast(m, "info", d || 3500);
        return () => {};
    }, [addToast]);

    const dot = {
        success: "bg-emerald-500",
        error: "bg-red-500",
        warning: "bg-amber-500",
        info: "bg-sky-500"
    };

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[100] w-[92vw] sm:w-auto sm:max-w-sm flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-full bg-slate-900/95 dark:bg-white dark:text-slate-900 text-white pl-3.5 pr-2 py-2 shadow-lg backdrop-blur-sm">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot[t.type] || dot.info}`}></span>
                    <span className="flex-1 text-[13px] font-medium leading-snug break-words">{t.msg}</span>
                    <button onClick={() => remove(t.id)} aria-label="Fechar" className="shrink-0 p-1.5 rounded-full hover:bg-white/15 dark:hover:bg-slate-900/10">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
