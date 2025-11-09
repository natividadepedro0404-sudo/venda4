-- Tabela para configurações do site editáveis pelo admin
create table if not exists public.site_settings (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  value text,
  type text default 'text',
  description text,
  updated_at timestamptz default now(),
  updated_by uuid references public.users(id)
);

-- Inserir configurações padrão
insert into public.site_settings (key, value, type, description) values
  ('announcement_text', 'Frete grátis em compras acima de R$ 199', 'text', 'Texto do banner de anúncio no topo do site'),
  ('hero_banner_title', 'Nova Coleção', 'text', 'Título do banner principal'),
  ('hero_banner_subtitle', 'Até 70% OFF + 20% no primeiro pedido', 'text', 'Subtítulo do banner principal'),
  ('hero_banner_background', '', 'image', 'URL da imagem de background do banner principal')
on conflict (key) do nothing;

-- Índice para busca rápida
create index if not exists idx_site_settings_key on public.site_settings(key);

