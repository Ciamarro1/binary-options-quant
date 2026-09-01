# HYPOTHESIS-003 — Multi-Timeframe Liquidity Microstructure Sweep

> **Status:** FROZEN — Pre-declared before any data exploration or OOS execution  
> **Version:** 1.0.1 (Amendment)  
> **Declared:** 2026-09-01T02:46:09Z  
> **Research Family:** MTF_LIQUIDITY_MICROSTRUCTURE
> **Experiment ID:** EXP_018_MTF_SWEEP_BTC1M_001

---

## 1. Motivação Microestrutural & Tese Econômica

Em microestrutura de mercados, os "stops" (ordens de stop-loss de compras e vendas) tendem a se agrupar acima de topos estruturais e abaixo de fundos estruturais de tempos gráficos maiores (HTF). 

A hipótese parte da premissa de que regiões de extremos estruturais podem concentrar liquidez e apresentar comportamento de reversão após violações sem sustentação.

A hipótese econômica de **Liquidity Sweep**:

> Quando o preço em um tempo menor (1m) fura (sweeps) uma região de liquidez estrutural de tempo maior (15m), mas falha em sustentar o rompimento, retornando e fechando dentro da estrutura, ocorre um vácuo de liquidez no book. Alinhando essa exaustão direcional local (LTF) com a tendência macro dominante (1h), a probabilidade de reversão rápida (horizonte de 3 candles de 1m) supera a barreira econômica do payout ($P_{BE} = 55.56\%$).

O objetivo é testar se o Contexto MTF (Multi-Timeframe) adicionado a um gatilho de microestrutura LTF fornece o edge econômico que faltou nas assinaturas puramente cinemáticas isoladas de 1m (Família 1).

---

## 2. Definição Causal de Features

Todas as features de tempos gráficos maiores (15m e 1h) são sintetizadas a partir do array base de 1m, com **causalidade estrita**. O estado de uma feature HTF só é atualizado quando a janela de 1m correspondente fecha o ciclo completo do HTF.

### Features Obrigatórias:

| Feature | Definição Matemática | Janela Temporal |
|---|---|---|
| $SMA1h_{50,t}$ | $\frac{1}{50}\sum_{i=1}^{50} \text{close\_1h}_{t-i}$ | 50 candles de 1h (totalmente fechados) |
| $SwingHigh15m_{t}$ | $\max(\text{high\_15m})$ nos últimos 96 candles | 96 candles de 15m (24 horas fechadas) |
| $SwingLow15m_{t}$  | $\min(\text{low\_15m})$ nos últimos 96 candles | 96 candles de 15m (24 horas fechadas) |

### Contrato Formal de Fronteira Temporal `HTF_CANDLE_CLOSED_BEFORE(t)`:
Não haverá look-ahead intrabar. O motor utilizará a seguinte matriz de resolução para um sinal no candle de 1m de tempo de abertura $t$:

| LTF timestamp ($t$) | último 15m disponível | último 1h disponível |
| ------------------- | --------------------- | -------------------- |
| 14:14               | 14:00                 | 13:00                |
| 14:15               | 14:00                 | 13:00                |
| 14:29               | 14:15                 | 13:00                |
| 14:30               | 14:15                 | 13:00                |
| 14:59               | 14:45                 | 13:00                |
| 15:00               | 14:45                 | 14:00                |

*(Qualquer timestamp "14:32", por exemplo, estritamente lerá o estado consolidado no 15m das 14:15 e do 1h das 13:00).*

---

## 3. Regras de Entrada Determinísticas (Pré-Declaradas)

### Setup 1: MTF SWEEP-UP $\longrightarrow$ PUT (Short)
Buscamos "vender" um sweep de topo alinhado com uma macro tendência de baixa.
Disparado quando **todas** as condições são simultaneamente verdadeiras:
1. **Bias (1h):** $\text{close\_1m}_t < SMA1h_{50,t}$ (Tendência Macro de Baixa)
2. **Sweep (LTF):** $\text{high\_1m}_t > SwingHigh15m_{t}$ (Fura a liquidez de topo)
3. **Reclaim (LTF):** $\text{close\_1m}_t < SwingHigh15m_{t}$ (Falha em manter, rejeição)

### Setup 2: MTF SWEEP-DOWN $\longrightarrow$ CALL (Long)
Buscamos "comprar" um sweep de fundo alinhado com uma macro tendência de alta.
Disparado quando **todas** as condições são simultaneamente verdadeiras:
1. **Bias (1h):** $\text{close\_1m}_t > SMA1h_{50,t}$ (Tendência Macro de Alta)
2. **Sweep (LTF):** $\text{low\_1m}_t < SwingLow15m_{t}$ (Fura a liquidez de fundo)
3. **Reclaim (LTF):** $\text{close\_1m}_t > SwingLow15m_{t}$ (Falha em manter, rejeição)

### NO SIGNAL:
Se qualquer critério não for satisfeito ou se as features HTF não tiverem período warm-up suficiente (estado `null`).

---

## 4. Target & Resolução de Contratos

