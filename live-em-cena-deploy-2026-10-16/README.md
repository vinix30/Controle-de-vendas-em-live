# Live em Cena — Controle de vendas

Painel web para organizar as apresentadoras e acompanhar as vendas de cinco salas de live. O site é publicado no Cloudflare Workers e usa Cloudflare D1 para compartilhar os dados entre dispositivos.

## Funcionalidades

- Login com usuários e senha; sessão protegida por cookie seguro.
- Perfil **Administrador**, com acesso às salas, histórico, resultados, apresentadoras e gerenciamento de contas.
- Perfil **Lançador de vendas**, com uma tela simples para informar o valor e escolher a apresentadora. Esse perfil não pode editar cadastros, contas ou vendas existentes.
- Cada venda registra automaticamente apresentadora, sala, data, horário e usuário que fez o lançamento.
- Controle de cinco salas, edição do nome da sala, atribuição e troca de apresentadoras ao vivo.
- Saldos diários que reiniciam quando começa outro dia; o histórico permanece salvo no D1.
- Histórico com filtros por sala, apresentadora e intervalo de datas. O administrador pode corrigir o valor de uma venda sem modificar a data, o horário, a sala ou o usuário que lançou.
- Relatório por apresentadora em tabela e gráfico, com filtro de datas e compartilhamento manual pelo WhatsApp.
- Interface em português, inglês e chinês simplificado.
- Cópia local temporária caso a API esteja indisponível.

## Arquivos principais

- `public/`: site publicado.
- `src/worker.js`: rotas da API e controle de acesso.
- `functions/api/auth.js`: login, sessões, criação de usuários e registro autenticado de vendas.
- `functions/api/state.js`: leitura e gravação de salas, apresentadoras e vendas.
- `schema.sql`: estrutura inicial do banco D1.
- `auth-migration.sql`: adiciona as tabelas de usuários/sessões e a identificação de quem lançou cada venda a um banco existente.
- `whatsapp-migration.sql`: adiciona o campo de WhatsApp a uma versão anterior do banco, se ainda não tiver sido aplicado.
- `wrangler.jsonc`: configuração do Worker e do banco D1.

## Atualização do banco existente

Antes de publicar esta versão, faça uma cópia de segurança do banco D1. No painel Cloudflare, abra o banco `live-em-cena` e execute o conteúdo de `auth-migration.sql` no console SQL. A migração preserva as vendas e os demais dados existentes.

Se o campo de WhatsApp ainda não tiver sido criado em seu banco, execute também `whatsapp-migration.sql` uma vez. Não execute novamente um `ALTER TABLE` cuja coluna já exista: o banco retornará erro de coluna duplicada.

Para uma instalação nova, execute `schema.sql` uma única vez no banco vazio. Não use `schema.sql` para substituir migrações em um banco que já contém dados.

## Configurar e publicar

1. Instale o Node.js e abra o PowerShell na pasta deste projeto, onde está `wrangler.jsonc`.
2. Confira se `wrangler.jsonc` aponta para o banco D1 correto (`database_name` e `database_id`).
3. Se esta instalação ainda não está conectada à conta Cloudflare, execute:

   ```powershell
   npx.cmd wrangler login
   ```

4. Defina um código secreto temporário para criar o primeiro administrador. O Wrangler solicitará o valor no terminal:

   ```powershell
   npx.cmd wrangler secret put BOOTSTRAP_SECRET
   ```

5. Depois de aplicar as migrações D1 necessárias, publique:

   ```powershell
   npx.cmd wrangler deploy
   ```

6. Acesse o endereço do Worker. Na tela de login inicial, informe o código `BOOTSTRAP_SECRET` configurado no passo 4 e escolha o nome de usuário e senha do administrador. O nome de usuário aceita letras, números, ponto, hífen e sublinhado; a senha precisa ter no mínimo 10 caracteres.
7. Depois que a conta de administrador for criada, apague o segredo temporário:

   ```powershell
   npx.cmd wrangler secret delete BOOTSTRAP_SECRET
   ```

8. Entre como administrador, abra **Acessos** e crie uma conta com o perfil **Lançador de vendas** para cada pessoa que fará lançamentos.

No Windows PowerShell, `npx.cmd` evita o bloqueio de execução de arquivos `.ps1`. O nome do Worker nesta configuração é `controle-de-vendas-em-live`.

## Perfis

**Administrador:** configura salas e apresentadoras, controla quem está ao vivo, acessa relatórios e histórico, edita valores de venda e cria ou remove contas de acesso.

**Lançador de vendas:** entra em uma tela própria e registra valores para as apresentadoras cadastradas. O servidor valida o perfil e grava o usuário responsável; esconder opções na interface não é a única proteção. A tela de lançamento não apresenta o histórico completo.

## Segurança e observações

- A senha nunca é salva em texto puro: o Worker deriva um hash com salt usando PBKDF2 e armazena somente o hash e o salt no D1.
- O cookie de sessão é `HttpOnly`, `Secure` e `SameSite=Strict`, com validade de sete dias.
- O primeiro administrador só pode ser criado uma vez. O código de bootstrap deve ser removido após a configuração inicial.
- Faça backup do D1 antes de migrações ou atualizações importantes e nunca salve credenciais Cloudflare no repositório.
- Abrir `public/index.html` diretamente no computador não conecta ao D1; para usar login, acesse o endereço publicado no Worker.
- As mensagens do WhatsApp são apenas preparadas no aplicativo. O usuário precisa revisar e tocar em **Enviar**.

## Documentação Cloudflare

- [Workers e configuração Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [D1 e comandos Wrangler](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Migrações D1](https://developers.cloudflare.com/d1/reference/migrations/)
- [Web Crypto API no Workers](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
