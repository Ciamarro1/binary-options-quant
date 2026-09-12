# GUIA DE DEPLOY NA RAILWAY: GRAVADOR 24/7 DE XAU/XAG (ACTIVE 2071)

Este guia orienta o deploy na **Railway** do gravador contínuo de dados da IQ Option para acumular os **$N \ge 10.000$ candles contemporâneos de M1** do ativo `Active 2071` (`XAU/XAG` — Ouro/Prata / Fusion CFD) necessários para o **Fidelity Gate Level 2**.

---

## 1. Por que rodar na Railway?

- **Operação 24/5 Ininterrupta:** Não depende de deixar o computador pessoal ligado, evitando interrupções por hibernação, reinicializações ou quedas de internet residencial.
- **Isolamento de Estratégia (Chinese Walls):** O container roda estritamente o serviço de observação e gravação. Nenhum modelo preditivo ou estratégia é alterado.
- **Monitoramento em Tempo Real:** O serviço inclui um painel web com barra de progresso visual de $0$ a $10.000$ candles e botão para download do arquivo `.jsonl`.
- **Persistência Segura:** Utiliza um **Railway Persistent Volume** para garantir que reinicializações do container não apaguem os candles acumulados.

---

## 2. Passo a Passo de Deploy na Railway

### Passo 1: Subir as alterações para o GitHub
Certifique-se de que os novos arquivos de deploy estão no seu repositório GitHub:
```bash
git add Dockerfile .dockerignore railway.json docs/RAILWAY_DEPLOYMENT_GUIDE.md research/execution/data_acquisition/recorder/
git commit -m "feat(deploy): Railway 24/7 cloud recorder with persistent volume and web dashboard"
git push origin master
```

### Passo 2: Criar o Projeto na Railway
1. Acesse [railway.com](https://railway.com/) e faça login.
2. Clique em **`+ New Project`** $\to$ **`Deploy from GitHub repo`**.
3. Selecione o repositório `binary-options-quant` (ou seu fork).
4. A Railway detectará automaticamente o arquivo [`railway.json`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/binary-options-quant/railway.json) e o [`Dockerfile`](file:///c:/Users/WDAGUtilityAccount/Documents/Nova%20pasta/binary-options-quant/Dockerfile).

### Passo 3: Adicionar o Volume Persistente (ESSENCIAL)
> [!IMPORTANT]
> Sem o volume persistente, qualquer restart da Railway usará um disco efêmero limpo. Com o volume, o arquivo `.jsonl` é preservado indefinidamente.

1. No painel do seu serviço na Railway, vá na aba **`Volumes`**.
2. Clique em **`+ Add Volume`**.
3. Defina o **Mount Path** exatamente como:
   ```text
   /data
   ```
4. Salve a configuração do volume.

### Passo 4: Configurar as Variáveis de Ambiente
Na aba **`Variables`** do serviço, adicione as seguintes variáveis:

| Variável | Valor Recomendado | Descrição |
|---|---|---|
| `IQO_EMAIL` | `seu_email@exemplo.com` | E-mail da conta IQ Option |
| `IQO_PASSWORD` | `sua_senha_secreta` | Senha da conta IQ Option |
| `RAW_DIR` | `/data` | Caminho do volume persistente |
| `IQO_ASSET` | `XAU/XAG` | Ativo alvo (Active 2071) |
| `IQO_INTERVAL` | `60` | Granularidade M1 (60 segundos) |

### Passo 5: Gerar Domínio Público para Acesso ao Dashboard
1. Na aba **`Settings`** do serviço, role até a seção **`Networking`**.
2. Clique em **`Generate Domain`** (ex: `binary-options-recorder-production.up.railway.app`).
3. Acesse a URL gerada pelo seu navegador.

---

## 3. Monitoramento & Dashboard Web

Ao acessar o domínio gerado pela Railway, você verá o painel com atualização automática a cada 15 segundos:

- **Status da Conexão:** Badge `CONNECTED` (verde) ou `STANDBY` (amarelo durante fins de semana quando o mercado está fechado).
- **Barra de Progresso:** Percentual atingido em direção à meta de **$10.000$ candles**.
- **Métricas:**
  - Total de Candles Fechados (M1);
  - Tamanho do arquivo em MB;
  - Último preço registrado e timestamp UTC;
  - Uptime do serviço.
- **Endpoints de API:**
  - `GET /health`: Utilizado pela Railway para atestar a saúde do container (retorna HTTP 200).
  - `GET /metrics`: Retorna todos os dados operacionais em JSON.
  - `GET /download`: **Faz o download direto do arquivo `.jsonl` para o seu computador com um clique.**

---

## 4. O que fazer após atingir N &ge; 10.000 Candles?

1. Acesse o dashboard na Railway e clique no botão **`📥 Download Dataset (.jsonl)`**.
2. Salve o arquivo baixado substituindo o arquivo local em:
   ```text
   research/execution/data_acquisition/raw/IQO_XAU_XAG_60s_raw.jsonl
   ```
3. No terminal do laboratório local, baixe o mesmo período contemporâneo da Dukascopy:
   ```bash
   node scripts/data_acquisition/fetch_dukascopy_xauxag.js --from YYYY-MM-DD --to YYYY-MM-DD
   ```
4. Execute a auditoria de fidelidade oficial:
   ```bash
   node scripts/data_acquisition/fidelity_audit_xauxag.js
   ```
5. O script comparará barra a barra as duas séries e emitirá o relatório:
   - Se $\rho_{15\text{m}} \ge 0.98$ e $\text{BSIR}_{15\text{m}} \le 2.0\% \implies$ **PROMOÇÃO A LEVEL 2 (FIDELITY-VALIDATED)**.
   - Se os critérios falharem $\implies$ **VETO INSTITUCIONAL DEFINITIVO (RECONSTRUCTION FALLACY CONFIRMADA)**.
