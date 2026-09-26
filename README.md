# Live em cena

Painel estático para controle de cinco salas independentes de live. Permite atribuir apresentadoras a salas, renomear as salas, escolher quem está em cena em cada sala, registrar várias vendas por apresentadora, consultar o histórico filtrado por sala ou pessoa e reorganizar a equipe com as setas. Cadastros, nomes das salas, ordem, atribuições, vendas e estado da sessão são salvos no armazenamento local do navegador.

## Publicar no Cloudflare Pages

1. Envie o conteúdo da pasta `site` para um repositório Git, ou faça upload da pasta em um projeto Cloudflare Pages.
2. Se conectar um repositório, configure o diretório de saída como `.` e deixe o comando de build em branco.
3. Publique. O arquivo `index.html` é a página inicial.

## Observação

Este protótipo não controla o software de transmissão nem sincroniza alterações entre dispositivos. Para uma equipe compartilhar o controle ao mesmo tempo, será necessário adicionar um serviço de dados e autenticação.
