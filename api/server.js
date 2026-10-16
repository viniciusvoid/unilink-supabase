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
app.set('trust proxy', 1); // Railway usa proxy — sem isso o rate-limit reclama do X-Forwarded-For
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
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
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

// ----------------------------------------------------------
// ADMINISTRAÇÃO DE USUÁRIOS
// Login é por nome: o front envia "joao" e o Auth usa
// "joao@unilink.local" (ver ModalLogin). A senha inicial é
// ADMIN_SENHA_PADRAO (padrão 'unilink123') e o 1º acesso exige troca.
// ----------------------------------------------------------
const DOMINIO_USUARIO = '@unilink.local';
const PAPEIS = ['atendente', 'supervisor', 'administrador'];

const normalizarUsuario = (u) => String(u || '').trim().toLowerCase();
const usuarioValido = (u) => /^[a-z0-9._-]{3,40}$/.test(u);
const emailDeUsuario = (u) => `${u}${DOMINIO_USUARIO}`;
const nomeDeExibicao = (email) => String(email || '').split('@')[0] || email;

async function getPerfil(userId) {
  const { data } = await supabaseAdmin.from('perfis_usuario').select('papel, precisa_trocar_senha, ativo').eq('user_id', userId).maybeSingle();
  return data || null;
}

async function auditar(acao, alvo, feitoPor, detalhe) {
  try {
    await supabaseAdmin.from('admin_auditoria').insert({
      acao,
      alvo_usuario_id: alvo?.id || null,
      alvo_usuario_nome: alvo?.nome || null,
      feito_por: feitoPor?.id || null,
      feito_por_nome: feitoPor?.email || null,
      detalhe: detalhe || null
    });
  } catch (e) { logger.warn('Falha ao auditar ' + acao, e?.message); }
}

// exige login; anexa perfil (fallback atendente p/ usuários antigos sem linha)
async function exigirLogin(req, res, next) {
  const usuario = await getUsuario(req);
  if (!usuario) return res.status(401).json({ mensagem:'Sessão expirada. Faça login novamente.' });
  const perfil = await getPerfil(usuario.id);
  req.authUser = usuario;
  req.perfil = perfil || { papel:'atendente', precisa_trocar_senha:false, ativo:true };
  if (req.perfil.ativo === false) return res.status(403).json({ mensagem:'Usuário desativado. Fale com o administrador.' });
  next();
}

// exige papel administrador
async function exigirAdmin(req, res, next) {
  const usuario = await getUsuario(req);
  if (!usuario) return res.status(401).json({ mensagem:'Sessão expirada. Faça login novamente.' });
  const perfil = await getPerfil(usuario.id);
  if (!perfil || perfil.papel !== 'administrador' || perfil.ativo === false) {
    logger.warn(`Acesso admin negado para ${usuario.email}`);
    return res.status(403).json({ mensagem:'Acesso restrito ao administrador.' });
  }
  req.authUser = usuario;
  req.perfil = perfil;
  next();
}

// GET /meu-perfil — perfil real do logado (papel + flag de troca)
app.get('/meu-perfil', exigirLogin, async (req,res)=>{
  res.json({
    id: req.authUser.id,
    usuario: nomeDeExibicao(req.authUser.email),
    email: req.authUser.email,
    papel: req.perfil.papel,
    precisaTrocarSenha: !!req.perfil.precisa_trocar_senha
  });
});

// PATCH /meu-perfil/senha-trocada — front chama após a troca do 1º acesso
app.patch('/meu-perfil/senha-trocada', exigirLogin, async (req,res)=>{
  const { error } = await supabaseAdmin.from('perfis_usuario').update({ precisa_trocar_senha:false }).eq('user_id', req.authUser.id);
  if (error){ logger.error('Erro limpar flag troca', error); return res.status(500).json({ mensagem:'Erro ao confirmar troca.' }); }
  res.json({ ok:true });
});

// GET /admin/usuarios — lista Auth + perfis
app.get('/admin/usuarios', exigirAdmin, async (req,res)=>{
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  if (error){ logger.error('Erro listar usuarios', error); return res.status(500).json({ mensagem:'Erro ao listar usuários.' }); }
  const ids = data.users.map(u=>u.id);
  let perfis = [];
  if (ids.length) {
    const r = await supabaseAdmin.from('perfis_usuario').select('user_id, papel, precisa_trocar_senha, ativo, criado_em').in('user_id', ids);
    perfis = r.data || [];
  }
  const mapa = Object.fromEntries(perfis.map(p=>[p.user_id, p]));
  res.json({ usuarios: data.users.map(u=>({
    id: u.id,
    usuario: nomeDeExibicao(u.email),
    email: u.email,
    papel: mapa[u.id]?.papel || 'atendente',
    precisaTrocarSenha: !!mapa[u.id]?.precisa_trocar_senha,
    ativo: mapa[u.id]?.ativo !== false,
    criadoEm: u.created_at,
    ultimoAcessoEm: u.last_sign_in_at || null
  }))});
});

