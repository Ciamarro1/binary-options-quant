# IQ OPTION VENUE & CONTRACT ACQUISITION (COMMIT 033)
**Date:** 2026-09-01
**Domain:** Venue-Specific Execution Research

## 1. O Princípio da Verdade de Liquidação
Antes de construirmos e confiarmos no `DATASET_IQO_001`, o laboratório institui a premissa de que o "BTC do Gráfico" ($\text{Feed}_{chart}$) não é necessariamente o "BTC do Contrato" ($\text{Feed}_{settlement}$), especialmente sob ambientes OTC ou de derivatização sintética de provedores de liquidez proprietários. Nenhuma API de terceiros será assumida como verdade absoluta (ground truth) sem reconciliação empírica.

**Questões Focais Resolutivas:**
1. QUAL preço exatamente decide o resultado da aposta (entry/expiry)?
2. QUAL feed de dados contém esse preço?
3. QUAL dataset devemos usar como *ground truth*?

## 2. As Quatro Fases de Aquisição (The Acquisition Protocol)

### Fase A — Recorder (Observação Cega)
Construção e implantação de um coletor local (`data_acquisition/recorder/`) para gravar, de forma contínua e inalterada, o fluxo de dados em tempo real da IQ Option.
**Alvos de Coleta:**
- Ticks (1s/sub-second) e/ou Candles 1m.
- Metadados: Server Timestamp vs Local Timestamp, Instrument ID (ex: "BTC" vs "BTC-OTC"), Instrument Type (turbo/binary).
- *Dynamic Payout*: snapshot da taxa de rentabilidade (ex: 80%, 85%) ofertada na janela de execução.

### Fase B — Reconstrução
Processamento puramente mecânico dos dados brutos em um artefato canônico (`IQO_BTC_1m`). Sem limpeza agressiva, sem imputação de dados faltantes (se o feed falhou, o modelo precisa saber que falharia na vida real).

### Fase C — Reconciliação (Auditoria Cruzada)
Comparação manual ou programática de uma amostra de eventos:
$$ Feed\_Recorder \longleftrightarrow IQ\_Platform\_Chart \longleftrightarrow Official\_Historical\_Endpoint $$
Garantir que as métricas críticas (Open, High, Low, Close, Timestamp) gravadas pelo `Recorder` batem no milissegundo com a plataforma nativa.

### Fase D — Especificação do Contrato (The Contract Formula)
Formalização matemática da mecânica de liquidação baseada na Fase C:
- $EntryPrice_t$
- $ExpiryPrice_{t+k}$
- $EntryTimestamp_t$
- $ExpiryTimestamp_{t+k}$
- $Payout_t$ (estático ou variante)
- Regra exata de WIN, LOSS e PUSH (Empate anula a operação integralmente?).

## 3. Arquitetura de Dados

```text
research/execution/
├── VENUE_ALIGNMENT_032.md
├── IQ_OPTION_CONTRACT_SPEC_033.md
└── data_acquisition/
    ├── recorder/     (Scripts de captura websocket/API, ex: Node/Python)
    ├── raw/          (Dumps puros em JSONL ou CSV sem tratamento)
    ├── canonical/    (Dataset final pós-reconciliação para backtest, ex: DATASET_IQO_001)
    └── manifests/    (Logs de auditoria e hashes SHA-256 de proveniência)
```
