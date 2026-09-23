# RAC Interna Arvensis (MVP)

Sistema para o SAC registrar **queixas técnicas de embalagem** (vazamento, tampa, rosca, válvula, trinca…) observadas nas tratativas de avarias. Com um único preenchimento, o sistema:

1. gera o número `RAC-INT-AAAA-NNNN` (sequencial, reinicia a cada ano);
2. registra a RAC na planilha-base;
3. cria a pasta `RAC Interna/AAAA/MM Mês/RAC-INT-…` no Drive;
4. salva as evidências com nomes padronizados (`01_Tampa.jpg`, `02_Caixa_externa.jpg`…);
5. gera o PDF a partir do modelo do Google Docs, com até 4 fotos reduzidas e o link da pasta;
6. cria um **rascunho** no Gmail de quem registrou, com assunto e corpo padronizados e o PDF anexado;
7. grava todo o histórico (que nunca é sobrescrito) e alimenta o dashboard.

A RAC Interna **não substitui** o chamado Estoca (tratativa logística e financeira) nem a RAC GAQ. Ela é o registro técnico, estatístico e preventivo.

Tecnologia: Google Apps Script, Sheets, Drive, Docs e Gmail. Não exige servidor externo.

---

## Estrutura

| Arquivo | Função |
|---|---|
| `Code.gs` | Web app (`doGet`) e funções `api_*` chamadas pela tela |
| `Config.gs` | Constantes, listas iniciais, status, permissões por perfil e configurações padrão |
| `Setup.gs` | `setup()`: cria pasta, planilha, abas, listas e modelo do documento |
| `RacService.gs` | Criar, editar, anexar, finalizar, consultar e alterar status |
| `DatabaseService.gs` | Leitura e escrita na planilha (única camada que conhece o Sheets) |
| `DriveService.gs` | Pastas e arquivos de evidência |
| `DocumentService.gs` | Preenche o modelo do Docs e gera o PDF |
| `EmailService.gs` | Assunto, corpo e rascunho no Gmail |
| `DashboardService.gs` | Indicadores |
| `AuthService.gs` | Usuário logado e perfis |
| `Utils.gs` | Regras puras: numeração, validação, LGPD, e-mail, filtros, indicadores |
| `Index.html`, `Form.html`, `RacDetail.html`, `Dashboard.html`, `Styles.html`, `Scripts.html` | Telas |
| `tests/run.js` | Testes automáticos das regras puras |

---

## Instalação (uma única vez, pelo administrador)

### 1. Criar o projeto
**Opção A: colar no editor**
1. Acesse <https://script.google.com> com a conta corporativa e crie um **Novo projeto**, chamado "RAC Interna Arvensis".
2. Em *Configurações do projeto*, marque "Mostrar arquivo de manifesto appsscript.json" e cole o conteúdo de `appsscript.json`.
3. Crie cada arquivo `.gs` (Script) e `.html` (HTML) com o **mesmo nome** e cole o conteúdo. No editor, o nome vai sem a extensão: `Config`, `Utils`, `Form` etc.

**Opção B: clasp** (para quem usa terminal)
```bash
npm i -g @google/clasp && clasp login
cd rac-interna
clasp create --type standalone --title "RAC Interna Arvensis"   # ou copie .clasp.json.example para .clasp.json e informe o scriptId
clasp push
```

### 2. Rodar o setup
No editor, selecione a função `setup` e clique em **Executar**. Autorize as permissões (Drive, Planilhas, Documentos, Gmail). O log mostra os links criados:
- pasta **RAC Interna** (e, dentro dela, a pasta `_Sistema` com a planilha e o modelo);
- planilha **RAC Interna Arvensis - Base**;
- documento **RAC Interna - Modelo do documento**.

A conta que executou o setup é cadastrada como **ADMIN**.

### 3. Configurar a planilha
Na aba **Config**:
- `EMAIL_DESTINATARIOS`: e-mails da Qualidade, separados por vírgula (**obrigatório** para criar os rascunhos);
- `DOMINIO_PERMITIDO`: por exemplo, `arvensis.com.br` (vem preenchido com o domínio de quem rodou o setup);
- limites de upload, vídeo (MP4) e quantidade de fotos no PDF.

Na aba **Usuarios**, cadastre `email | nome | perfil | ativo`, com perfil `SAC`, `QUALIDADE` ou `ADMIN` e ativo `SIM`.

Na aba **Produtos**, cadastre `sku`, `nome_produto`, `tipo_embalagem`, `fornecedor_embalagem` e `ativo`. A linha de exemplo (Geleia Seiva) pode ser apagada ou ajustada.

As abas `Categorias`, `Subcategorias`, `CondicoesCaixa` e `Status` já vêm com as listas da especificação e podem ser editadas. Para desativar um item sem apagar o histórico, use `NAO` na coluna `ativo`. Na aba Subcategorias, a categoria `*` vale para todas.

### 4. Compartilhar
Compartilhe a pasta **RAC Interna** (Editor) com o grupo do SAC e da Qualidade. Assim eles acessam planilha, modelo e evidências. **Não** use "qualquer pessoa com o link": nada deve ficar público.

> O web app roda **como o usuário que acessa** (`USER_ACCESSING`). Por isso cada pessoa cria o rascunho no próprio Gmail e precisa ter acesso à pasta. As permissões por perfil são aplicadas pelo sistema. Quem edita a planilha diretamente contorna essas regras, então restrinja a edição da planilha se necessário.

