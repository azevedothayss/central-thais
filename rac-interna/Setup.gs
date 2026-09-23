/**
 * Setup.gs
 * Execute setup() UMA VEZ pelo editor do Apps Script, com a conta do administrador.
 * Pode ser executada novamente sem duplicar nada: só cria o que estiver faltando.
 *
 * Cria:
 *  - Pasta "RAC Interna" no Drive (raiz de todas as RACs)
 *  - Planilha "RAC Interna Arvensis - Base" com todas as abas e listas iniciais
 *  - Documento "RAC Interna - Modelo do documento" (template do PDF)
 *  - O usuário que executou como ADMIN
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var log = [];

  // 1. Pasta raiz
  var pasta = _setup_abrirOuCriar(props, PROP.ROOT_FOLDER_ID,
    function (id) { return DriveApp.getFolderById(id); },
    function () { return DriveApp.createFolder('RAC Interna'); });
  log.push('Pasta raiz: ' + pasta.getUrl());
  var pastaModelos = drive_obterOuCriar(pasta, '_Sistema');

  // 2. Planilha
  var ss = _setup_abrirOuCriar(props, PROP.SPREADSHEET_ID,
    function (id) { return SpreadsheetApp.openById(id); },
    function () {
      var nova = SpreadsheetApp.create('RAC Interna Arvensis - Base');
      DriveApp.getFileById(nova.getId()).moveTo(pastaModelos);
      return nova;
    });
  _ssCache = ss;
  Object.keys(COLUNAS).forEach(function (nome) { _setup_aba(ss, nome, COLUNAS[nome]); });
  ['Sheet1', 'Página1', 'Planilha1'].forEach(function (n) {
    var a = ss.getSheetByName(n);
    if (a && a.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(a);
  });
  _setup_listas();
  log.push('Planilha: ' + ss.getUrl());

  // 3. Template do documento
  var template = _setup_abrirOuCriar(props, PROP.TEMPLATE_DOC_ID,
    function (id) { return DriveApp.getFileById(id); },
    function () { return DriveApp.getFileById(_setup_criarTemplate(pastaModelos)); });
  log.push('Modelo do documento: ' + template.getUrl());

  // 4. Administrador inicial
  var email = texto(Session.getActiveUser().getEmail()).toLowerCase() ||
    texto(Session.getEffectiveUser().getEmail()).toLowerCase();
  if (email && !db_buscarPor(ABAS.USUARIOS, 'email', email)) {
    db_inserir(ABAS.USUARIOS, { email: email, nome: email.split('@')[0], perfil: PERFIS.ADMIN, ativo: 'SIM' });
    log.push('Administrador cadastrado: ' + email);
  }

  log.push('Próximos passos: preencher EMAIL_DESTINATARIOS e DOMINIO_PERMITIDO na aba Config, ' +
    'cadastrar produtos e usuários, compartilhar a pasta "RAC Interna" com SAC e Qualidade e publicar o web app.');
  console.log(log.join('\n'));
  return log;
}

function _setup_abrirOuCriar(props, chave, abrir, criar) {
  var id = props.getProperty(chave);
  if (id) {
    try {
      var existente = abrir(id);
      if (!existente.isTrashed || !existente.isTrashed()) return existente;
    } catch (e) {
      console.warn(chave + ' inválido (' + id + '), criando novamente: ' + e.message);
    }
  }
  var novo = criar();
  props.setProperty(chave, novo.getId());
  return novo;
}

function _setup_aba(ss, nome, colunas) {
  var aba = ss.getSheetByName(nome) || ss.insertSheet(nome);
  var cab = aba.getLastColumn() ? aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(texto) : [];
  // Acrescenta colunas que faltarem (permite evoluir o sistema sem perder dados).
  var faltando = colunas.filter(function (c) { return cab.indexOf(c) === -1; });
  if (faltando.length) {
    aba.getRange(1, cab.filter(String).length + 1, 1, faltando.length).setValues([faltando]);
  }
  var total = aba.getLastColumn();
  aba.getRange(1, 1, 1, total).setFontWeight('bold').setBackground('#e8efe6');
  aba.setFrozenRows(1);
  aba.getRange(1, 1, aba.getMaxRows(), total).setNumberFormat('@');
  return aba;
}

function _setup_listas() {
  var vazia = function (nome) { return db_lerTodos(nome).length === 0; };
  if (vazia(ABAS.CATEGORIAS)) {
    db_inserirVarios(ABAS.CATEGORIAS, LISTAS_INICIAIS.categorias.map(function (n) { return { nome: n, ativo: 'SIM' }; }));
  }
  if (vazia(ABAS.SUBCATEGORIAS)) {
    db_inserirVarios(ABAS.SUBCATEGORIAS, LISTAS_INICIAIS.subcategorias.map(function (s) {
      return { categoria: s[0], nome: s[1], ativo: 'SIM' };
    }));
  }
  if (vazia(ABAS.CONDICOES)) {
    db_inserirVarios(ABAS.CONDICOES, LISTAS_INICIAIS.condicoes.map(function (n) { return { nome: n, ativo: 'SIM' }; }));
  }
  if (vazia(ABAS.CAUSAS)) {
    db_inserirVarios(ABAS.CAUSAS, LISTAS_INICIAIS.causas.map(function (n) { return { nome: n, ativo: 'SIM' }; }));
  }
  if (vazia(ABAS.STATUS)) {
    db_inserirVarios(ABAS.STATUS, STATUS_ORDEM.map(function (n, i) { return { ordem: String(i + 1), nome: n, ativo: 'SIM' }; }));
  }
  if (vazia(ABAS.PRODUTOS)) {
    db_inserir(ABAS.PRODUTOS, {
      produto_id: 'P0001', sku: 'SKU001949', nome_produto: 'Geleia Seiva by Rodrigo Vizu 300 g',
      linha: 'Seiva', categoria: 'Finalizador', volume: '300 g', tipo_embalagem: 'Pote 300 g',
      fornecedor_embalagem: '', ativo: 'SIM'
    });
  }
  var configExistente = db_lerTodos(ABAS.CONFIG).map(function (c) { return c.chave; });
  var novas = CONFIG_PADRAO.filter(function (c) { return configExistente.indexOf(c[0]) === -1; });
  if (novas.length) {
    var email = texto(Session.getEffectiveUser().getEmail()).toLowerCase();
    var dominio = email.split('@')[1] || '';
    if (dominio === 'gmail.com') dominio = '';
    db_inserirVarios(ABAS.CONFIG, novas.map(function (c) {
      return { chave: c[0], valor: c[0] === 'DOMINIO_PERMITIDO' ? dominio : c[1], descricao: c[2] };
    }));
  }
  _configCache = null;
}

/** Cria o documento modelo com as variáveis da seção 40. Retorna o ID. */
function _setup_criarTemplate(pasta) {
  var doc = DocumentApp.create('RAC Interna - Modelo do documento');
  var body = doc.getBody();
  body.setMarginTop(42).setMarginBottom(42).setMarginLeft(56).setMarginRight(56);
  var verde = '#2f5d3a';

  var marca = body.appendParagraph('ARVENSIS');
  marca.editAsText().setBold(true).setForegroundColor(verde).setFontSize(12);
  body.appendParagraph('RAC INTERNA').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Registro de Queixa Técnica').setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  body.appendParagraph('{{RAC_NUMERO}}').setHeading(DocumentApp.ParagraphHeading.HEADING1);

  var linhas = [
    ['Data de abertura', '{{DATA}}'],
    ['Status na emissão', '{{STATUS}}'],
    ['Produto', '{{PRODUTO}}'],
    ['SKU', '{{SKU}}'],
    ['Lote', '{{LOTE}}'],
    ['Nota fiscal', '{{NOTA_FISCAL}}'],
    ['Chamado Estoca', '{{CHAMADO_ESTOCA}}'],
    ['Categoria', '{{CATEGORIA}}'],
    ['Subcategoria', '{{SUBCATEGORIA}}'],
    ['Condição da embalagem externa', '{{CONDICAO_CAIXA}}'],
    ['Registrado por', '{{USUARIO}}']
  ];
  var tabela = body.appendTable(linhas);
  tabela.setBorderColor('#c9d6c5');
  for (var i = 0; i < tabela.getNumRows(); i++) {
    var c = tabela.getRow(i).getCell(0);
    c.setBackgroundColor('#eef3ec').setWidth(170);
    c.editAsText().setBold(true);
  }

  body.appendParagraph('Descrição da ocorrência').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('{{DESCRICAO}}');
  body.appendParagraph('Evidências').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('{{EVIDENCIAS}}');
  body.appendParagraph('Pasta com os arquivos originais: {{LINK_PASTA}}');
  body.appendParagraph('Observações').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('{{OBSERVACAO}}');

  var primeiro = body.getChild(0);
  if (primeiro.getType() === DocumentApp.ElementType.PARAGRAPH && primeiro.asParagraph().getText() === '') {
    primeiro.removeFromParent();
  }

  var rodape = doc.addFooter().appendParagraph(
    'Registro dos fatos observados pelo SAC. A conclusão técnica é de responsabilidade da Qualidade. ' +
    'Este documento não contém dados pessoais de clientes. Tratativa logística segue separadamente junto à Estoca.');
  rodape.editAsText().setFontSize(8).setForegroundColor('#666666');

  doc.saveAndClose();
  DriveApp.getFileById(doc.getId()).moveTo(pasta);
  return doc.getId();
}
