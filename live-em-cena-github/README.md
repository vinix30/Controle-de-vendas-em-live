# Live em cena

Painel para controlar cinco salas de live, apresentadoras e vendas. Esta versão usa Cloudflare Workers e D1 para compartilhar dados entre dispositivos que acessam o mesmo endereço.

## Publicar no Worker `controle-de-vendas-em-live`

1. No Cloudflare, abra **Workers & Pages → D1 SQL Database** e crie um banco chamado `live-em-cena`.
2. Copie o ID do banco e substitua `COLE_AQUI_O_ID_DO_D1` em `wrangler.jsonc` pelo ID real.
3. No console SQL do D1, execute o conteúdo de `schema.sql` para criar as tabelas e as cinco salas.
4. Publique este repositório como Worker com Wrangler (`npx wrangler deploy`) ou configure a integração do repositório no Cloudflare para publicar com Wrangler. O nome definido no arquivo é `controle-de-vendas-em-live`, correspondente ao endereço `controle-de-vendas-em-live.viniciusmarketing.workers.dev`.
5. Configure Cloudflare Access para exigir login dos integrantes da equipe antes de permitir acesso ao site. Sem essa proteção, pessoas que encontrem o endereço podem consultar ou alterar os dados.

O Worker fornece a API em `/api/state` e os arquivos do site em `public/`. A primeira abertura com o banco vazio envia para o D1 os dados que já estiverem salvos no navegador. Faça essa primeira abertura no dispositivo que contém os dados locais que deseja preservar. Os demais dispositivos passam a carregar os dados compartilhados do D1. Abrir `index.html` diretamente no computador não conecta ao banco remoto.

## Dados e funcionamento

- As vendas são registradas com valor, apresentadora, sala e data/hora.
- O histórico pode ser filtrado por sala, apresentadora e dia.
- O total geral e o saldo de cada apresentadora mostram apenas as vendas do dia local atual e passam a zero automaticamente quando a data vira.
- As vendas anteriores permanecem salvas no D1 e podem ser consultadas no histórico por dia, apresentadora ou sala.
- Os cartões das salas mostram os valores do dia e o acumulado.
- As alterações são sincronizadas ao D1; a página atualiza dados compartilhados enquanto permanece aberta.
- O navegador mantém uma cópia local para uso temporário se a API ficar indisponível. O indicador no cabeçalho mostra o estado da conexão.

## Referências Cloudflare

- [Configuração de Workers e Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Vincular D1 ao Worker](https://developers.cloudflare.com/d1/get-started/)
- [Arquivos estáticos em Workers](https://developers.cloudflare.com/workers/static-assets/)
