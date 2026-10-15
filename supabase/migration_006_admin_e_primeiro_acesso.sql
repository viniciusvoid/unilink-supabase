-- ==========================================================
-- UNILINK — Migration 006
-- Administração de usuários: troca forçada no 1º acesso + auditoria
-- ----------------------------------------------------------
-- Rode DEPOIS de migration_005_conclusao_parcial_e_observacoes.sql:
-- Supabase Dashboard > SQL Editor > New query
--
-- Aditiva: não altera nada do que já existe.
-- Como promover o primeiro administrador (rode após criar o usuário):
--   update public.perfis_usuario
--   set papel = 'administrador'
--   where user_id = (select id from auth.users where email = 'SEU_USUARIO@unilink.local');
-- ==========================================================

-- 1) Flag de troca obrigatória de senha no primeiro acesso.
-- A API marca true ao criar/resetar; o front força a troca e a API
-- limpa a flag em PATCH /meu-perfil/senha-trocada.
alter table public.perfis_usuario
    add column if not exists precisa_trocar_senha boolean not null default false;

-- 2) Auditoria de ações administrativas (criar/excluir/resetar).
-- SEM policies públicas: anon/authenticated não leem nem escrevem;
-- só a service_role (API) acessa. Sem policy = bloqueado por padrão.
create table if not exists public.admin_auditoria (
    id                uuid primary key default gen_random_uuid(),
    acao              text not null check (acao in ('CRIAR_USUARIO','EXCLUIR_USUARIO','RESET_SENHA','PROMOVER','DESATIVAR')),
    alvo_usuario_id   uuid,
    alvo_usuario_nome text,
    feito_por         uuid references auth.users(id),
    feito_por_nome    text,
    detalhe           text,
    criado_em         timestamptz not null default now()
);

create index if not exists idx_admin_aud_alvo on public.admin_auditoria (alvo_usuario_id, criado_em desc);
create index if not exists idx_admin_aud_data on public.admin_auditoria (criado_em desc);

alter table public.admin_auditoria enable row level security;
-- (nenhuma policy = acesso só via service_role pela API)
