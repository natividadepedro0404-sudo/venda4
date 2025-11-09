# Hypex — Loja (esqueleto)

Projeto mínimo de e-commerce chamado Hypex. Tem frontend estático (HTML/CSS/JS) e backend Node/Express integrado ao Supabase.

Rápido:

1. Copie `.env.example` para `.env` e preencha variáveis (SUPABASE_*, SMTP, EFIBANK_*).
2. Instale dependências: npm install
3. Crie as tabelas em Supabase com `sql/supabase_schema.sql` e crie o bucket `product_images` no Storage.
4. Inicie o servidor: npm run dev

Observações:
- Integração Efí Bank é demonstrativa — ajuste endpoints e validade do webhook conforme documentação real do provedor.
- Proteja a service_role key e use políticas RLS quando mover para produção.