# Live em Cena — Controle de vendas

Aplicação web para acompanhar as vendas de apresentadoras em até cinco salas de live. O projeto usa **Cloudflare Workers** para publicar o site e **Cloudflare D1** para guardar e compartilhar os dados entre dispositivos.

## O que o sistema faz

- Gerencia cinco salas e permite editar os nomes delas.
- Cadastra, edita, organiza e atribui apresentadoras às salas.
- Permite escolher quem está ao vivo em cada sala e trocar a ordem das apresentadoras.
- Registra vendas informando apenas o valor; o sistema guarda apresentadora, sala e horário automaticamente.
- Mostra os saldos do dia e os acumulados das salas.
- Mantém o histórico de vendas e permite filtrar por apresentadora, sala e intervalo de datas.
- Permite editar o valor de uma venda existente sem alterar a apresentadora, a sala ou o horário original.
- Exibe resultados por apresentadora em tabela e gráfico, com filtro de período.
- Permite cadastrar o WhatsApp de cada apresentadora e preparar uma mensagem individual com os resultados do período. Também prepara um resumo geral para escolher o contato ou grupo no WhatsApp.
- Abre as mensagens preenchidas no WhatsApp para revisão. O envio é manual: é preciso conferir e tocar em **Enviar**.
- Oferece a interface em português, inglês e chinês simplificado.
- Sincroniza as alterações com o D1. Se a API estiver indisponível, o navegador mantém uma cópia local temporária.

Os saldos diários usam a data local do navegador e voltam a zero quando começa um novo dia. As vendas anteriores continuam no banco e podem ser consultadas no histórico.

## Estrutura do projeto

- `public/`: arquivos do site publicados pelo Worker.
- `src/worker.js`: Worker que encaminha a API e serve os arquivos estáticos.
- `functions/api/state.js`: leitura e gravação do estado no D1.
- `schema.sql`: estrutura inicial das tabelas do banco.
- `whatsapp-migration.sql`: migração para adicionar o número de WhatsApp a um D1 já existente.
- `wrangler.jsonc`: configuração do Worker, dos arquivos estáticos e do vínculo com D1.

## Publicação no Cloudflare

### Antes de começar

É necessário ter Node.js instalado, acesso à conta Cloudflare e Wrangler autenticado. No Windows PowerShell, use `npx.cmd` nos comandos abaixo se a execução de scripts `.ps1` estiver bloqueada.

### Configuração do D1

O arquivo `wrangler.jsonc` já aponta para o banco `live-em-cena` e contém o ID configurado para este projeto. Confirme no painel Cloudflare que esse é o banco correto antes de publicar.

- **Primeira configuração de um banco vazio:** abra o D1 no painel Cloudflare, acesse o console SQL e execute o conteúdo de `schema.sql` uma única vez.
- **Banco existente, já usado pelo site:** execute o conteúdo de `whatsapp-migration.sql` uma única vez antes do deploy desta versão. Essa migração adiciona a coluna de WhatsApp e preserva as vendas existentes.

Não execute `schema.sql` sobre um banco já usado como substituto da migração. Não repita o `ALTER TABLE` depois que a coluna já tiver sido criada; o D1 retornará erro de coluna duplicada.

### Deploy pelo PowerShell

1. Abra o PowerShell na pasta deste projeto, onde está o arquivo `wrangler.jsonc`.
2. Se ainda não conectou esta instalação do Wrangler à sua conta, execute:

   ```powershell
   npx.cmd wrangler login
   ```

3. Depois de concluir a configuração do D1 acima, publique:

   ```powershell
   npx.cmd wrangler deploy
   ```

4. Aguarde a confirmação de publicação e abra o endereço do Worker para conferir o site.

O nome configurado é `controle-de-vendas-em-live`. O endereço público depende do domínio Workers da conta Cloudflare.

### Atualização do site

Depois de alterar o projeto, publique a nova versão com `npx.cmd wrangler deploy`, ou faça commit e push se o repositório estiver integrado a um pipeline de deploy automático no Cloudflare. O D1 continua sendo o mesmo; não recrie o banco nas atualizações comuns.

## Preservar e compartilhar dados

A primeira abertura do site conectado tenta sincronizar dados locais com o D1 quando o banco ainda está vazio. Faça essa primeira abertura no navegador que contém os dados locais que deseja preservar. Depois, os dispositivos que acessarem o mesmo Worker usarão os dados compartilhados do banco.

Abrir o arquivo `public/index.html` diretamente no computador serve apenas para uma prévia local; essa abertura não se conecta à API do Worker nem ao banco D1.

## Acesso e segurança

Os dados da API podem ser consultados e alterados por quem conseguir acessar o endereço, a menos que o acesso esteja protegido. Configure uma política do **Cloudflare Access** para exigir autenticação dos integrantes da equipe antes de compartilhar o endereço. Não coloque tokens ou credenciais da conta no repositório.

## Tecnologias

- HTML, CSS e JavaScript no site.
- Cloudflare Workers para servir a aplicação e sua API.
- Cloudflare D1 (SQLite) para persistência.
- Wrangler para desenvolvimento e publicação.

## Documentação oficial

- [Workers e configuração do Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Assets estáticos em Workers](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