### 5. Publicar
No editor: **Implantar → Nova implantação → Tipo: App da Web**
- Executar como: **Usuário que acessa o app da Web**
- Quem pode acessar: **Qualquer pessoa em [seu domínio]**

Compartilhe a URL `/exec` com a equipe. Depois de alterar o código, publique uma nova versão em *Gerenciar implantações*.

### 6. Personalizar o documento
Abra "RAC Interna - Modelo do documento" e ajuste o visual: insira o logo Arvensis, cores e fontes. Mantenha as variáveis `{{…}}`:

`{{RAC_NUMERO}} {{DATA}} {{STATUS}} {{PRODUTO}} {{SKU}} {{LOTE}} {{NOTA_FISCAL}} {{CHAMADO_ESTOCA}} {{CATEGORIA}} {{SUBCATEGORIA}} {{CONDICAO_CAIXA}} {{DESCRICAO}} {{OBSERVACAO}} {{USUARIO}} {{QTD_ANEXOS}} {{LINK_PASTA}} {{EVIDENCIAS}}`

`{{EVIDENCIAS}}` é substituída pelas fotos. Ela deve ficar sozinha em um parágrafo.

---

## Uso

**SAC: Nova RAC**
1. Escolha o produto (o SKU é preenchido sozinho) e informe lote, NF e chamado Estoca (ou marque "Chamado ainda não aberto").
2. Informe categoria, subcategoria e condição da caixa, e escreva a descrição objetiva ("nas imagens é possível observar…").
3. Arraste as fotos e escolha a legenda de cada uma.
4. Clique em **GERAR RAC**.
5. Abra o rascunho no Gmail, revise e envie. Depois clique em **Confirmar envio à Qualidade**.

Se algo falhar no meio (por exemplo, a conexão cair durante o upload), a RAC fica "Em elaboração". Clique em GERAR RAC de novo ou use **Consultar → Continuar preenchimento**. Evidências já enviadas não são reenviadas.

**Qualidade**: consulte a RAC, veja as evidências e o histórico, e altere o status com comentário (Recebida, Em análise, Aguardando informações/fornecedor, Ação corretiva, Concluída, Cancelada).

**Dashboard**: total, abertas no mês, aguardando Qualidade, em análise, concluídas, tempo médio de análise, e RACs por mês, produto, lote, categoria, subcategoria, condição da caixa, tipo de embalagem, fornecedor e status.

### Regras implementadas
- Obrigatórios: produto (do cadastro), lote, NF, chamado Estoca (ou "não aberto"), categoria, descrição e ao menos uma evidência (configurável).
- LGPD: não existem campos de dados do cliente. Descrição, observação e comentários com CPF, e-mail ou telefone são bloqueados.
- Perfis:
  - **SAC** cria e edita a própria RAC em elaboração, anexa evidências e confirma o envio.
  - **Qualidade** altera status.
  - **ADMIN** faz tudo e reabre RACs concluídas.
  - Ninguém exclui RACs: elas podem ser *canceladas*.
- Numeração protegida contra acessos simultâneos (`LockService`) e contra contador desatualizado (considera o maior número já existente).

---

## Testes

```bash
node rac-interna/tests/run.js
```
Os testes cobrem numeração e virada de ano, validação, bloqueio de dados pessoais, nomes de arquivo, assunto e corpo do e-mail, variáveis do modelo, permissões, transições de status, pesquisa e indicadores.

### Roteiro de teste manual (com o exemplo da seção 55)
1. Cadastre-se como `SAC` (ou use o ADMIN) e confirme que o produto *Geleia Seiva by Rodrigo Vizu 300 g / SKU001949* existe.
2. Nova RAC: lote `64225`, NF `87432`, chamado `321987`, categoria *Vazamento*, subcategoria *Tampa*, caixa *Sem avaria aparente*, descrição do exemplo e 4 fotos.
3. Verifique:
   - a pasta `RAC Interna/2026/09 Setembro/RAC-INT-2026-0001` com as 4 fotos renomeadas e o PDF;
   - o rascunho no Gmail com o assunto `RAC INTERNA | RAC-INT-2026-0001 | Vazamento | SKU001949 | Lote 64225`;
   - a linha na aba `RACs`, as linhas em `Historico` e `Anexos`, e o dashboard.
4. Clique em "Confirmar envio à Qualidade". Com um usuário QUALIDADE, mude para *Em análise* e depois *Concluída*, e confira o histórico e o tempo médio.

---

## Limitações do MVP e próximos passos
- Vídeos: o Apps Script limita o tamanho de cada envio. Por isso o MP4 vem desativado e, quando ativado, o limite padrão é de 35 MB.
- A administração de listas e usuários é feita na planilha. Não há tela própria.
- O PDF reflete a RAC no momento da emissão e não é regerado quando o status muda.
- **Fase 2**: formulário de parecer técnico (causa provável da aba `CausasProvaveis`, fornecedor, ações corretivas e preventivas, conclusão), filtros avançados e dashboard completo. As colunas `causa_provavel`, `acao_corretiva` e `fornecedor` e as abas `Fornecedores` e `Embalagens` já existem.
- **Fase 3**: alertas de recorrência (ex.: SKU com 5+ RACs em 30 dias, lote com 3+ RACs), IA para sugerir classificação e resumo mensal.
- Para migrar para SQL (seção 41), reimplemente `DatabaseService.gs`. As regras de `Utils.gs` e dos serviços continuam valendo.
