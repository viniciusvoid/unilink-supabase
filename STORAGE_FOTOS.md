# UNILINK — Armazenamento de Fotos (Supabase Storage)

## Visão Geral
Todas as evidências fotográficas são armazenadas no **Supabase Storage** (S3 compatível) + metadados no Postgres. O bucket é **privado** — acesso só via URL assinada com expiração.

## Estrutura

### 1. Bucket `evidencias-chamados` (privado)
Criado em `supabase/migration_002_protocolo_evidencias_timeline.sql:170`:
```sql
insert into storage.buckets (id, name, public) values ('evidencias-chamados','evidencias-chamados', false)
```
- **Public:** `false` (não é CDN aberto)
- **Path no Storage:** `<chamado_id>/<timestamp>_<nome_sanitizado>` ex: `73c7f367-.../171613..._foto.jpg`
- **Acesso:** `supabase.storage.from('evidencias-chamados').createSignedUrl(path, 3600)` → URL válida 1h para `<img>` / lightbox.

### 2. Tabela `chamado_evidencias` (`supabase/migration_002:129`)
| Coluna | Tipo | Obs |
|--------|------|-----|
| `id` | `uuid PK` | `gen_random_uuid()` |
| `chamado_id` | `uuid FK → chamados_unilink.id` | `on delete cascade` |
| `storage_path` | `text` | `chamado_id/nome` no bucket |
| `nome_arquivo` | `text` | original `foto.jpg` |
| `tipo_mime` | `text` | `image/jpeg|png|webp` (`check`) |
| `tamanho_bytes` | `int` | `>0 and <=8388608` (8MB) |
| `enviado_por` | `uuid FK → auth.users` | `null` se abertura sem login |
| `enviado_por_nome` | `text` | `email` ou `Solicitante (sem login)` |
| `etapa` | `text` | `ABERTURA|ATENDIMENTO|RESOLUCAO` |
| `criado_em` | `timestamptz` | `now()` |

**RLS** (`migration_002:144`):
- `SELECT true` (qualquer um pode ler metadados — fotos só via URL assinada)
- `INSERT (etapa='ABERTURA' or auth.role()='authenticated')` — abertura pública, demais exige login.

**Storage Policies** (`migration_002:176`):
- `INSERT` e `SELECT` em `storage.objects` com `bucket_id='evidencias-chamados'` → `true` (metadados já controlam via RLS + URL assinada).

### 3. Fluxo no Código

**Upload `js/services/chamadosService.js:264` `uploadEvidencia(chamadoId, file, etapa)`:**
1. Valida `EXTENSOES_PERMITIDAS ['jpg','jpeg','png','webp']` e `TAMANHO_MAX_BYTES 8MB` (`_validarArquivoEvidencia:223`)
2. Sanitiza nome `file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_')` + `Date.now()`
3. `supabase.storage.from('evidencias-chamados').upload(caminho, file, {contentType})`
4. `supabase.from('chamado_evidencias').insert({chamado_id, storage_path, ... etapa})`
5. `registrarEvento(chamadoId, 'EVIDENCIA_ADICIONADA', 'Foto anexada ...')`

**Listagem `listarEvidencias(chamadoId):284`:**
```js
const { data } = await supabase.from('chamado_evidencias').select('*').eq('chamado_id', id).order('criado_em', {ascending:false});
const comUrl = await Promise.all(data.map(async ev=>{
  const { data: signed } = await supabase.storage.from('evidencias-chamados').createSignedUrl(ev.storage_path, 3600);
  return { ...ev, url: signed.signedUrl };
}));
```
Usado em `TelaAcompanhamento.js:19` (público) e `ModalDetalhes.js:158` (timeline/fotos) com lightbox `3600s`.

### 4. Telas

- **Abrir corretiva (`TelaCorretiva.js:81`)** `etapa='ABERTURA'` — até 5 fotos, sem login.
- **Concluir (`TelaPendencia.js:185`)** `etapa='RESOLUCAO'` — até 5 fotos, exige `EM_ATENDIMENTO`.
- **Acompanhamento / ModalDetalhes** — `fotos` com `url` assinada, `etapa` badge.

### 5. Operação

- **Ver no Dashboard Supabase:** Storage → `evidencias-chamados` → pastas por `chamado_id`.
- **Limite:** 5 fotos por chamado/etapa, `8MB` cada, `jpg/png/webp`.
- **Exclusão:** `on delete cascade` — ao apagar chamado, evidências e arquivos são removidos (via `storage.objects` + `chamado_evidencias`).

### 6. Troubleshooting

| Sintoma | Causa | Fix |
|---------|-------|-----|
| `Foto excede 8MB` | `_validarArquivoEvidencia` | Comprimir |
| `Bucket not found` | `migration_002` não rodada | `SQL Editor → migration_002:170` |
| `URL assinada null` | `storage_path` errado ou bucket privado sem `createSignedUrl` | Ver `listarEvidencias:298` |
| `403 Storage` | `storage.objects` policy | Rodar `migration_002:176` |

*Gerado de `supabase/migration_002_protocolo_evidencias_timeline.sql` e `js/services/chamadosService.js:223`.*
