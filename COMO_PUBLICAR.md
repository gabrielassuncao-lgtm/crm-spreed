# Como colocar o CRM no ar

O app já está pronto e testado (o build passou sem erro). Faltam 2 passos: criar o banco de dados (Supabase) e publicar o site (Vercel). Os dois são gratuitos para esse uso.

## Passo 1 — Criar o banco de dados no Supabase

1. Acesse https://supabase.com e crie uma conta (pode ser com Google).
2. Clique em "New project". Dê um nome (ex: crm-spreed), escolha uma senha de banco (guarde ela) e a região mais próxima (São Paulo, se disponível).
3. Espere o projeto ser criado (leva ~2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase-schema.sql` (está nessa pasta), copie todo o conteúdo, cole no editor e clique em **Run**.
6. Vá em **Settings** → **API**. Copie dois valores:
   - **Project URL**
   - **anon public key**

## Passo 2 — Configurar o projeto

1. Abra o arquivo `.env.example`, duplique-o e renomeie a cópia para `.env`.
2. Cole os valores que você copiou do Supabase:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-aqui
   ```

## Passo 3 — Publicar no Vercel

Forma mais simples (sem linha de comando):

1. Suba essa pasta inteira para um repositório no GitHub (crie uma conta em github.com se não tiver, crie um novo repositório, e faça upload dos arquivos por lá mesmo, direto no navegador).
2. Acesse https://vercel.com, crie conta com o GitHub.
3. Clique em **Add New → Project**, selecione o repositório que você acabou de criar.
4. Antes de clicar em Deploy, vá em **Environment Variables** e adicione as mesmas duas variáveis do `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Clique em **Deploy**. Em ~1 minuto você recebe uma URL tipo `crm-spreed.vercel.app`.

## Passo 4 — Criar os acessos

1. Abra a URL gerada, clique em "Criar agora", cadastre seu e-mail e senha.
2. Se no Supabase a confirmação de e-mail estiver ativada por padrão (é o padrão), você vai receber um e-mail de confirmação — confirme antes de tentar entrar. Se quiser desativar essa confirmação (mais rápido para uso interno), vá em Supabase → **Authentication → Providers → Email** e desligue "Confirm email".
3. Mande a URL para sua parceira. Ela cria a própria conta do mesmo jeito, e já vai ver os mesmos funis e cards que você — os dados são compartilhados entre todos que têm login.

## Se quiser um domínio próprio (ex: crm.suaempresa.com.br)

No painel do Vercel, vá em **Settings → Domains** do projeto e adicione seu domínio, seguindo as instruções de DNS que aparecem lá. Isso é opcional — a URL `.vercel.app` já funciona perfeitamente sozinha.

---

Qualquer erro na tela durante os testes, me manda print que eu ajudo a resolver.
