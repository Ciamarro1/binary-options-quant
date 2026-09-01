# COMMIT 023 — H003 STRUCTURAL FREQUENCY & FEASIBILITY ANALYSIS

## 1. Objetivo e Delimitação Epistêmica
Esta análise puramente diagnóstica e descritiva teve como alvo a decomposição do funil de Setup da Hipótese 003 sobre a totalidade do `DATASET_004`. 
**Delimitação**: O Commit 023 não é uma validação OOS e não substitui o Commit 021. Nenhuma estatística aqui descrita retroalimentará parâmetros, *lookbacks*, limites ou o requisito $N \ge 30$. Serve exclusivamente para mapear a viabilidade estrutural do protocolo congelado.

---

## 2. Derivação Matemática do Warm-up
A exclusão dos candles iniciais não é um parâmetro arbitrário, mas uma exigência matemática da arquitetura MTF.
O período de *warm-up* ($W_{\min}$) é o máximo entre as dependências históricas:
$$ W_{\min} = \max(\text{SMA1h\_50}, \text{Swing15m\_96}) $$
$$ W_{\min} = \max(50 \times 60 \text{ min}, 96 \times 15 \text{ min}) $$
$$ W_{\min} = \max(3000, 1440) = 3000 \text{ candles} $$
Deste modo, dos 262.080 candles do `DATASET_004`, exatamente **259.080 candles** estão aptos para a detecção de *setups* descritivos (distinguindo-se dos 218.880 candles estritamente pertencentes aos blocos OOS TEST do Commit 021).

---

## 3. O Funil de Frequência (DATASET_004 Global)

**Universo de Observação**: 259.080 candles.

### Funil Sweep-Up (Gatilho para PUT)
1. **Sweep** (`high > SwingHigh15m_96`): **4.487** ocorrências ($\approx 1,73\%$)
2. **Sweep + HTF Bias** (`close < SMA1h_50`): **27** ocorrências (**Queda de 99,40%**)
3. **Setup Final (+ Reclaim)** (`close < SwingHigh15m_96`): **8** ocorrências

### Funil Sweep-Down (Gatilho para CALL)
1. **Sweep** (`low < SwingLow15m_96`): **4.077** ocorrências ($\approx 1,57\%$)
2. **Sweep + HTF Bias** (`close > SMA1h_50`): **60** ocorrências (**Queda de 98,53%**)
3. **Setup Final (+ Reclaim)** (`close > SwingLow15m_96`): **15** ocorrências

---

## 4. Diagnóstico Estrutural: O "Frequency Bottleneck"

Total de Sinais H003 globais detectados no dataset: **23** ($8 + 15$).

**Taxa Bruta de Frequência:**
$$ \text{Hit Rate} = \frac{23}{259.080} \approx 0,00888\% $$
Isto equivale a 1 sinal a cada $\approx 11.264$ candles de 1 minuto, o que representa **um setup, em média, a cada 7,82 dias.**

### Conclusão de Viabilidade
A análise refuta a premissa de que *Liquidity Sweeps* de 24h são raros (ocorrem mais de 4.000 vezes por direção em 6 meses). 

O principal *frequency bottleneck* documentado é a cláusula combinada de **HTF Bias**. A exigência de que o preço, ao romper uma máxima/mínima de 24h, feche simultaneamente em concordância com uma média móvel contrária de 50 horas elimina entre 98% e 99% dos eventos de *sweep* originais.

Como o sistema projeta uma frequência bruta de apenas $\approx 1$ setup a cada $7,8$ dias, atingir o piso amostral obrigatório de $N_{\text{train}} \ge 30$ ocorrências *por direção* dentro de uma janela de treino de apenas 30 dias é matematicamente insustentável sob o protocolo H003 congelado.