- **Expiração Pré-Declarada:** $3\text{ candles}$ de 1m ($180\text{ segundos}$).
- **Preço de Entrada:** $\text{close\_1m}_t$
- **Preço de Saída:** $\text{close\_1m}_{t+3}$
- **Resolução:**
  - $\text{CALL WIN} \iff \text{close\_1m}_{t+3} > \text{close\_1m}_t$
  - $\text{PUT WIN} \iff \text{close\_1m}_{t+3} < \text{close\_1m}_t$
  - $\text{PUSH} \iff \text{close\_1m}_{t+3} == \text{close\_1m}_t$ (estritamente excluído de $P\_win$)
- **Sinais Sobrepostos:** Resolvidos independentemente.

---

## 5. Modelo Probabilístico (Conditional Historical Probability)

$$P\_win = P(\text{WIN} \mid \text{resolved, non-PUSH})$$

Para cada janela de teste OOS, a probabilidade condicional é estimada **exclusivamente na janela de TRAIN correspondente**:

1. **Fórmula:** $\hat{P}(\text{WIN} \mid \text{direction}) = \frac{\text{Wins}_{\text{Train, dir}}}{\text{Wins}_{\text{Train, dir}} + \text{Losses}_{\text{Train, dir}}}$
2. **Exigência Amostral Mínima no TRAIN:** Exige-se $N_{\text{Train, dir}} \ge 30$ sinais resolvidos no TRAIN daquela direção específica.
3. **Regra de Ausência de Probabilidade (*Fail-Closed*):**
   $$\text{Se } N_{\text{Train, dir}} < 30 \implies \text{Probability} = \text{null} \implies \mathbf{NO\_SIGNAL}$$
4. **Congelamento:** O $\hat{P}$ calculado permanece estritamente congelado durante o TEST associado.

---

## 6. Parâmetros Congelados

```text
HTF Trend Period           = 50 horas (1h resolution)
HTF Structure Lookback     = 96 candles (15m resolution, 24h)
Expiry                     = 3 candles (180 segundos)
Payout                     = 0.80
Break-Even Win Rate (P_BE) = 55.5556%
Min Train Setup Samples    = 30
```

> **VEDAÇÃO ABSOLUTA DE TUNING:** Nenhum grid search ou ajuste pós-hoc de tempos gráficos ou períodos é permitido.

---

## 7. Dataset de Execução (`DATASET_004`)

Para garantir um experimento cego (blind experiment), o período selecionado não possui **absolutamente nenhuma interseção** com as amostras utilizadas na `HYPOTHESIS_001` ou `HYPOTHESIS_002` (que usaram Fev–Mai e Jun–Set 2024).

| Campo | Especificação |
|---|---|
| **Ativo** | `BTCUSDT Spot` |
| **Timeframe** | $1\text{m}$ (Base para sintetização MTF) |
| **Período** | $2024\text{-}10\text{-}01 \to 2025\text{-}03\text{-}31$ (6 meses / 182 dias) |
| **Total de Candles** | $182 \times 1440 = 262.080\text{ candles}$ |
| **Fonte** | Binance Public Data Archive (klines spot mensais) |
| **Contaminação** | $0\%$ (Totalmente independente) |

---

## 8. Protocolo Walk-Forward & Contagem de Janelas

```text
Estrutura:           Walk-Forward rolling diário
Tamanho do Train:    43.200 candles (30 dias)
Tamanho do Test:     1.440 candles (1 dia)
Passo (Step):        1.440 candles (1 dia)
Total de Janelas:    152 janelas OOS (182 - 30 - 1 + 1 = 152)
```

---

## 9. Baseline de Controle Concorrente (`BASELINE_004_CONTROL`)

A H003 será avaliada contra o `BASELINE_004_CONTROL`:
- Executado no **`DATASET_004`**;
- Nas **mesmas 152 janelas OOS**;
- Mesmo target de **3 candles / 180s** e payout **0.80**.

---

## 10. Critérios de Aceitação (Todos Obrigatórios)

Para aprovação pelo CRO, a estratégia deve satisfazer simultaneamente:
1. $W_{\text{low}} (95\% \text{ Wilson}) > P_{BE} = 55.5556\%$;
2. $\text{Win Rate (H003)} > \text{Win Rate (BASELINE\_004\_CONTROL)}$;
3. $\text{Expected Value } (EV) > 0.0000$;
4. $N_{\text{OOS}} \ge 30$ sinais resolvidos globalmente;
5. Aprovação na bateria adversarial.

---

## 11. Bateria Adversarial & Critérios de Falsificação

1. **MTF Historical Invariance Test (Novo):** Alteração randômica extrema do candle de 15m e 1h **atual (não-fechado)**, verificando que o sinal de 1m correspondente permanece perfeitamente inalterado (prova de causalidade MTF restrita).
2. **Controle Negativo Invertido (*Reversed Control*):** Comprar topos no downtrend e vender fundos no uptrend. Deve perder/falhar economicamente, validando a assimetria direcional da liquidez.
3. **Controle de Rótulos Aleatorizados:** Permutação de wins/losses deve colapsar EV.
4. **Controle Nulo Sintético (Mulberry32 PRNG):** Caminho aleatório = 50.0%.

---

## 12. Declaração de Integridade & Linhagem Experimental

> Este documento foi redigido e congelado em resposta direta ao mandato conceitual `RESEARCH_FAMILY_02`, antes de qualquer ingestão do `DATASET_004`. A síntese de múltiplos tempos gráficos ocorrerá obrigatoriamente sem look-ahead intrabar, isolada em uma amostra completamente virgem.
