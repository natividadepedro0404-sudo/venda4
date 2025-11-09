# QA Checklist — Hypex

Pré-requisitos:
- Configure `.env` a partir de `.env.example`.
- Crie as tabelas no Supabase usando `sql/supabase_schema.sql`.
- Crie o bucket `product_images` em Supabase Storage.

Funcionalidade - testes manuais obrigatórios
- [ ] Registro com e-mail válido -> cria usuário e token
- [ ] Login com credenciais corretas -> retorna token
- [ ] Listagem de produtos pública
- [ ] Upload de produto (admin) com até 5 imagens -> imagens aparecem e URLs retornadas
- [ ] Carrinho: adicionar itens, marcar checkbox para pagamento
- [ ] Checkout: apenas itens marcados entram na ordem
- [ ] Endereço salvo no perfil após checkout
- [ ] Integração PIX (Efí Bank): iniciar pagamento e receber URL/QR
- [ ] Webhook: simular payment.succeeded e verificar status do pedido e envio de e-mail ao admin
- [ ] Atualizar status do pedido no admin e preencher previsão de entrega

Acessibilidade
- [ ] Todos os botões têm texto acessível
- [ ] Contraste preto/branco OK (WCAG AA para texto grande)
- [ ] Navegação por teclado (tab) para componentes interativos

Segurança
- [ ] JWT expirations e segredos corretamente configurados
- [ ] Service role key do Supabase não exposto no frontend

Edge cases
- [ ] Checkout com carrinho vazio -> mensagem de erro
- [ ] Pagamento repetido (webhook idempotência)

Logs e monitoramento
- [ ] Webhook logs gravados e erros retornam 5xx quando apropriado