# QUANTITATIVE GOVERNANCE & EXPERIMENTAL ARCHITECTURE CHARTER

## 1. Institutional Framework & Purpose
This architecture establishes an autonomous, multi-agent experimental governance system for quantitative research and execution in binary contracts.

A arquitetura adota princípios de separação de funções, controle de risco soberano, validação independente, rastreabilidade criptográfica de linhagem (*provenance*), e segregação estrita entre pesquisa e execução (*Chinese Walls*) compatíveis com as melhores práticas de engenharia quantitativa institucional.

---

## 2. Departmental Hierarchy & Structural Governance

```text
                                ┌──────────────────────────────────┐
                                │    EXECUTIVE BOARD / CEO         │
                                │ • Strategic Mandates & Capital   │
                                └─────────────────┬────────────────┘
                                                  │
                  ┌───────────────────────────────┴───────────────────────────────┐
                  ▼                                                               ▼
    ┌───────────────────────────┐                                   ┌───────────────────────────┐
    │ CHIEF RISK OFFICER (CRO)  │                                   │ CHIEF TECHNOLOGY OFFICER  │
    │ • Sovereign Veto Authority│                                   │ (CTO)                     │
    │ • Tri-Proof Audit Gate    │                                   │ • Architecture & Perf     │
    │ • Zero Code Modification  │                                   │ • Engine Determinism      │
    └─────────────┬─────────────┘                                   └─────────────┬─────────────┘
                  │                                                               │
                  ├───────────────────────────────┬───────────────────────────────┤
                  ▼                               ▼                               ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
    │ EXPERIMENT CONTROLLER     │   │ CORE TECHNOLOGY           │   │ TRADING & EXECUTION       │
    │ (Head of Research Ops)    │   │                           │   │                           │
    │ • Lineage & Provenance    │   │ • Core Quant Engineer     │   │ • Head of Execution       │
    │ • Run IDs & Freeze Gates  │   │ • Adversarial QA Eng      │   │ • Reconciliation Eng      │
    │ • Protocol Enforcement    │   └───────────────────────────┘   └───────────────────────────┘
    └─────────────┬─────────────┘
                  │
    ┌─────────────┴─────────────┐
    ▼                           ▼
┌──────────────────────┐    ┌──────────────────────┐
│ ALPHA RESEARCH       │    │ STATISTICAL          │
│                      │    │ VALIDATION           │
│ • Head of Research   │    │                      │
│ • Feature Engineer   │    │ • Validation Analyst │
└──────────────────────┘    └──────────────────────┘
```

---

## 3. Separation of Duties & Chinese Walls (Permission Matrix)

> **Regra de Ouro:** *Agentes podem colaborar; artefatos congelados não.*

| Artefato / Domínio | Research (HOR) | Feature Eng (FE) | Core Eng (CE) | Validation (VA) | QA (RedTeam) | Exp Controller | CRO | CTO | CEO | Execution |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Hypothesis Spec** | **RW** | R | R | R | R | R (Audit) | R | R | R | - |
| **Dataset Ingest & Manifest** | R | **RW** | R | R | R | R (Audit) | R | R | R | R |
| **Feature Extraction Engine** | R | **RW** | R | R | R | R | R | R | - | - |
| **Model Strategy Logic** | R | R | **RW** | R | R | R | R | R | - | - |
| **OOS Replay Data / Split** | - (Blind) | - (Blind) | - (Blind) | **RW** | R | **RW** (Lock) | R | R | - | - |
| **Validation Report (Stats)** | R | R | R | **RW** | R | R | R | R | - | - |
| **Adversarial Audit (Stress)** | R | R | R | R | **RW** | R | R | R | - | - |
| **Provenance Receipt** | - | - | - | - | - | **RW** | R | R | - | - |
| **Risk Decision (PASS/VETO)** | R | R | R | R | R | R | **RW** | R | R | - |
| **Model Registry Manifest** | - | - | - | - | - | R | **R** (Sign) | **R** (Sign) | **RW** (Sign) | R |
| **Execution Bridge Config** | - | - | - | - | - | - | R | R | - | **RW** |

*Legenda: **RW** = Leitura e Escrita (Dono do Artefato); **R** = Somente Leitura; **-** = Acesso Proibido / Blind.*

---

## 4. The Tri-Proof CRO Audit Gate (Três Provas Independentes)

O CRO **jamais** decide com base apenas no relatório do Validation Analyst. Para deliberar sobre um modelo, o CRO exige três provas independentes:

