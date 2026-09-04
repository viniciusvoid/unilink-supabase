// ==========================================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================================
// SEGURANÇA:
// A "anon key" abaixo é uma chave PÚBLICA por design — assim como
// a apiKey do Firebase, ela é destinada a ficar no client. Ela por
// si só NÃO concede acesso a nada: quem decide o que pode ser lido,
// criado, atualizado ou apagado são as políticas de Row Level
// Security (RLS) configuradas no banco (ver supabase/schema.sql).
//
// NUNCA coloque aqui a "service_role key" — essa sim é secreta e
// ignora todo o RLS. Ela só deve existir no servidor (ver /api).
// ==========================================================

const SUPABASE_URL = "https://lylnrlybiyfoogfsnctz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bG5ybHliaXlmb29nZnNuY3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODc5NjgsImV4cCI6MjEwMzE2Mzk2OH0.5BeBVkVlzLOtO7As-adNA2vvbrxedX7CUqyRBvcMZVI";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Base da API — FRONT branch: aponte para o serviço BACKEND no Railway
// 1. Se window.API_BASE_URL estiver definido (via index.html), usa ele
// 2. Se localhost, usa :3001
// 3. Senão, usa a URL do backend (TROQUE após criar o serviço backend na Railway)
//    Ex: https://unilink-api-production.up.railway.app
const API_BASE_URL = window.API_BASE_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://unilink-api-production.up.railway.app'
);
// Fallback: se o front e a API estiverem no mesmo host com prefixo /api (Vercel), tente também
// Para Railway com 2 serviços, defina window.API_FALLBACK_URL com a URL da API
window.API_FALLBACK_URL = window.API_FALLBACK_URL || null;
// Tentativa automática: se API_BASE_URL for o front e retornar 404 HTML, ApiClient tentará API_FALLBACK_URL
if (!window.API_FALLBACK_URL && API_BASE_URL.includes('unilinkmnt-production')) {
  window.API_FALLBACK_URL = API_BASE_URL.replace('unilinkmnt-production', 'unilinkmnt-api-production');
}
