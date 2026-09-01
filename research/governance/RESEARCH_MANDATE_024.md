# COMMIT 024 — RESEARCH MANDATE REVIEW
## Informational Capacity & Structural Viability

**Data de Emissão**: 2026-09-01
**Status**: `PROPOSED` (Awaiting Executive Sign-off)

---

## 1. O Pivô Epistêmico do Laboratório

As três primeiras hipóteses do laboratório buscaram extrair *Edge* baseando-se em formas derivadas absolutas do preço OHLC:
* **H001**: Displacement Continuado $\rightarrow$ `FALSIFIED` (P_BE não superado)
* **H002**: Extreme Displacement Reversal $\rightarrow$ `FALSIFIED` (P_BE não superado)
* **H003**: MTF Liquidity Sweep $\rightarrow$ `INCONCLUSIVE` (Colapso amostral por rigidez geométrica)

**A Lição Estrutural**: O laboratório provou ser impenetrável à *curve-fitting*, perfeitamente capaz de dizer "não". No entanto, o design das hipóteses tem assumido que *certas configurações absolutas de preço possuem significado informacional universal*. 
O mandato a partir do **Commit 024** foca em garantir que o fenômeno seja *observável, frequente o suficiente, e detentor de capacidade informacional comprovada* antes de ser enquadrado em uma proposição econômica estrita.

---

## 2. Novo Framework Métrico em Três Níveis

Para evitar a falácia de que "desvio estatístico" é sinônimo de "estratégia operável", todo experimento passará por três barreiras progressivas:

* **NÍVEL 1 — Detectabilidade**: O fenômeno existe em frequência suficiente para compor uma amostra robusta ($N \gg 30$ por janela)? Existe alguma associação estritamente estatística (*Signal-to-Noise*) contra a hipótese nula In-Sample?
* **NÍVEL 2 — Previsibilidade**: Essa associação é invariante no tempo? Ela sobrevive à fronteira OOS (*Out-of-Sample*) blindada, sem colapsar a calibração sob mudança de regime?
* **NÍVEL 3 — Economia**: A previsibilidade OOS produz um valor esperado positivo sob a severidade do contrato binário ($P_{\text{win}} > P_{BE} = 55.56\%$, com $EV > 0$)?

---

## 3. Avaliação das Famílias Candidatas (Evitando P-Hacking)

Não realizaremos testes aleatórios (grid search) em dezenas de features. A escolha da próxima família será governada por *priori* informacional deduzido da microestrutura, escolhendo uma única direção.

### Família A — Estrutura Temporal (HTF Structure)
* *Conceito*: Trend state, Break/Reclaim, Range position, Volatility regime.
* *Parecer*: **REJEITADA NESTE CICLO**. A H003 nos ensinou que depender de inflexões estruturais exatas em derivativos absolutos de preço cria gargalos de frequência extremos ("Frequency Bottlenecks"). O BTCUSDT pode não respeitar memórias absolutas curtas com precisão geométrica suficiente no intraday 1m.

### Família B — Microestrutura Observável por OHLCV
* *Conceito*: Wick imbalance, Range expansion, Volume shock, Volatility clustering, Serial dependence.
* *Parecer*: **CANDIDATA SECUNDÁRIA**. Extrai informações orgânicas do *flow* agressor que deixam pegadas no volume e nas sombras (wicks), mas continua refém de distorções nominais dependendo da liquidez da hora do dia.

### Família C — Estado Relativo (Relative / Cross-Sectional State)
* *Conceito*: Ao invés de perguntar "O BTC vai subir baseado neste padrão?", a tese pergunta "O BTC está se comportando de maneira localmente anormal em relação à sua própria distribuição das últimas horas?" (Ex: Z-Score local de volatilidade ou volume; distensão intra-regime).
* *Parecer*: **FORTEMENTE RECOMENDADA**.
  1. **Evita a premissa de geometria absoluta**: Ao normalizar o comportamento recente, o setup ignora se o BTC está a $60k ou $100k, ou se a média móvel está cruzada ou não.
  2. **Garante Endogenia**: A normalização relativa tende a reduzir o risco de *frequency starvation* causado por thresholds absolutos (como na H003). Contudo, a frequência final do sinal precisará ser medida *ex-ante* e não presumida puramente por percentis, pois condicionais de direção e regime podem eliminar candidatos.
  3. **Isolamento de Ruído**: Captura a "surpresa" microestrutural (o deslocamento súbito do consenso) independente do regime dominante.

---

## 4. O Mandato de Pesquisa

O *Master Orchestrator* formaliza a seleção da **Família C (Relative State)** para o novo ciclo de pesquisa pré-registrada, fundando-se na premissa de que a *distensão relativa intrínseca* carrega maior sinal previsível de curtíssimo prazo ($t+3$) do que a *memória espacial absoluta* (suporte/resistência).

**Famílias Arquivadas Intactas:**
- `SHORT_HORIZON_BTCUSDT_1M`: `CLOSED_ARCHIVED` (Veto Econômico H001/H002)
- `MTF_LIQUIDITY_MICROSTRUCTURE`: `CLOSED_INCONCLUSIVE` (Veto Estrutural H003)

**Próximo Passo Autorizado:**
Commit 025 — Pre-Registration da Família C (Relative Abnormal State Hypothesis).
