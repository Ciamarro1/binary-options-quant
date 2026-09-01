# FAMILY 03 DECISION (COMMIT 031 / 031A)
**Date:** 2026-09-01
**Action:** PENDING_RESEARCH_DECISION (AUDIT HOLD)

## 1. Statistical Association Audit (Initial)
A análise inicial (Commit 031) apontou um Z-Score de 2.307 ($p=0.021$) utilizando um teste pareado ponderado pela variância inversa. Contudo, **esse resultado foi colocado sob AUDIT HOLD metodológico**.

**Justificativa Científica para o Hold:**
- H004 e Baseline não formam pares de observações independentes equivalentes (H004 opera apenas nas caudas; Baseline avalia todos os instantes).
- O teste original tratou as janelas como observações independentes sem demonstrar aderência plena à dependência temporal dos sinais agregados. 
- Conclusão ajustada: *Foi observada uma vantagem média de aproximadamente +0.88 pp em relação ao baseline; a significância estatística dessa diferença permanece pendente de validação por método que preserve a dependência temporal e a natureza seletiva dos sinais.*

## 2. Commit 031A: Temporal Association Audit
Para responder à questão sem a falha metodológica do pareamento independente, conduzimos um **Block Bootstrap Temporal** ($B = 10,000$). 
Utilizamos as janelas OOS (blocos de 1 dia) como unidade atômica de reamostragem conjunta (para H004 e Baseline simultaneamente). Isso preserva a dependência intra-janela e a densidade variante de sinais (dias com 0 sinais vs dias com muitos), testando o verdadeiro estimando global: $\Delta = P(WIN \mid H004) - P(WIN \mid Baseline)$.

**Resultados do Block Bootstrap (180 Janelas, 10.000 iterações):**
- **Observed Delta ($\Delta$)**: +0.8804 pp
- **95% Confidence Interval**: [+0.0734 pp, +1.7109 pp]
- **p-value empírico**: 0.0160

O Intervalo de Confiança de 95% exclui formalmente o zero. A diferença pareada é **Estatisticamente Significativa e Temporalmente Robusta ($p < 0.05$)**.

## 3. Veredito Científico
1. **A Informação Direcional é Real**: A Família 03 (Relative State) isolou um sinal genuíno. A diferença sobreviveu à reamostragem em blocos temporais.
2. **A Fratura Econômica (Binary Edge $\neq$ Predictive Signal)**: Mesmo possuindo informação direcional real (+0.88 pp sobre baseline), o sinal não possui magnitude para transpor a assimetria do veículo financeiro (opções binárias com payout de 0.80 exigem um $P_{BE} = 55.56\%$). O problema não é um "spread" clássico bid/ask, mas a severa assimetria do payoff pré-fixado.

## 4. Decisão de Pesquisa
- A **Família 03 (Relative State)** está oficialmente **CLOSED_ARCHIVED**.
- Com a robustez estatística confirmada, o Conselho autoriza a **NOVA FAMÍLIA DE PESQUISA (Family 04: Signal-to-Payoff Architecture)**.

O objetivo da Família 04 **não** é tentar encontrar uma feature mais forte ou fazer tuning na H004. A Família 04 tem o mandato explícito de investigar o abismo entre o sinal direcional pequeno (porém robusto) e a estrutura de payoff. A pergunta norteadora passa a ser: *Como transformar uma informação direcional estatisticamente validada em uma arquitetura de execução que não exija 55.56% de Win Rate?* (Ex: novos instrumentos, novos veículos, risk/reward dinâmico, etc.).
