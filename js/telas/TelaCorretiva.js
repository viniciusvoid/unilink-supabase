// TELA: Novo chamado — solicitação + contexto
function TelaCorretiva({ aoSalvar }) {
    const [form, setForm] = React.useState({ unidade: 'MATRIZ', equipamento: '', servico: [], descricao: '', localizacao: '', prioridade: 'Média' });
    const [enviando, setEnviando] = React.useState(false);
    const [fotos, setFotos] = React.useState([]);
    const [erroFoto, setErroFoto] = React.useState('');
    const EXTENSOES_ACEITAS = ['jpg', 'jpeg', 'png', 'webp'];
    const TAMANHO_MAX_MB = 8;
    const handleSelecionarFotos = (files) => {
        const arquivos = Array.from(files || []); setErroFoto(''); const validos = [];
        for (const arq of arquivos) {
            const ext = (arq.name.split('.').pop() || '').toLowerCase();
            if (!EXTENSOES_ACEITAS.includes(ext)) { setErroFoto(`"${arq.name}" formato não permitido. Use JPG, PNG ou WEBP.`); continue; }
            if (arq.size > TAMANHO_MAX_MB * 1024 * 1024) { setErroFoto(`"${arq.name}" excede ${TAMANHO_MAX_MB}MB.`); continue; }
            validos.push(arq);
        }
        if (fotos.length + validos.length > 5) window.notifyWarning && window.notifyWarning('Limite de 5 fotos.');
        setFotos(prev => [...prev, ...validos].slice(0, 5));
    };
    const handleCaptureFoto = (file) => handleSelecionarFotos([file]);
    const removerFoto = (idx) => { setFotos(prev => prev.filter((_, i) => i !== idx)); };
    const toggleServico = (srv) => {
        setForm(prev => {
            const jaExiste = prev.servico.includes(srv);
            return { ...prev, servico: jaExiste ? prev.servico.filter(s => s !== srv) : [...prev.servico, srv] };
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.equipamento) { window.notifyWarning && window.notifyWarning('Informe o equipamento.'); return; }
        if (form.servico.length === 0) { window.notifyWarning && window.notifyWarning('Selecione ao menos um serviço.'); return; }
        if (!form.descricao.trim()) { window.notifyWarning && window.notifyWarning('Descreva o problema.'); return; }
        if (!form.localizacao.trim()) { window.notifyWarning && window.notifyWarning('Informe a localização.'); return; }
        setEnviando(true);
        try { await aoSalvar({ ...form, servico: form.servico.join(', '), fotos }); }
        catch (err) { window.notifyError && window.notifyError(err.message || 'Falha ao abrir chamado.'); }
        finally { setEnviando(false); }
    };

    const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente'];
    const Grupo = ({ titulo, children }) => (
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">{titulo}</p>
    );

    return (
        <div className="mx-auto w-full max-w-[1024px]">
            <PageHeader title="Novo chamado" />

            <form onSubmit={handleSubmit} className="u-surface overflow-hidden">
                <div className="grid md:grid-cols-[1.25fr_1fr]">
                    <div className="px-4 py-4 sm:px-5 md:border-r u-divider">
                        <Grupo titulo="Solicitação" />
                        <label className="u-label">Descrição</label>
                        <textarea required maxLength="1000" rows="5" className="u-input resize-none uppercase placeholder:normal-case" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value.toUpperCase() })} />
                        <div className="mt-4">
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className="u-label !mb-0">Evidências</label>
                                <span className="text-[11px] tabular-nums text-slate-400">{fotos.length}/5</span>
                            </div>
                            <CameraCapture onCapture={handleCaptureFoto} onSelectFiles={handleSelecionarFotos} maxFiles={5} currentCount={fotos.length} />
                            {erroFoto && <p className="mt-1.5 text-xs text-[#B3261E] dark:text-red-400">{erroFoto}</p>}
                            {fotos.length > 0 && (
                                <div className="mt-2 grid grid-cols-4 gap-2">
                                    {fotos.map((f, idx) => (
                                        <div key={idx} className="relative aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                                            <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                                            <button type="button" onClick={() => removerFoto(idx)} aria-label="Remover foto" className="icon-btn absolute right-1 top-1 !rounded-full !bg-slate-950/70 !p-0 !text-white">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="divide-y u-divider border-t u-divider md:border-t-0">
                        <div className="px-4 py-4 sm:px-5">
                            <Grupo titulo="Contexto" />
                            <label className="u-label">Unidade</label>
                            <div className="grid h-9 grid-cols-2 gap-1 rounded-md bg-slate-200/60 p-1 dark:bg-slate-800">
                                {['MATRIZ', 'PECÉM'].map(u => (
                                    <button key={u} type="button" onClick={() => setForm({ ...form, unidade: u })} aria-pressed={form.unidade === u} className={`rounded text-[13px] transition ${form.unidade === u ? 'bg-white font-medium text-slate-900 dark:bg-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                                        {u === 'MATRIZ' ? 'Matriz' : 'Pecém'}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3">
                                <label className="u-label">Localização</label>
                                <input type="text" required maxLength="120" className="u-input uppercase placeholder:normal-case" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                        <div className="px-4 py-4 sm:px-5">
                            <label className="u-label">Equipamento</label>
                            <input type="text" required maxLength="120" className="u-input uppercase placeholder:normal-case" value={form.equipamento} onChange={(e) => setForm({ ...form, equipamento: e.target.value.toUpperCase() })} />
                            <div className="mt-3">
                                <label className="u-label">Serviço</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {['PINTURA', 'ELETRICA', 'SOLDA', 'MECANICA', 'BORRACHARIA', 'TRANSLADO'].map(srv => (
                                        <ServiceBadge key={srv} servico={srv} selected={form.servico.includes(srv)} onClick={() => toggleServico(srv)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="px-4 py-4 sm:px-5">
                            <label className="u-label">Prioridade</label>
                            <div className="grid h-9 grid-cols-4 gap-1 rounded-md bg-slate-200/60 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Prioridade">
                                {PRIORIDADES.map(p => (
                                    <button key={p} type="button" role="radio" aria-checked={form.prioridade === p} onClick={() => setForm({ ...form, prioridade: p })} className={`rounded text-[13px] transition ${form.prioridade === p ? 'bg-white font-medium text-slate-900 dark:bg-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t u-divider px-4 py-4 sm:px-5">
                    <button type="submit" disabled={enviando} className="btn-primary w-full !justify-center !text-sm disabled:opacity-60 md:w-auto md:min-w-[220px]">
                        {enviando ? 'Enviando…' : 'Abrir chamado'}
                    </button>
                </div>
            </form>
        </div>
    );
}
