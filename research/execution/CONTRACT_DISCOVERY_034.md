# OPERATIONAL CONTRACT DISCOVERY (COMMIT 034)
**Date:** 2026-09-01
**Domain:** Venue-Specific Execution Research

## 1. Instrument Specification
O laboratório foi oficialmente notificado dos parâmetros do instrumento-alvo de execução final. As hipóteses genéricas abstratas estão suspensas. Qualquer nova modelagem (H005+) deverá atuar exclusivamente sob as seguintes premissas contratuais:

- **Venue**: IQ Option
- **Asset**: BTC/USD
- **Instrument Type**: Binary Option
- **Target Horizon**: 15 minutes
- **Observed Payout**: 87% ($r_t = 0.87$)

## 2. Economic Boundary
A alteração do *payout* impõe um novo limite de Breakeven, substancialmente mais favorável que os testes preliminares de 80%:
$$ P_{BE} = \frac{1}{1 + 0.87} \approx 53.4759\% $$
*Nota:* O *payout* nas opções binárias é dinâmico por natureza. O $P_{BE}$ deverá ser tratado como uma função variável no tempo $P_{BE}(t)$ baseada no `ContractObservation`, sendo 53.48% o nosso *baseline* analítico.

## 3. Signal to Contract Translation
A separação exigida na **Regra Constitucional 10** está mapeada na seguinte arquitetura:

- **Feature Timeframe**: 1m (Geração de estado microscópico).
- **Target Timeframe**: 15m (Ação do contrato).
- **Settlement Rule**: $Close_{IQO}(t+15m) \gtrless EntryPrice_{IQO}(t)$

## 4. Cross-Venue Divergence Study ($\Delta P_t$)
Antes de usarmos o feed Spot da Binance como base para reconstrução histórica, a engenharia de execução deve validar a aderência do feed da corretora:
$$ \Delta P_t = P_{IQO, t} - P_{Binance, t} $$

**Métricas a serem apuradas assim que o Recorder fornecer a amostra:**
1. Média da Divergência ($\mu_{\Delta P}$)
2. Volatilidade da Divergência ($\sigma_{\Delta P}$)
3. Correlação de retornos no horizonte de 15m ($Cor(R_{IQO}^{15m}, R_{Binance}^{15m})$)

Se a correlação em 15m convergir próxima a $1.0$ e $\sigma_{\Delta P}$ for marginal frente à variação típica de 15m do Bitcoin, autoriza-se o uso híbrido (Binance para sinal, regra IQO para liquidação). Caso contrário, a modelagem deverá ser nativa IQO.
