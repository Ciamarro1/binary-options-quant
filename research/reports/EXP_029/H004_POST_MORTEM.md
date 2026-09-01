# H004 POST-MORTEM
**Date:** 2026-09-01
**Status:** FALSIFIED FOR ECONOMIC VIABILITY

Este documento consolida os resultados do protocolo cego `029R` (Full-Sample OOS) conduzido sobre o `DATASET_005` (180 janelas).

## 1. O estado relativo é detectável?

**Sim.**

A taxa de sinais OOS válidos ficou em aproximadamente:
`16.003 / 259.200 ≈ 6.17%`

Isso demonstra que a definição empírica e não-paramétrica baseada em percentis mitigou com sucesso a *frequency starvation* (inanição estrutural) evidenciada na H003. Os limiares de cauda isolaram eventos consistentes, validando a **Detectabilidade (Nível 1)**.

## 2. O sinal mostra associação direcional?

**Há evidência observacional.**

Os resultados obtidos sobre o universo integral (180 janelas OOS) foram:
- **H004 OOS Win Rate**: 50.63%
- **Baseline Naive OOS**: 49.75%
- **Reversed Control**: 49.36%

Houve, portanto, uma vantagem OOS observada de aproximadamente **+0.88 pp** sobre o baseline concorrente no mesmo universo temporal, com simetria espelhada quase perfeita em relação ao Reversed Control. 

**Importante:** *Observed relative advantage does not constitute statistical confirmation of predictive superiority absent a formally specified comparison test.* 
A métrica relata uma observação (diagnóstico) e não uma comprovação estatística rigorosa da diferença, uma vez que a amostra da H004 e do Baseline não são pareadas (a H004 opera apenas nos eventos de cauda relativa).

## 3. Existe edge econômico para binárias?

**Não.**

O crivo econômico binário (Nível 3) impõe uma assimetria severa de *payoff*:
- $P_{BE}$ (Breakeven a 80% de Payout) = 55.56%
- Win Rate OOS alcançado = 50.63%
- Wilson Lower Bound (95% CI) = 49.85%
- Expected Value (EV) = -0.088

`50.63% < 55.56%`

## A Descoberta Central
A H004 produziu exatamente a distinção científica procurada pelo laboratório:
**Previsibilidade e monetização são problemas diferentes.**

O Estado Relativo captura o sinal observável, gera uma pequena vantagem direcional local (inexistente em *Random Walks* puros), mas essa vantagem não possui entropia direcional / inércia suficiente para atravessar o colossal *spread* de 20% do contrato binário.

## Proibição de P-Hacking
Fica estritamente proibida a calibração retrospectiva, como inferir que "bastaria adicionar um filtro para saltar os 4.93 pp restantes". A hipótese foi testada em sua plenitude, falhou economicamente e está **encerrada e arquivada**. Novas ideias exigem o pré-registro de uma H005 independente.
