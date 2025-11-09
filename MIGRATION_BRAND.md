# Migração: Adicionar Coluna Brand

## Problema
Erro: `Could not find the 'brand' column of 'products' in the schema cache`

## Solução

Execute o seguinte script SQL no Supabase para adicionar a coluna `brand` à tabela `products`:

### Passo a Passo:

1. Acesse o **Supabase Dashboard**
2. Vá para **SQL Editor** (no menu lateral)
3. Clique em **New Query**
4. Cole o seguinte código SQL:

```sql
-- Adicionar coluna brand (marca do produto)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand text;

-- Comentário para documentação
COMMENT ON COLUMN public.products.brand IS 'Marca do produto (ex: nike, adidas, gucci, etc.)';
```

5. Clique em **Run** ou pressione `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Verificar se funcionou:

Para confirmar que a coluna foi criada, execute:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'products' 
  AND column_name = 'brand';
```

Se retornar uma linha com `column_name = 'brand'`, a coluna foi criada com sucesso!

### Alternativa: Script Completo

Se preferir, você também pode executar o script completo que adiciona todas as colunas de especificações:

Execute o arquivo `sql/add_product_specs.sql` que já inclui a coluna `brand` junto com `sizes`, `color` e `type`.

---

**Nota:** Após executar a migração, reinicie o servidor Node.js para que as mudanças sejam reconhecidas.