```text
                        ┌────────────────────────────────────────┐
                        │      CONGELAMENTO EXPERIMENTAL         │
                        │ (Hypothesis + Code + Dataset Slices)   │
                        └───────────────────┬────────────────────┘
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ 1. STATS PROOF          │  │ 2. ADVERSARIAL PROOF    │  │ 3. PROVENANCE PROOF     │
  │ (Validation Analyst)    │  │ (Adversarial QA / Red)  │  │ (Experiment Controller) │
  │ • Win Rate (ex-PUSH)    │  │ • Mulberry32 Null Test  │  │ • Run ID & Git Commit   │
  │ • 95% Wilson CI LB      │  │ • Label Permutations    │  │ • Dataset Monotonicity  │
  │ • Brier Score & EV      │  │ • PUSH & Boundary Fuzz  │  │ • Protocol Version Lock │
  └────────────┬────────────┘  └────────────┬────────────┘  └────────────┬────────────┘
               │                            │                            │
               └────────────────────────────┼────────────────────────────┘
                                            ▼
                               ┌─────────────────────────┐
                               │   CHIEF RISK OFFICER    │
                               │ • PASS                  │
                               │ • VETO                  │
                               │ • RETURN FOR REVIEW     │
                               └─────────────────────────┘
```

### Alçadas Estritas do CRO:
1. **Poder de Veto Total:** O CRO pode vetar qualquer modelo cujo limite inferior do Wilson Score seja $\le P_{BE}$, cujo $N < 30$, ou que falhe no teste nulo.
2. **Proibição de Escrita:** O CRO é **incapaz de alterar código de estratégia ou parâmetros** (ex: proibido de alterar threshold de ATR ou excluir períodos desfavoráveis).
3. **Fluxo de Remediação:** Em caso de veto ou apontamento, o CRO emite um `REMEDIATION_REQUIREMENT.json`, devolvendo a tese à Pesquisa/Engenharia para um **novo ciclo experimental**.

---

## 5. Quórum de Promoção para Produção (4-Way Consensus)

Nenhum agente, diretor ou CEO pode promover um modelo isoladamente. A promoção exige o quórum de 4 assinaturas:

1. **`CRO APPROVED`**: Atesta solidez estatística, $N \ge 30$, Wilson Score $> P_{BE}$, e aprovação adversarial.
2. **`CTO APPROVED`**: Atesta determinismo de replay, isolamento de domínio e performance de execução.
3. **`EXPERIMENT CONTROLLER VERIFIED`**: Atesta linhagem imutável de dados, código congelado e ausência de adulteração.
4. **`CEO MANDATE SIGN-OFF`**: Autoriza a alocação de capital e ativação no *Model Registry*.

---

## 6. Protocolo de Avaliação Cega (Blind Evaluation)

1. **Visibilidade da Pesquisa:** Durante o desenvolvimento e seleção do modelo, a equipe de Pesquisa (HOR e FE) e Engenharia (CE) acessa **exclusivamente** os dados de treino (*In-Sample / Train Window*).
2. **Isolamento de OOS:** A janela de confirmação Out-of-Sample (OOS) fica trancada sob guarda do **Experiment Controller**.
3. **Execução Cega:** O **Validation Analyst** executa o modelo congelado diretamente contra o OOS trancado, eliminando qualquer viés de ajuste retrospectivo (*data snooping*).

---

## 7. Invariantes Constitucionais Inegociáveis

1. **Causalidade Estrita:** $\forall d \in D, \text{timestamp}(d) \le t$.
2. **Definição do Estimando:** $P\_win = P(\text{WIN} \mid \text{resolved, non-PUSH})$.
3. **N Amostral Mínimo:** $N \ge 30$ antes de qualquer veredito conclusivo.
4. **Barreira Econômica de Breakeven:** $W_{low} > \frac{1}{1+r}$.
5. **Imutabilidade Histórica:** Erros históricos geram novos IDs experimentais; nunca edições retroativas.
6. **Proibição de Substituição Sintética:** A ausência de um dataset empírico não autoriza substituição sintética silenciosa. Dados sintéticos exigem um pipeline segregado (`sourceType = SYNTHETIC`) e jamais podem alimentar o veredito econômico final de uma hipótese oficial.
7. **Isolamento de Target IS/OOS:** Nenhum resultado cujo target atravesse a fronteira In-Sample / Out-of-Sample pode contribuir para qualquer estatística de treinamento, calibração, seleção ou decisão do modelo IS. $t_{\text{resolution}} < t_{\text{train-boundary}}$ deve ser estritamente avaliado.
8. **Frequência Esperada vs Observada:** Frequência esperada não é frequência observada. O protocolo pode reduzir o risco de starvation por design relativo, mas somente o dataset empírico determinará a frequência real do evento.
9. **Proibição de Seleção OOS pós-IS:** Nenhuma janela OOS pode ser excluída, ponderada, desativada ou removida com base em qualquer métrica calculada no TRAIN (ex: P_train > P_BE), salvo se a política tiver sido explicitamente pré-registrada. Um subconjunto selecionado após a execução não pode substituir o universo OOS completo como estimando primário.
10. **Separação entre Sinal e Instrumento Econômico:** O instrumento econômico não pode ser escolhido ou otimizado após a observação do resultado de uma hipótese. O sinal preditivo e a arquitetura de payoff devem ser especificados ex-ante e avaliados separadamente.
