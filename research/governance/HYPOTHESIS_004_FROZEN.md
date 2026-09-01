# HYPOTHESIS-004: Relative State Mean Reversion
## FORMAL SPECIFICATION (Commit 025 - APPROVED / FROZEN)

**Family**: Family 03 (Relative / Cross-Sectional State)
**Genealogy**: Normalização endógena pura (Independente de deslocamentos absolutos e limites espaciais. H001/H002/H003 = Excluídas).
**Status**: `FROZEN`

---

### The 15 Dimensions

**1. Tese**
Um movimento de 1 minuto que se isola em um extremo absoluto de sua própria distribuição recente (estado relativo empírico) exaure a liquidez direcional local e reverte no horizonte elástico de 3 minutos.

**2. Universo**
`BTCUSDT` (Spot Trading). Sem alavancagem.

**3. Timeframe**
`1m`

**4. Feature (Variável Independente)**
`Empirical Percentile Rank` (Quantil Empírico).
Fórmula do retorno base:
$$ r_t = \frac{C_t}{C_{t-1}} - 1 $$
Fórmula do Feature:
$$ Q_t = \text{PercentileRank}(r_t \mid r_{t-240}, \dots, r_{t-1}) $$
*Invariante Estrutural*: O retorno atual $r_t$ **NÃO** entra na distribuição de referência. A classificação quantílica é insensível a *outliers* que distorcem média/variância e independe de normalidade.
*Restrições Absolutas*: `NO Z-SCORE. NO RSI. NO ATR. NO VOLUME. NO HTF FILTER. NO SECOND FEATURE. NO GRID SEARCH.`

**5. Lookback ($L$)**
$L = 240$ candles de 1m (4 horas).

**6. Definição de Extremo (Threshold)**
Extremo Inferior: $Q_t \le 0.025 \implies$ **CALL**
Extremo Superior: $Q_t \ge 0.975 \implies$ **PUT**
(Frequência teórica bruta de anomalia $\approx 5\%$, sujeita à Regra 8 de frequência observada empírica).

**7. Target (Ação)**
Reversão da anomalia percentílica direcional.

**8. Expiry**
$3 \text{ candles} \times 1m = 180 \text{ segundos}$.

**9. Payout e Breakeven**
Payout estático de $0.80 \implies P_{BE} = 55.5556\%$.

**10. Estimador de Probabilidade**
$$ \hat{P} = \frac{\text{WIN}}{\text{WIN} + \text{LOSS}} $$
(Condicionado ao setup e à direção no IS). Sem *smoothing*, sem Correção de Laplace, sem *prior*.

**11. TRAIN / OOS Boundary & Window Size**
Dedução matemática: A expectativa teórica é de $0.025 \times W$ eventos por direção. Para obter $N \ge 30$ com forte margem de segurança contra clusters e perdas:
- **Train Window**: $4.320 \text{ candles}$ ($3 \text{ dias}$). $\implies$ Expectativa teórica de $108$ eventos por cauda antes de exclusões.
- **Test Window**: $1.440 \text{ candles}$ ($1 \text{ dia}$).
- **Step**: $1 \text{ dia}$.

**12. Sample Floor (Fail-Closed)**
$M = 30$ eventos válidos **por direção**.
$N_{\text{train, dir}} < 30 \implies \hat{P} = \text{null} \implies \text{NO SIGNAL}$.

**13. Baseline Comparativa**
Modelo de controle puramente probabilístico e isolado no mesmo ambiente temporal da tese principal:
`BASELINE_005_CONTROL` vs `HYPOTHESIS_004` (Train 3d / Test 1d / Expiry 3m).

**14. Adversarial Controls**
Além de *Synthetic Null*, três novos testes vitais inseridos pela governança da H004:
- **Quantile Future Injection**: Modificar $[r_{t+1}, \dots]$ tem impacto estritamente $0$ sobre $Q_t$.
- **Rank Contamination**: Inserir um outlier massivo de $+1000\%$ após $t$ tem impacto estritamente $0$ sobre o cálculo empírico do percentil em $t$.
- **Boundary Precision**: Assegurar a quebra binária ($Q_t = 0.024999 \implies \text{NO SIGNAL}$; $Q_t = 0.025000 \implies \text{CALL}$).

**15. Critério de Aceitação Econômica**
Para obter a rubrica final `APPROVED`, a H004 deve simultaneamente:
1. IC de Wilson (Lower Bound) $> 55.5556\%$.
2. Valor Esperado ($EV$) $> 0$.
3. Frequência: $N \ge 30$ no OOS global.
4. Outperformance: $\text{WR}_{\text{H004}} > \text{WR}_{\text{BASELINE}}$.
5. Bateria Adversarial `PASS`.
6. **Calibration Test**: $\hat{P}_{\text{predict}} \approx P_{\text{realized}}$ (O modelo precisa ser honesto na estimação de incerteza).
