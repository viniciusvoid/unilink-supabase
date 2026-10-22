-- ==========================================================
-- UNILINK — Migration 008
-- Painel administrativo de usuários (Gerenciamento de usuários)
-- ----------------------------------------------------------
-- Rode DEPOIS de migration_007_login_tentativas_papel.sql.
-- Supabase Dashboard > SQL Editor > New query
-- Aditiva: não remove nem altera dados existentes.
-- ==========================================================

-- 1) Ações de auditoria expandidas (criar/excluir/redefinir já existiam)
alter table public.admin_auditoria
    drop constraint if exists admin_auditoria_acao_check;

alter table public.admin_auditoria
    add constraint admin_auditoria_acao_check
    check (acao in (
        'CRIAR_USUARIO','EXCLUIR_USUARIO','RESET_SENHA',
        'ALTERAR_PAPEL','SUSPENDER_USUARIO','REATIVAR_USUARIO',
        'DESBLOQUEAR_USUARIO','ATUALIZAR_USUARIO','PROMOVER','DESATIVAR'
    ));

-- Metadado não sensível da origem da requisição (útil à investigação)
alter table public.admin_auditoria
    add column if not exists ip_origem text;

create index if not exists idx_admin_aud_acao on public.admin_auditoria (acao, criado_em desc);

-- 2) Suspensão de usuário tem efeito no banco, não só na interface:
-- atualizações de chamados via client exigem perfil ativo além de
-- auth.role() = 'authenticated'. SELECT e INSERT continuam públicos
-- (acompanhamento por protocolo é público por design).
drop policy if exists "chamados_update_autenticado" on public.chamados_unilink;
create policy "chamados_update_autenticado_ativo"
    on public.chamados_unilink
    for update
    using (
        auth.role() = 'authenticated'
        and exists (
            select 1 from public.perfis_usuario p
            where p.user_id = auth.uid() and p.ativo = true
        )
    )
    with check (
        auth.role() = 'authenticated'
        and exists (
            select 1 from public.perfis_usuario p
            where p.user_id = auth.uid() and p.ativo = true
        )
    );

-- 3) Índice auxiliar para consultas administrativas de perfis
create index if not exists idx_perfis_papel_ativo on public.perfis_usuario (papel, ativo);

comment on table public.admin_auditoria is
    'Trilha de auditoria de ações administrativas de usuários. '
    'Escrita somente pela API (service_role). Sem policies públicas: '
    'anon/authenticated não leem nem escrevem.';
comment on column public.admin_auditoria.ip_origem is
    'Endereço IP de origem da requisição administrativa (não é dado sensível do usuário).';