// POST /admin/usuarios {usuario, papel, senha} — senha definida pelo admin; 1º acesso exige troca
app.post('/admin/usuarios', exigirAdmin, async (req,res)=>{
  const usuario = normalizarUsuario(req.body?.usuario);
  const papel = String(req.body?.papel || 'atendente');
  const senha = String(req.body?.senha || '');
  if (!usuarioValido(usuario)) return res.status(400).json({ mensagem:'Usuário inválido: use 3–40 letras minúsculas, números, ponto, _ ou -.' });
  if (!PAPEIS.includes(papel)) return res.status(400).json({ mensagem:'Papel inválido.' });
  if (senha.length < 6) return res.status(400).json({ mensagem:'Defina uma senha inicial com pelo menos 6 caracteres.' });
  const email = emailDeUsuario(usuario);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { usuario } });
  if (error){
    logger.warn(`Criar usuario falhou ${usuario}: ${error.message}`);
    if (/already|exists|duplicate/i.test(error.message)) return res.status(409).json({ mensagem:`Usuário "${usuario}" já existe.` });
    return res.status(500).json({ mensagem:'Erro ao criar usuário.' });
  }
  const { error: errPerfil } = await supabaseAdmin.from('perfis_usuario').upsert({ user_id: data.user.id, nome: usuario, papel, precisa_trocar_senha: true }, { onConflict: 'user_id' });
  if (errPerfil){ logger.error('Erro perfil novo usuario', errPerfil); }
  await auditar('CRIAR_USUARIO', { id: data.user.id, nome: usuario }, req.authUser, `papel=${papel}`);
  logger.info(`Usuario criado ${usuario} (${papel}) por ${req.authUser.email}`);
  res.status(201).json({ ok:true, id: data.user.id, usuario });
});

// DELETE /admin/usuarios/:id — exclui (bloqueia auto-exclusão)
app.delete('/admin/usuarios/:id', exigirAdmin, async (req,res)=>{
  const { id } = req.params;
  if (id === req.authUser.id) return res.status(400).json({ mensagem:'Você não pode excluir o próprio usuário.' });
  const { data: alvo } = await supabaseAdmin.auth.admin.getUserById(id);
  const nomeAlvo = alvo?.user ? nomeDeExibicao(alvo.user.email) : id;
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (error){
    logger.warn(`Excluir usuario falhou ${id}: ${error.message}`);
    if (/foreign|reference|constraint|violates/i.test(error.message)) return res.status(409).json({ mensagem:'Usuário possui chamados vinculados e não pode ser excluído.' });
    return res.status(500).json({ mensagem:'Erro ao excluir usuário.' });
  }
  await supabaseAdmin.from('perfis_usuario').delete().eq('user_id', id);
  await auditar('EXCLUIR_USUARIO', { id, nome: nomeAlvo }, req.authUser, null);
  logger.info(`Usuario excluido ${nomeAlvo} por ${req.authUser.email}`);
  res.json({ ok:true });
});

// POST /admin/usuarios/:id/reset-senha {novaSenha} — senha definida pelo admin + força troca
app.post('/admin/usuarios/:id/reset-senha', exigirAdmin, async (req,res)=>{
  const { id } = req.params;
  const novaSenha = String(req.body?.novaSenha || '');
  if (novaSenha.length < 6) return res.status(400).json({ mensagem:'Defina a nova senha com pelo menos 6 caracteres.' });
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: novaSenha });
  if (error){ logger.error('Erro reset senha', error); return res.status(500).json({ mensagem:'Erro ao redefinir senha.' }); }
  await supabaseAdmin.from('perfis_usuario').update({ precisa_trocar_senha:true }).eq('user_id', id);
  const { data: alvo } = await supabaseAdmin.auth.admin.getUserById(id);
  await auditar('RESET_SENHA', { id, nome: alvo?.user ? nomeDeExibicao(alvo.user.email) : id }, req.authUser, null);
  logger.info(`Senha resetada ${id} por ${req.authUser.email}`);
  res.json({ ok:true });
});

// GET /admin/movimentos?usuarioId=&limite= — eventos + status + auditoria
app.get('/admin/movimentos', exigirAdmin, async (req,res)=>{
  const limite = Math.min(parseInt(req.query.limite || '50', 10) || 50, 200);
  const usuarioId = String(req.query.usuarioId || '').trim() || null;
  const qEv = supabaseAdmin.from('chamado_eventos').select('id, chamado_id, tipo_evento, descricao, usuario_id, usuario_nome, criado_em').order('criado_em', { ascending:false }).limit(limite);
  const qSt = supabaseAdmin.from('chamado_status_historico').select('id, chamado_id, status_anterior, status_novo, usuario_id, usuario_nome, criado_em').order('criado_em', { ascending:false }).limit(limite);
  const qAu = supabaseAdmin.from('admin_auditoria').select('id, acao, alvo_usuario_id, alvo_usuario_nome, feito_por, feito_por_nome, detalhe, criado_em').order('criado_em', { ascending:false }).limit(limite);
  if (usuarioId) { qEv.eq('usuario_id', usuarioId); qSt.eq('usuario_id', usuarioId); qAu.or(`alvo_usuario_id.eq.${usuarioId},feito_por.eq.${usuarioId}`); }
  const [rEv, rSt, rAu] = await Promise.all([qEv, qSt, qAu]);
  if (rEv.error || rSt.error || rAu.error){ logger.error('Erro movimentos', rEv.error || rSt.error || rAu.error); return res.status(500).json({ mensagem:'Erro ao carregar movimentos.' }); }
  const movs = [
    ...(rEv.data||[]).map(e=>({ origem:'evento', ...e })),
    ...(rSt.data||[]).map(s=>({ origem:'status', ...s })),
    ...(rAu.data||[]).map(a=>({ origem:'admin', ...a }))
  ].sort((a,b)=> new Date(b.criado_em) - new Date(a.criado_em)).slice(0, limite);
  res.json({ movimentos: movs });
});

app.use((err,req,res,_next)=>{ logger.error(`Erro não tratado ${req.method} ${req.originalUrl}`, err); res.status(500).json({ mensagem:'Erro interno.' }); });
app.listen(PORT, ()=> logger.info(`UNILINK API enxuta rodando em http://localhost:${PORT}`));
