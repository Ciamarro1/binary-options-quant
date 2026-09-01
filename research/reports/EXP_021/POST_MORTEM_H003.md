# HYPOTHESIS_003 — POST-MORTEM & CATASTROPHIC RARITY ANALYSIS

## 1. Veredito Oficial do CRO
**Status**: `INCONCLUSIVE`
**Reason**: `INSUFFICIENT_TRAINING_SAMPLE`
**Economic Test**: `NOT_REACHED`

A hipótese **H003 (MTF Liquidity Microstructure Sweep)** não demonstrou edge, mas também não foi falsificada. A execução do *Commit 021-R (Genuine OOS)* em `DATASET_004` revelou que a geometria exigida pelo Setup é estatisticamente rara demais para satisfazer a amostra mínima de Treino ($N \ge 30$) sob o protocolo pré-registrado. Pela regra de *Fail-Closed*, a estratégia operou de forma silenciada, não despachando capital no teste cego.

---

## 2. Anatomia da Raridade Estrutural

O universo empírico provado consistiu de **218.880 candles** (152 dias OOS puros de BTCUSDT 1m).
Durante este período, o detector `MTFSetupDetector` encontrou:
- **Sweep-Up Candidates**: 15 ocorrências
- **Sweep-Down Candidates**: 9 ocorrências
- **Total de Eventos**: 24

**Taxa Bruta de Ativação**:
$$ \text{Hit Rate} = \frac{24}{218880} \approx 0.01096\% $$

### Hipóteses para a Falha Amostral
Foram delineadas três possíveis causas excludentes:
**A) O fenômeno de Liquidity Sweep MTF é intrinsecamente raro.** (Reverte-se rapidamente ou ocorre com extrema baixa frequência na microestrutura do Bitcoin moderno).
**B) A definição estrutural (1m High cruzando um Swing de 15m_96 com fechamento imediato no 1m) é excessivamente restritiva.** 
**C) A colisão geométrica das regras (Bias da SMA50h + Sweep 24h contrário) é quase impossível.** (Exemplo: para que haja um Sweep de um topo de 24h, o mercado geralmente está em alta local; exigir que a SMA de 50h ainda esteja apontando que a tendência macro é de baixa exige uma configuração de *whiplash* raríssima).

Nenhuma das causas A, B ou C será adotada sem nova averiguação metodológica, sob pena de incorrer em *Researcher Degrees of Freedom*.

---

## 3. Auditoria Forense da Fronteira Temporal (Boundary Leak Fix Aplicado)

O *Master Orchestrator* levantou uma questão infraestrutural severa sobre o bloco OOS de `Treino` no script original do Commit 021, em relação ao enquadramento dos candidatos próximos à fronteira do `Teste`:

*Se um sinal é acionado no final do bloco de Treino, sua resolução (que demanda $t+3$) ocorrerá dentro do bloco de Teste. Em um replay offline, isso causa Look-Ahead Leakage reverso.*

**Resolução e Acatamento (Commit 022A):**
A falha foi sanada impondo a regra estrita: $t_{resolution} < t_{train\_boundary}$ (Exclusivo). 
Nenhum sinal cuja expiração de 3 candles atravesse a fronteira para o Teste pode contribuir para o cálculo de $P_{\text{win}}$ do Treino. A imutabilidade do IS em relação à presença ou ausência do OOS (Invariance Test) foi comprovada no laboratório.
Os números consolidados de 6/9 ocorridos nesta versão final do Post-Mortem já são os valores recálculados 100% livres de *Boundary Leakage*. A regra de barreira IS/OOS ingressou permanentemente na Constituição do Laboratório (Regra 7).

---

## 4. O Que Fica Proibido

Para evitar viés retrospectivo (curve-fitting):
1. É proibido afrouxar a amostra $N \ge 30 \to 10$ para "forçar" operações de teste.
2. É proibido afrouxar o limiar temporal ($50h \to 20h$, ou $96 \to 48$) apenas porque a H003 foi inconclusiva.
3. Se um pesquisador desejar testar os relaxamentos acima, isso constituirá uma nova família de pesquisa e **nunca** uma subversão retrospectiva da H003.

A H003 provou categoricamente que o *Quant Contract* é inflexível, e prefere falhar seguro a alocar risco baseado em dados imaturos.
