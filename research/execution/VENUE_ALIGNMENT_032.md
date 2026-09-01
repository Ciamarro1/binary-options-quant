# VENUE ALIGNMENT MANDATE (COMMIT 032)
**Date:** 2026-09-01
**Domain:** Head of Execution / Reconciliation Engineering

## 1. O Abismo de Execução (The Execution Gap)
O laboratório reconhece formalmente um viés estrutural na cadeia de pesquisa conduzida até a Hipótese H004:
A presunção de que o mercado de referência (Binance Spot) espelha com fidelidade atômica o mercado de liquidação (IQ Option Binary Contracts).

Para horizontes temporais de ultra-curto prazo (1m a 3m), divergências de *feed*, *spread*, e latência não são fricções marginais — elas são determinantes absolutos de falência ou sucesso econômico. Ademais, em instrumentos OTC (*Over-The-Counter*), os algoritmos internos da corretora substituem a microestrutura global, tornando o modelo da Binance operacionalmente alienígena ao contrato executado.

A nova lei do laboratório é a equação da Fidelidade de Execução:
$$ Market\ Signal \rightarrow Venue\ Signal \rightarrow Contract\ Outcome \rightarrow Economic\ Edge $$

## 2. Separação de Domínios
A partir deste *commit*, o laboratório é bipartido:
1. **Reference Market Research (Binance)**: Pesquisa fundamental, provas de conceito teóricas, meta-análise e *benchmarking* (Abrange H001 a H004).
2. **Venue-Specific Execution Research (IQ Option)**: O espelho digital da corretora. Único ambiente autorizado a produzir métricas de EV (Expected Value) e Vereditos Econômicos finais para produção.

## 3. O Questionário de Reconciliação (The 10-Point Checklist)
Antes da formulação de qualquer nova hipótese preditiva (H005), a Engenharia de Execução deve mapear e cristalizar as seguintes respostas sobre o contrato-alvo:

1. **Asset Nature**: O ativo alvo é *Spot* global, derivativo ou OTC algorítmico?
2. **Instrument Specs**: Qual é a exata identificação do instrumento na *venue*?
3. **Liquidation Feed**: Qual provedor de liquidez/feed específico determina o preço final?
4. **Entry Price**: O preço de entrada sofre *slippage* ou incorpora *bid/ask spread* visível?
5. **Expiry Price**: A expiração é calculada no milissegundo do *timer* ou no fechamento estático de uma vela?
6. **Clock/Timestamping**: Qual é a dessincronização entre o relógio da *Venue* (NTP próprio) e o UTC padrão?
7. **Candle Construction**: Como a corretora constrói o agrupamento OHLCV (amostragem tick-a-tick, volume sintético)?
8. **Dynamic Payout**: O payout $r_t$ é estático ou dinâmico? Qual a banda de variação?
9. **Push Treatment**: Empates matemáticos devolvem 100% da margem ou penalizam com taxa?
10. **Historical Provenance**: Qual a profundidade e formato dos dados históricos/tick-a-tick fornecidos oficialmente pela *Venue*?

## 4. O Road-Map Operacional
- **032**: Venue Alignment (Este documento).
- **033**: IQ Option Data Acquisition (Implementação de um gravador/coletor RAW de *websockets* ou API).
- **034**: IQ Option Contract Specification (Modelagem do contrato binário no código, com *payout* dinâmico e regras de *push* reais).
- **035**: Venue-Specific Baseline (Execução do random-walk sobre os dados coletados).
- **036**: Venue Adversarial Validation (Testes de estresse no espelho digital).

Somente após a consolidação do Commit 036, a pesquisa teórica voltará a focar na criação de *Alphas* preditivos (H005).
