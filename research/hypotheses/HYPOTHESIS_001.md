# HYPOTHESIS-001 — Short-Horizon Momentum / Displacement

> **Status:** FROZEN — Pre-declared before any OOS execution  
> **Version:** 1.0.0  
> **Declared:** 2026-08-30  
> **Experiment ID:** HYPOTHESIS_001_OOS_001 (to be assigned at execution)

---

## 1. Motivação Microestrutural

Em horizontes muito curtos, movimentos recentes suficientemente fortes podem apresentar **persistência de direção por alguns candles**, especialmente quando existe deslocamento de preço acompanhado de expansão de atividade.

A hipótese não é "BTC sobe porque subiu".

É mais específica:

> Quando o candle recente apresenta deslocamento direcional anormal em relação ao comportamento imediatamente anterior, a probabilidade de continuação no próximo intervalo pode superar a taxa necessária para o payout.

O objetivo é testar se existe **informação incremental além do Baseline Naive (BASELINE_OOS_001)**.

---

## 2. Sinal

Apenas informação disponível **até o fechamento do candle de entrada** (`t`).

### Features permitidas

| Feature | Definição | Janela |
|---|---|---|
| `r_t` | Retorno do candle: `close_t / open_t - 1` | 1 candle |
| `body_t` | Tamanho absoluto do corpo: `abs(close_t - open_t)` | 1 candle |
| `ATR_t` | Average True Range (período = 14) | 14 candles |
| `displacementRatio` | `body_t / ATR_t` | derivada |
| `volumeRatio` | `volume_t / mean(volume_{t-20..t-1})` | 20 candles |

### Feature central

```
displacementRatio = |close_t - open_t| / ATR_t
```

O sinal só existe quando o deslocamento é suficientemente grande em relação à volatilidade recente.

---

## 3. Target

**Expiração: 1 candle de 1 minuto.**

- Entrada: preço de fechamento de `t` (`close_t`)
- Saída: preço de fechamento de `t+1` (`close_{t+1}`)
- CALL: `close_{t+1} > close_t`
- PUT: `close_{t+1} < close_t`
- PUSH: `close_{t+1} = close_t`

> **O candle `t+1` não participa da construção do sinal de forma alguma.**

---

## 4. Regra de Entrada (Determinística, Pré-declarada)

### CALL

Quando **todas** as condições são satisfeitas:

1. `close_t > open_t` (candle de alta)
2. `body_t / ATR_t >= 1.0`
3. `volume_t / meanVolume_{t-20..t-1} >= 1.5`

### PUT

Quando **todas** as condições são satisfeitas:

1. `close_t < open_t` (candle de baixa)
2. `body_t / ATR_t >= 1.0`
3. `volume_t / meanVolume_{t-20..t-1} >= 1.5`

### NO SIGNAL

Quando qualquer condição falhar. Sem inversão. Sem segunda tentativa.

---

## 5. Modelo

**Determinístico por regra.** Não há ML, treinamento de pesos ou otimização numérica.

O `callFrequency` ou qualquer estatística aprendida durante o Walk-Forward refere-se **apenas** às médias móveis necessárias para normalizar features (ATR, volume médio). Essas estatísticas são recalculadas puramente a partir da janela de treino.

---

## 6. Parâmetros Congelados

```
ATR period              = 14 candles
Volume lookback         = 20 candles
Displacement threshold  = 1.0 (× ATR)
Volume threshold        = 1.5 (× volume mean)
Expiry                  = 1 candle (60s)
Payout                  = 0.80
Break-even (P_BE)       = 1 / (1 + 0.80) = 55.5556%
```

> **NENHUM parâmetro será alterado após esta declaração.**  
> Não haverá grid search, exploração de thresholds alternativos ou ajuste baseado no resultado OOS.

---

## 7. Dataset

### Dataset de Execução (Novo — Não Contaminado)

| Campo | Valor |
|---|---|
| Asset | BTCUSDT Spot |
| Timeframe | 1m |
| Período | Fevereiro 2024 → Maio 2024 (4 meses) |
| Source | Binance Public Data Archive |
| Formato | 6-col canonical CSV (mesmo pipeline de ingestão do 006B) |

> O `DATASET_001` (Janeiro/2024) continua **congelado como referência histórica** e não será reutilizado para experimentos iterativos.

### Registro de Proveniência (a ser preenchido após ingestão)

```
datasetId:             BINANCE_SPOT_BTCUSDT_1M_2024_02_05
sourceSha256:          [preenchido após download]
canonicalFileSha256:   [preenchido após canonicalização]
datasetContentHash:    [preenchido após ingestão]
```

---

## 8. Protocolo OOS

Idêntico ao protocolo validado em BASELINE_OOS_001.

```
Estrutura:      Walk-Forward rolling
Train window:   10080 candles (7 dias × 1440 min/dia)
Test window:    1440 candles (1 dia)
Mínimo de observações na janela OOS: N >= 30 (protocolo v1.1)
```

> **Os parâmetros ATR e volume lookback são computados exclusivamente dentro da janela de treino.**  
> Nenhuma informação da janela de teste entra no cálculo das médias.

---

## 9. Critério de Aceitação

Para declarar evidência positiva, **todas** as condições devem ser satisfeitas:

| # | Condição |
|---|---|
| 1 | `CI_lower (Wilson 95%) > P_BE = 55.56%` |
| 2 | `EV > 0` (positivo após custos do payout) |
| 3 | Win rate OOS agregado superior ao Baseline (BASELINE_OOS_001: 50.43%) |
| 4 | Nenhuma seleção pós-hoc de parâmetros |
| 5 | Estabilidade inter-janelas (edge detectado em pelo menos metade das janelas) |
| 6 | Resultado permanece positivo sob protocolo de fricção congelado |

> **Não basta ganhar do Baseline. A barreira econômica de 55.56% é inegociável.**  
> 52% de win rate **é** não-edge. Não "quase-edge".

---

## 10. Critério de Falsificação

A hipótese é considerada **FALSA** se qualquer um dos seguintes ocorrer:

```
CI_lower (Wilson 95%) <= P_BE
  OU
EV <= 0
  OU
resultado OOS não reproduz edge em janela independente
  OU
edge desaparece sob auditoria de labels
  OU
edge depende de seleção de parâmetros (testado retroativamente)
  OU
edge desaparece sob protocolo de fricção congelado
  OU
win rate >= P_BE estatisticamente mas economicamente abaixo do break-even
```

---

## 11. Referências Congeladas

| Artefato | Hash / ID |
|---|---|
| Dataset 001 | `datasetContentHash: b4141d2c...` |
| BASELINE_OOS_001 | Win rate: 50.43%, CI: [49.90%, 50.97%], EV: -0.0922 |
| MetricsEngine | MIN_SAMPLE_SIZE = 30, Wilson 95% CI |
| Protocol | v1.1 (QUANT_CONTRACT.md) |
| QUANT_CONTRACT | Sections 1–6 |

---

## 12. Declaração de Integridade

> Este documento foi escrito **antes de qualquer execução OOS**, antes de qualquer visualização de resultado fora do dataset de treino, e antes de qualquer ajuste de parâmetros baseado em dados de fevereiro–maio/2024.
>
> Qualquer modificação deste documento após a execução do primeiro OOS constitui **violação do protocolo experimental**.
>
> Modificações são permitidas apenas para registrar resultados — nunca para retroativamente alterar hipótese, features ou parâmetros.
