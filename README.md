# STG Case — Front-end

Interface do rateio de despesas em grupo. A regra de negócio vive na API ([stg_case_back](https://github.com/Ragnavald/stg_case_back)); este projeto só apresenta e coleta dados.

Next.js 16 (App Router, Cache Components) · React 19 · Tailwind CSS 4 · SWR

## Como rodar

Com a API rodando em `http://localhost:3001` (ver README do back):

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL
npm install
npm run dev                  # http://localhost:3000
```

## Telas

| Rota | O que tem |
| --- | --- |
| `/` | Lista de grupos e criação de grupo (novas pessoas por nome ou reaproveitando quem já participa de outro grupo) |
| `/groups/[id]` → **Despesas** | Lançamento com rateio igualitário, por porcentagem, valor fixo ou pesos, com prévia ao vivo de quanto cabe a cada um |
| `/groups/[id]` → **Saldos e quitação** | Saldo de cada pessoa (gráfico divergente + tabela), comparação sem/com simplificação, plano de liquidação com "marcar como pago", histórico de pagamentos e fechamento do grupo |
| `/groups/[id]` → **Extrato individual** | Tudo o que moveu o saldo de uma pessoa, com saldo acumulado e o que ela precisa pagar ou receber para quitar |

## Decisões

- **Dinheiro como string decimal** de ponta a ponta. O front só faz contas para a prévia do rateio, em inteiros (`BigInt`) e com o mesmo método do maior resto da API, então a prévia é exatamente o que será gravado.
- **Entrada no formato brasileiro:** `1.234,56`, `100,5` e `100.50` são aceitos e normalizados antes do envio.
- **Mensagens de erro da API traduzidas** em `lib/api.ts`, mantendo a API em inglês.
- **Cores de saldo** azul (a receber) e vermelho (deve): par seguro para daltonismo, sempre acompanhado de sinal `+`/`−`.
