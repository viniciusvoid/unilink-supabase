// UNILINK API — enxuta, direta e auditável
// Só faz o que o Supabase RLS não faz: assumir/concluir com validação + trilha
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORT = 3001 } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const app = express();
app.use(express.json());

// CORS permissivo para Railway (*.up.railway.app) e local — sem precisar configurar CORS_ORIGIN
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return cb(null, true);
    if (origin.endsWith('.up.railway.app')) return cb(null, true);
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    return cb(null, true);
  },
  methods: ['GET','POST','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(rateLimit({ windowMs: 60*1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use(logger.requestLogger);

const STATUS_TODOS = ['ABERTO','EM_ANALISE','ATRIBUIDO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','RESOLVIDO','FECHADO'];
const TRANS = {
  ABERTO: ['EM_ANALISE','ATRIBUIDO','EM_ATENDIMENTO','FECHADO'],
  EM_ANALISE: ['ATRIBUIDO','EM_ATENDIMENTO','AGUARDANDO_USUARIO','FECHADO'],
  ATRIBUIDO: ['EM_ATENDIMENTO','AGUARDANDO_USUARIO','FECHADO'],
  EM_ATENDIMENTO: ['AGUARDANDO_USUARIO','RESOLVIDO','FECHADO'],
  AGUARDANDO_USUARIO: ['EM_ATENDIMENTO','RESOLVIDO','FECHADO'],
  RESOLVIDO: ['FECHADO','EM_ATENDIMENTO'],
  FECHADO: []
};
const podeTransitar = (de, para) => de === para || (TRANS[de]||[]).includes(para);

// helper: tenta pegar usuário do token, mas não exige (assumir é público)
async function getUsuario(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

app.get('/health', (req,res)=> res.json({ ok:true, time: new Date().toISOString() }));

// assumir — público, mas se tiver token grava quem assumiu
app.patch('/chamados/:id/assumir', async (req,res)=>{
  const { id } = req.params;
  const usuario = await getUsuario(req);
  const { data: atual, error: errGet } = await supabaseAdmin.from('chamados_unilink').select('status').eq('id', id).maybeSingle();
  if (errGet || !atual) { logger.warn(`Assumir 404 id=${id} err=${errGet?.message}`); return res.status(404).json({ mensagem:'Chamado não encontrado.' }); }
  if (['FECHADO','RESOLVIDO'].includes(atual.status)) return res.status(409).json({ mensagem:'Chamado já encerrado.' });
  if (atual.status === 'EM_ATENDIMENTO') return res.json({ ok:true, status:'EM_ATENDIMENTO', jaAssumido:true });
  if (!podeTransitar(atual.status, 'EM_ATENDIMENTO')) return res.status(409).json({ mensagem:`Não é possível assumir no status ${atual.status}.` });
  const upd = { status:'EM_ATENDIMENTO', atribuido_para: usuario?.id || null, atribuido_para_nome: usuario?.email || 'Anônimo', atribuido_em: new Date().toISOString() };
  const { error } = await supabaseAdmin.from('chamados_unilink').update(upd).eq('id', id);
  if (error){ logger.error('Erro assumir', error); return res.status(500).json({ mensagem:'Erro ao assumir.' }); }
  await supabaseAdmin.from('chamado_eventos').insert({ chamado_id:id, tipo_evento:'EM_ATENDIMENTO_INICIADO', descricao:`Assumido por ${upd.atribuido_para_nome}`, usuario_id: usuario?.id || null, usuario_nome: upd.atribuido_para_nome });
  logger.info(`Assumido ${id} por ${upd.atribuido_para_nome}`);
  res.json({ ok:true, status:'EM_ATENDIMENTO' });
});

// concluir — exige login (para rastreabilidade), mas com mensagem clara se não tiver
app.patch('/chamados/:id/concluir', async (req,res)=>{
  const { id } = req.params;
  const usuario = await getUsuario(req);
  if (!usuario) return res.status(401).json({ mensagem:'Faça login para concluir. A conclusão exige rastreabilidade.' });
  const { itensConcluidos=[], servicoFeito, pendencia, observacoes } = req.body;
  if (!servicoFeito || !servicoFeito.trim()) return res.status(400).json({ mensagem:'Descreva o serviço executado.' });
  const { data: atual, error: errGet } = await supabaseAdmin.from('chamados_unilink').select('status, servico').eq('id', id).maybeSingle();
  if (errGet || !atual) return res.status(404).json({ mensagem:'Chamado não encontrado.' });
  if (!['EM_ATENDIMENTO','AGUARDANDO_USUARIO','ATRIBUIDO'].includes(atual.status)) return res.status(409).json({ mensagem:`Só é possível concluir após assumir (status: ${atual.status}).` });
  const todosItens = String(atual.servico||'').split(',').map(s=>s.trim()).filter(Boolean);
  const concluidos = Array.isArray(itensConcluidos)? itensConcluidos.map(s=>String(s).trim()).filter(Boolean):[];
  for (const it of concluidos) if (!todosItens.includes(it)) return res.status(400).json({ mensagem:`Item "${it}" não pertence a este chamado.` });
  const todosConcluidos = todosItens.length>0 && concluidos.length===todosItens.length;
  const parcial = !todosConcluidos && concluidos.length>0;
  let update, eventoDesc, novoStatus;
  if (todosConcluidos) {
    novoStatus='FECHADO';
    update={ status:novoStatus, servico_feito:servicoFeito.trim(), pendencia:(pendencia||'').trim()||'NENHUMA', observacoes:(observacoes||'').trim()||null, itens_concluidos:concluidos, conclusao_parcial:false, data_encerramento:new Date().toISOString(), encerrado_por:usuario.id };
    eventoDesc=`Concluído (total) • ${servicoFeito.trim()}` + (observacoes?` • Obs: ${observacoes}`:'');
  } else if (parcial) {
    const pendentes = todosItens.filter(i=>!concluidos.includes(i));
    novoStatus='AGUARDANDO_USUARIO';
    update={ status:novoStatus, servico_feito:servicoFeito.trim(), pendencia:pendentes.length?`Itens pendentes: ${pendentes.join(', ')}`+(pendencia?` | ${pendencia}`:''):pendencia, observacoes:(observacoes||'').trim()||null, itens_concluidos:concluidos, conclusao_parcial:true };
    eventoDesc=`Conclusão parcial: ${concluidos.join(', ')} | pendentes: ${pendentes.join(', ')} • ${servicoFeito.trim()}`;
  } else {
    novoStatus='FECHADO';
    update={ status:novoStatus, servico_feito:servicoFeito.trim(), pendencia:(pendencia||'').trim()||'NENHUMA', observacoes:(observacoes||'').trim()||null, conclusao_parcial:false, data_encerramento:new Date().toISOString(), encerrado_por:usuario.id };
    eventoDesc=`Concluído • ${servicoFeito.trim()}`;
  }
  const { error } = await supabaseAdmin.from('chamados_unilink').update(update).eq('id', id);
  if (error){ logger.error('Erro concluir', error); return res.status(500).json({ mensagem:'Erro ao concluir.' }); }
  await supabaseAdmin.from('chamado_eventos').insert({ chamado_id:id, tipo_evento: todosConcluidos||!parcial ? 'ENCERRAMENTO':'OBSERVACAO', descricao: eventoDesc, usuario_id: usuario.id, usuario_nome: usuario.email });
  logger.info(`Concluído ${id} por ${usuario.email} tipo=${parcial?'parcial':'total'}`);
  res.json({ ok:true, status:novoStatus, tipo: parcial?'parcial':'total' });
});

app.use((err,req,res,_next)=>{ logger.error(`Erro não tratado ${req.method} ${req.originalUrl}`, err); res.status(500).json({ mensagem:'Erro interno.' }); });
app.listen(PORT, ()=> logger.info(`UNILINK API enxuta rodando em http://localhost:${PORT}`));
