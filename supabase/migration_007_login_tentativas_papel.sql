-- ==========================================================
-- UNILINK — Migration 007
-- Tentativas de login, bloqueio de usuário e exibição de senha
-- ----------------------------------------------------------
-- Rode DEPOIS de migration_006_admin_e_primeiro_acesso.sql
-- Supabase Dashboard > SQL Editor > New query
-- ==========================================================

-- 1) Controle de tentativas de login e bloqueio
-- tentativas_login: conta tentativas falhas consecutivas
-- bloqueado_ate: timestamp até quando o usuário fica bloqueado (null = não bloqueado)
-- Ultima_tentativa_em: timestamp da última tentativa (para resetar contador após sucesso ou tempo)
alter table public.perfis_usuario
    add column if not exists tentativas_login integer not null default 0,
    add column if not exists bloqueado_ate timestamptz,
    add column if not exists ultima_tentativa_em timestamptz;

-- Índice para busca rápida de usuários bloqueados
create index if not exists idx_perfis_bloqueado on public.perfis_usuario (bloqueado_ate) where bloqueado_ate is not null;

-- 2) Preferência de exibição de senha (por usuário, salva no perfil)
-- O usuário pode escolher se quer ver a senha ao digitar
alter table public.perfis_usuario
    add column if not exists mostrar_senha boolean not null default false;

-- Comentários para documentação
comment on column public.perfis_usuario.tentativas_login is 'Contador de tentativas de login falhas consecutivas. Zera após login bem-sucedido.';
comment on column public.perfis_usuario.bloqueado_ate is 'Timestamp até quando o usuário fica bloqueado. Null = não bloqueado. Após 3 falhas, bloqueia por tempo indeterminado até admin desbloquear.';
comment on column public.perfis_usuario.ultima_tentativa_em is 'Timestamp da última tentativa de login (sucesso ou falha).';
comment on column public.perfis_usuario.mostrar_senha is 'Preferência do usuário: se true, o campo de senha mostra o texto em vez de bullets.';

-- Atualiza trigger de atualizado_em para incluir novas colunas
-- (já existe trigger trg_perfis_atualizado_em que atualiza atualizado_em)