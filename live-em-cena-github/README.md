# Live em cena

Painel para controlar cinco salas de live, apresentadoras e vendas. Esta versão usa Cloudflare Workers e D1 para compartilhar dados entre dispositivos que acessam o mesmo endereço.

## Publicar no Worker `controle-de-vendas-em-live`

1. Use o banco D1 existente chamado `live-em-cena`. Crie um somente se ainda não existir.
2. Copie o ID desse banco e substitua `COLE_AQUI_O_ID_DO_D1` em `wrangler.jsonc`. O deploy precisa do ID real do banco.
3. Execute `schema.sql` no console SQL apenas na configuração inicial do banco. Para um banco já existente, execute uma vez `whatsapp-migration.sql` antes de publicar esta versão, para adicionar o campo de WhatsApp sem apagar dados.
4. Publique este repositório como Worker com Wrangler (`npx wrangler deploy`) ou configure a integração do repositório no Cloudflare para publicar com Wrangler. O nome definido no arquivo é `controle-de-vendas-em-live`, correspondente ao endereço `controle-de-vendas-em-live.viniciusmarketing.workers.dev`.
5. Configure Cloudflare Access para exigir login dos integrantes da equipe antes de permitir acesso ao site. Sem essa proteção, pessoas que encontrem o endereço podem consultar ou alterar os dados.

O Worker fornece a API em `/api/state` e os arquivos do site em `public/`. A primeira abertura com o banco vazio envia para o D1 os dados que já estiverem salvos no navegador. Faça essa primeira abertura no dispositivo que contém os dados locais que deseja preservar. Os demais dispositivos passam a carregar os dados compartilhados do D1. Abrir `index.html` diretamente no computador não conecta ao banco remoto.

## Dados e funcionamento

- O painel pode ser alternado entre português, inglês e chinês simplificado pelo botão de idioma.
- As vendas são registradas com valor, apresentadora, sala e data/hora.
- O histórico pode ser filtrado por sala, apresentadora e período entre data inicial e final.
- Cada venda pode ter seu valor editado pelo histórico; a alteração atualiza o registro correspondente no D1 e preserva apresentadora, sala e horário.
- A aba Resultados resume as vendas por apresentadora em um gráfico de participação e uma tabela, com filtro de período.
- O cadastro de cada apresentadora pode guardar um número de WhatsApp com DDI; números brasileiros sem DDI recebem `55` automaticamente.
- Na aba Resultados, o botão geral prepara o resumo do período para você escolher um contato ou grupo; cada linha também pode abrir uma mensagem individual para o número cadastrado.
- O WhatsApp abre com a mensagem preenchida. É necessário conferir e tocar em Enviar; o site não dispara mensagens automaticamente.
- O total geral e o saldo de cada apresentadora mostram apenas as vendas do dia local atual e passam a zero automaticamente quando a data vira.
- As vendas anteriores permanecem salvas no D1 e podem ser consultadas no histórico por dia, apresentadora ou sala.
- Os cartões das salas mostram os valores do dia e o acumulado.
- As alterações são sincronizadas ao D1; a página atualiza dados compartilhados enquanto permanece aberta.
- O navegador mantém uma cópia local para uso temporário se a API ficar indisponível. O indicador no cabeçalho mostra o estado da conexão.


## Referências Cloudflare

- [Configuração de Workers e Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Vincular D1 ao Worker](https://developers.cloudflare.com/d1/get-started/)
- [Arquivos estáticos em Workers](https://developers.cloudflare.com/workers/static-assets/)
