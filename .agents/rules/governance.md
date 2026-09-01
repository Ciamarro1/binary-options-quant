# Rule: Quantitative Governance, Quorum & Multiple Testing Controls

## 1. Princípio da Governança Não-Discricionária
Nenhum resultado de PnL isolado pode promover um modelo. O avanço pelas etapas do ciclo de vida depende de validação formal, auditoria de linhagem e consenso quadripartite.

## 2. Ciclo de Vida do Modelo
```text
[CANDIDATE] -> [VALIDATED] -> [APPROVED] -> [PAPER / DEMO] -> [PROD_CANDIDATE] -> [LIVE]
     │              │              │
     └──────────────┴──────────────┴──────> [FALSIFIED / RETIRED / ARCHIVED]
```

## 3. O Tri-Proof Gate do CRO
Antes de qualquer deliberação, o Chief Risk Officer (CRO) deve receber e auditar formalmente:
1. `VALIDATION_REPORT_XXX.json` (Produzido pelo Statistical Validation Analyst)
2. `ADVERSARIAL_AUDIT_XXX.json` (Produzido pelo Adversarial QA / Red Team)
3. `PROVENANCE_RECEIPT_XXX.json` (Produzido pelo Experiment Controller)

## 4. Alçadas e Limitações
- **CRO:** Vereditos estritos: `PASS`, `VETO`, `RETURN_FOR_REVIEW`. Proibido de ajustar parâmetros de modelos ou excluir dados.
- **CEO:** Autoridade estratégica. Não pode promover modelos que não tenham recebido aprovação unânime do CRO, CTO e Experiment Controller.
- **Pesquisadores:** Proibidos de alterar especificações após o congelamento da hipótese (`FROZEN`).

## 5. Avaliação Cega (Blind Evaluation) & Barreira de Informação
- O time de pesquisa não tem acesso à fatia OOS de confirmação durante a fase de concepção e calibração in-sample.
- Ao término de uma hipótese falsificada, o Head of Research recebe o relatório qualitativo de `POST_MORTEM.md` com conclusões e limitações, mas NÃO recebe dados brutos para minerar novos thresholds.

## 6. Controle de Múltiplas Hipóteses (Multiple Testing Registry)
- Toda hipótese pré-declarada é registrada permanentemente em `research/governance/HYPOTHESIS_REGISTRY.json`.
- O laboratório monitora o número total de teses testadas ($K$) e variantes para controlar a taxa de falsa descoberta (False Discovery Rate / Family-Wise Error Rate).
