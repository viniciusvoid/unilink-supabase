// ==========================================================
// TELA: Nova Corretiva — processo guiado por seções
// Mesma lógica/validação de antes; apenas agrupamento visual:
// Problema → Local → Equipamento → Prioridade → Evidências.
// ==========================================================
function TelaCorretiva({ aoSalvar, voltar }) {
    const [form, setForm] = React.useState({ unidade: 'MATRIZ', equipamento: '', servico: [], descricao: '', localizacao: '', prioridade: 'Média' });
    const [enviando, setEnviando] = React.useState(false);
    const [fotos, setFotos] = React.useState([]);
    const [erroFoto, setErroFoto] = React.useState('');
    const EXTENSOES_ACEITAS = ['jpg', 'jpeg', 'png', 'webp'];
    const TAMANHO_MAX_MB = 8;
    const handleSelecionarFotos = (files) => {
        const arquivos = Array.from(files || []); setErroFoto(''); const validos = [];
        let houveErro = false;
        for (const arq of arquivos) {
            const ext = (arq.name.split('.').pop() || '').toLowerCase();
            if (!EXTENSOES_ACEITAS.includes(ext)) { setErroFoto(`"${arq.name}" formato não permitido. Use JPG, PNG ou WEBP.`); window.notifyWarning && window.notifyWarning(`Arquivo "${arq.name}" ignorado: formato inválido`); houveErro = true; continue; }
            if (arq.size > TAMANHO_MAX_MB * 1024 * 1024) { setErroFoto(`"${arq.name}" excede ${TAMANHO_MAX_MB}MB.`); window.notifyWarning && window.notifyWarning(`"${arq.name}" excede ${TAMANHO_MAX_MB}MB e foi ignorado`); houveErro = true; continue; }
            validos.push(arq);
        }
        if (validos.length > 0) window.notifySuccess && window.notifySuccess(`${validos.length} foto(s) adicionada(s)`);
        else if (houveErro) window.notifyError && window.notifyError('Nenhuma foto válida adicionada');
        if (fotos.length + validos.length > 5) window.notifyWarning && window.notifyWarning('Limite de 5 fotos atingido — excedentes ignorados');
        setFotos(prev => [...prev, ...validos].slice(0, 5));
    };
    const handleCaptureFoto = (file) => handleSelecionarFotos([file]);
    const removerFoto = (idx) => { setFotos(prev => prev.filter((_, i) => i !== idx)); window.notifyInfo && window.notifyInfo('Foto removida'); };
    const toggleServico = (srv) => {
        setForm(prev => {
            const jaExiste = prev.servico.includes(srv);
            const novo = jaExiste ? prev.servico.filter(s => s !== srv) : [...prev.servico, srv];
            if (!jaExiste) window.notifyInfo && window.notifyInfo(`${srv} adicionado`);
            return { ...prev, servico: novo };
        });
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.equipamento) { window.notifyWarning && window.notifyWarning('Informe o equipamento'); return; }
        if (form.servico.length === 0) { window.notifyWarning && window.notifyWarning('Selecione ao menos um serviço'); return; }
        if (!form.descricao.trim()) { window.notifyWarning && window.notifyWarning('Descreva o problema'); return; }
        if (!form.localizacao.trim()) { window.notifyWarning && window.notifyWarning('Informe a localização'); return; }
        setEnviando(true);
        try { await aoSalvar({ ...form, servico: form.servico.join(', '), fotos }); }
        catch (err) { window.notifyError && window.notifyError(err.message || 'Falha ao abrir chamado'); }
        finally { setEnviando(false); }
    };

    const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente'];

    return (
        <div className="fade-in mx-auto w-full max-w-[640px]">
            <PageHeader eyebrow="Solicitante" title="Abrir chamado" subtitle="Descreva o problema — o resto a manutenção resolve." back={voltar} backLabel="Voltar" />

            <form onSubmit={handleSubmit} className="u-surface divide-y u-divider overflow-hidden">
                {/* 1 · Problema */}
                <section className="px-4 py-4 sm:px-5">
                    <SectionTitle>Problema</SectionTitle>
                    <label className="u-label">O que está acontecendo?</label>
                    <textarea required maxLength="1000" rows="3" className="u-input resize-none uppercase placeholder:normal-case" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value.toUpperCase() })} placeholder="Descreva o problema encontrado…" />
                    <div className="mt-3">
                        <label className="u-label">Serviço necessário</label>
                        <div className="flex flex-wrap gap-1.5">
                            {['PINTURA', 'ELETRICA', 'SOLDA', 'MECANICA', 'BORRACHARIA', 'TRANSLADO'].map(srv => (
                                <ServiceBadge key={srv} servico={srv} selected={form.servico.includes(srv)} onClick={() => toggleServico(srv)} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* 2 · Local */}
                <section className="px-4 py-4 sm:px-5">
                    <SectionTitle>Local</SectionTitle>
                    <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]">
                        {['MATRIZ', 'PECÉM'].map(u => (
                            <button key={u} type="button" onClick={() => setForm({ ...form, unidade: u })} aria-pressed={form.unidade === u} className={`rounded-lg py-2 text-[13px] font-semibold transition ${form.unidade === u ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                                {u === 'MATRIZ' ? 'Matriz' : 'Pecém'}
                            </button>
                        ))}
                    </div>
                    <label className="u-label">Onde?</label>
                    <input type="text" required maxLength="120" className="u-input uppercase placeholder:normal-case" value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value.toUpperCase() })} placeholder="Ex: pátio principal" />
                </section>

                {/* 3 · Equipamento */}
                <section className="px-4 py-4 sm:px-5">
                    <SectionTitle>Equipamento</SectionTitle>
                    <label className="u-label">Qual equipamento?</label>
                    <input type="text" required maxLength="120" className="u-input uppercase placeholder:normal-case" value={form.equipamento} onChange={(e) => setForm({ ...form, equipamento: e.target.value.toUpperCase() })} placeholder="Ex: caminhão 102" />
                </section>

                {/* 4 · Prioridade */}
                <section className="px-4 py-4 sm:px-5">
                    <SectionTitle>Prioridade</SectionTitle>
                    <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.06]" role="radiogroup" aria-label="Prioridade">
                        {PRIORIDADES.map(p => (
                            <button key={p} type="button" role="radio" aria-checked={form.prioridade === p} onClick={() => setForm({ ...form, prioridade: p })} className={`rounded-lg py-2 text-[13px] font-semibold transition ${form.prioridade === p ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                                {p}
                            </button>
                        ))}
                    </div>
                    {form.prioridade === 'Urgente' && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">Urgente: operação parada ou risco imediato.</p>}
                </section>

                {/* 5 · Evidências */}
                <section className="px-4 py-4 sm:px-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="u-eyebrow">Evidências</h2>
                        <span className="text-[11px] tabular-nums text-slate-400">{fotos.length}/5</span>
                    </div>
                    <CameraCapture onCapture={handleCaptureFoto} onSelectFiles={handleSelecionarFotos} maxFiles={5} currentCount={fotos.length} />
                    {erroFoto && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{erroFoto}</p>}
                    {fotos.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {fotos.map((f, idx) => (
                                <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                                    <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                                    <button type="button" onClick={() => removerFoto(idx)} aria-label="Remover foto" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-sm text-white backdrop-blur hover:bg-slate-950">×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <div className="px-4 py-4 sm:px-5">
                    <button type="submit" disabled={enviando} className="btn-primary w-full !py-3.5 !text-[15px]">
                        {enviando ? 'Enviando…' : 'Abrir chamado'}
                        {!enviando && <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>}
                    </button>
                </div>
            </form>
        </div>
    );
}
