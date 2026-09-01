# HYPOTHESIS-002 — Short-Horizon Mean-Reversion / Exhaustion

> **Status:** FROZEN — Pre-declared before any data exploration or OOS execution  
> **Version:** 1.0.0  
> **Declared:** 2026-08-31  
> **Parent Hypothesis:** HYPOTHESIS_001 (Lineage: Conceptual departure from falsified momentum thesis; independent parameter specification)  
> **Experiment ID:** EXP_010_EXHAUSTION_BTC1M_2024_06_09 (to be assigned at execution)

---

## 1. Motivação Microestrutural & Tese Econômica

Em microestrutura de mercados e formação de preços em alta frequência (1 minuto), movimentos direcionais anormalmente esticados que fecham na extrema extremidade do candle e são acompanhados por volume incomum frequentemente representam **exaustão de liquidez agressiva** (aggressor exhaustion) e impacto de ordens a mercado contra livros de ofertas profundos (iceberg / resting limit orders).

A hipótese econômica é de **Exaustão e Reversão à Média**:

> Quando um candle recente de 1 minuto apresenta amplitude extrema em relação à volatilidade recente ($|C_t - O_t| \ge 2.0 \times \text{ATR}_{14}$), fechamento encostado na máxima/mínima ($\text{closeLocation} \ge 0.90$ ou $\le 0.10$), e expansão severa de volume ($V_t \ge 2.0 \times \text{SMA}_{20}$), a probabilidade de reversão direcional em um horizonte curto ($3\text{ candles} = 180\text{s}$) supera a barreira econômica do payout ($P_{BE} = 55.56\%$).

O objetivo é testar se essa anomalia estrutural produz evidência estatística e econômica superior ao **Baseline de Controle Concorrente (BASELINE_003_CONTROL)** no mesmo universo temporal.

---

## 2. Definição Causal de Features

Apenas informação disponível **estritamente até o fechamento do candle de entrada** ($t$).

### Features Obrigatórias:

| Feature | Definição Matemática | Janela Temporal |
|---|---|---|
| $\text{bodyRatio}_t$ | $\frac{|\text{close}_t - \text{open}_t|}{\text{ATR}_{14,t}}$ | 14 candles (Wilder's RMA) |
| $\text{closeLocation}_t$ | $\frac{\text{close}_t - \text{low}_t}{\text{high}_t - \text{low}_t}$ (se $\text{high}_t == \text{low}_t \implies \text{null}$) | 1 candle |
| $\text{volumeRatio}_t$ | $\frac{\text{volume}_t}{\frac{1}{20}\sum_{i=1}^{20} \text{volume}_{t-i}}$ | 20 candles anteriores ($t-20 \dots t-1$) |
| $\text{signedReturn}_t$ | $\frac{\text{close}_t}{\text{open}_t} - 1$ | 1 candle |

### Tratamento de Indefinição Matemática (Divisão por Zero):
- Se $\text{high}_t == \text{low}_t \implies \text{closeLocation}_t = \text{null}$.
- Se $\text{closeLocation}_t == \text{null} \implies \text{NO SIGNAL}$ (sem imputação arbitrária de valores).

---

## 3. Regras de Entrada Determinísticas (Pré-Declaradas)

### Setup 1: EXHAUSTION-UP $\longrightarrow$ PUT
Disparado quando **todas** as condições são simultaneamente verdadeiras:
1. $\text{close}_t > \text{open}_t$ (candle de alta)
2. $\text{bodyRatio}_t \ge 2.0$
3. $\text{closeLocation}_t \ge 0.90$ (fechamento nos 10% superiores do range)
4. $\text{volumeRatio}_t \ge 2.0$

### Setup 2: EXHAUSTION-DOWN $\longrightarrow$ CALL
Disparado quando **todas** as condições são simultaneamente verdadeiras:
1. $\text{close}_t < \text{open}_t$ (candle de baixa)
2. $\text{bodyRatio}_t \ge 2.0$
3. $\text{closeLocation}_t \le 0.10$ (fechamento nos 10% inferiores do range)
4. $\text{volumeRatio}_t \ge 2.0$

### NO SIGNAL:
Se qualquer critério não for satisfeito ou qualquer indicador for $\text{null}$. Sem segundas tentativas.

---

## 4. Target & Resolução de Contratos

- **Expiração Pré-Declarada:** $3\text{ candles}$ ($180\text{ segundos}$).
- **Preço de Entrada:** $\text{close}_t$
- **Preço de Saída:** $\text{close}_{t+3}$
- **Resolução:**
  - $\text{CALL WIN} \iff \text{close}_{t+3} > \text{close}_t$
  - $\text{PUT WIN} \iff \text{close}_{t+3} < \text{close}_t$
  - $\text{PUSH} \iff \text{close}_{t+3} == \text{close}_t$ (estritamente excluído de $P\_win$)
- **Sinais Sobrepostos:** Sinais consecutivos em $t, t+1, t+2$ são emitidos e resolvidos independentemente em $t+3, t+4, t+5$.

---

## 5. Modelo Probabilístico (Conditional Historical Probability)

$$P\_win = P(\text{WIN} \mid \text{resolved, non-PUSH})$$

Para cada janela de teste OOS, a probabilidade condicional é estimada **exclusivamente na janela de TRAIN correspondente**:

1. **Fórmula:** $\hat{P}(\text{WIN} \mid \text{direction}) = \frac{\text{Wins}_{\text{Train, dir}}}{\text{Wins}_{\text{Train, dir}} + \text{Losses}_{\text{Train, dir}}}$
2. **Exigência Amostral Mínima no TRAIN:** Exige-se $N_{\text{Train, dir}} \ge 30$ sinais resolvidos no TRAIN daquela direção específica.
3. **Regra de Ausência de Probabilidade (*Fail-Closed*):**
   $$\text{Se } N_{\text{Train, dir}} < 30 \implies \text{Probability} = \text{null} \implies \mathbf{NO\_SIGNAL}$$
   *(Não há fabricação de probabilidade arbitrária nem fallback artificial de 0.50).*
4. **Congelamento:** O $\hat{P}$ calculado no fechamento do TRAIN permanece estritamente congelado durante toda a janela de TEST associada.

---

## 6. Parâmetros Congelados

```text
ATR Period                 = 14 candles (Wilder's RMA)
Volume Lookback            = 20 candles (t-20..t-1)
Body Ratio Threshold       = 2.0 (x ATR_14)
Upper Close Location       = >= 0.90
Lower Close Location       = <= 0.10
Volume Ratio Threshold     = 2.0 (x SMA_20)
Expiry                     = 3 candles (180 segundos)
Payout                     = 0.80
Break-Even Win Rate (P_BE) = 55.5556%
Min Train Setup Samples    = 30
```

> **VEDAÇÃO ABSOLUTA DE TUNING:** Nenhum grid search, sweep de thresholds ou ajuste pós-hoc é permitido.

---

## 7. Dataset de Execução (`DATASET_003`)

| Campo | Especificação |
|---|---|
| **Ativo** | `BTCUSDT Spot` |
| **Timeframe** | $1\text{m}$ |
| **Período** | $2024\text{-}06\text{-}01 \to 2024\text{-}09\text{-}30$ (4 meses / 122 dias) |
| **Total de Candles** | $122 \times 1440 = 175.680\text{ candles}$ |
| **Fonte** | Binance Public Data Archive (klines spot mensais) |
| **Isolamento** | Dataset 100% não-contaminado e independente do DATASET_001 e DATASET_002 |

---

## 8. Protocolo Walk-Forward & Contagem de Janelas

```text
Estrutura:           Walk-Forward rolling diário
Tamanho do Train:    10.080 candles (7 dias)
Tamanho do Test:     1.440 candles (1 dia)
Passo (Step):        1.440 candles (1 dia)
Total de Janelas:    115 janelas OOS (122 - 7 - 1 + 1 = 115)
```

---

## 9. Baseline de Controle Concorrente (`BASELINE_003_CONTROL`)

Para eliminar viés temporal, a H002 será avaliada concorrentemente contra o `BASELINE_003_CONTROL`:
- Executado exatamente no **`DATASET_003`**;
- Exatamente nas **mesmas 115 janelas OOS**;
- Exatamente no **mesmo target de expiração (3 candles / 180s)**;
- Exatamente no **mesmo payout (0.80)**.

---

## 10. Critérios de Aceitação (Todos Obrigatórios)

Para aprovação pelo CRO, a estratégia deve satisfazer simultaneamente:
1. $W_{\text{low}} (95\% \text{ Wilson}) > P_{BE} = 55.5556\%$;
2. $\text{Win Rate (H002)} > \text{Win Rate (BASELINE\_003\_CONTROL)}$;
3. $\text{Expected Value } (EV) > 0.0000$;
4. $N_{\text{OOS}} \ge 30$ sinais resolvidos;
5. Estabilidade inter-janelas (edge verificado em $\ge 50\%$ das janelas com sinais);
6. Aprovação na bateria adversarial.

---

## 11. Bateria Adversarial & Critérios de Falsificação

### Controles Negativos Obrigatórios:
1. **Controle Negativo Invertido (*Reversed Control*):**
   - $\text{EXHAUSTION-UP} \longrightarrow \text{CALL}$
   - $\text{EXHAUSTION-DOWN} \longrightarrow \text{PUT}$
   - **Critério de Falsificação:** O controle invertido **não pode** satisfazer os critérios econômicos de aceitação da H002. Se o controle invertido também apresentar $W_{\text{low}} > P_{BE}$ ou desempenho igual/superior à H002, a hipótese é **FALSIFICADA** por ausência de assimetria direcional.
2. **Controle de Rótulos Aleatorizados (*Label Permutation*):** Outcomes embaralhados devem colapsar o edge para $EV \le 0$.
3. **Controle Nulo Sintético (Mulberry32 PRNG):** Random walk puro deve produzir $\text{Win Rate} \approx 50.0\%$.
4. **Teste de Fuzzing de Divisão por Zero:** Candles com $\text{high} == \text{low}$ devem produzir `closeLocation = null` e `NO SIGNAL`.

---

## 12. Declaração de Integridade & Linhagem Experimental

> Este documento foi redigido e congelado antes de qualquer download, inspeção ou teste de dados de Junho a Setembro de 2024.
> 
> A linhagem com a hipótese anterior está formalmente registrada:
> $\text{HYPOTHESIS\_001 (FALSIFIED)} \longrightarrow \text{HYPOTHESIS\_002 (EXHAUSTION TENTATIVE)}$
