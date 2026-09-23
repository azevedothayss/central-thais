/**
 * DatabaseService.gs
 * Única camada que conhece o Google Sheets. Cada aba funciona como uma tabela:
 * linha 1 = cabeçalho, demais linhas = registros. Todos os valores são gravados
 * como texto (formato "@") para preservar zeros à esquerda em lotes e NFs.
 *
 * Para migrar para SQL (seção 41), basta reimplementar estas funções.
 */

var _ssCache = null;

function db_planilha() {
  if (!_ssCache) _ssCache = SpreadsheetApp.openById(prop(PROP.SPREADSHEET_ID));
  return _ssCache;
}

function db_aba(nome) {
  var aba = db_planilha().getSheetByName(nome);
  if (!aba) throw new Error('Aba "' + nome + '" não encontrada. Execute setup() novamente.');
  return aba;
}

function db_cabecalho(aba) {
  var ultimaColuna = aba.getLastColumn();
  if (ultimaColuna === 0) return [];
  return aba.getRange(1, 1, 1, ultimaColuna).getDisplayValues()[0].map(function (h) { return texto(h); });
}

/** Todos os registros da aba como objetos. Cada objeto recebe _linha (nº da linha na planilha). */
function db_lerTodos(nomeAba) {
  var aba = db_aba(nomeAba);
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return [];
  var cab = db_cabecalho(aba);
  var valores = aba.getRange(2, 1, ultimaLinha - 1, cab.length).getDisplayValues();
  var out = [];
  valores.forEach(function (linha, i) {
    if (linha.join('') === '') return;
    var obj = { _linha: i + 2 };
    cab.forEach(function (c, j) { if (c) obj[c] = linha[j]; });
    out.push(obj);
  });
  return out;
}

function db_filtrar(nomeAba, fn) {
  return db_lerTodos(nomeAba).filter(fn);
}

function db_buscarPor(nomeAba, campo, valor) {
  var lista = db_lerTodos(nomeAba);
  for (var i = 0; i < lista.length; i++) {
    if (texto(lista[i][campo]) === texto(valor)) return lista[i];
  }
  return null;
}

function _db_linhaDe(cab, obj) {
  return cab.map(function (c) {
    var v = obj[c];
    return v === null || v === undefined ? '' : String(v);
  });
}

/** Insere um registro no fim da aba. */
function db_inserir(nomeAba, obj) {
  return db_inserirVarios(nomeAba, [obj]);
}

function db_inserirVarios(nomeAba, objs) {
  if (!objs.length) return;
  var aba = db_aba(nomeAba);
  var cab = db_cabecalho(aba);
  var linhas = objs.map(function (o) { return _db_linhaDe(cab, o); });
  var inicio = aba.getLastRow() + 1;
  var necessario = inicio + linhas.length - 1;
  if (necessario > aba.getMaxRows()) {
    aba.insertRowsAfter(aba.getMaxRows(), Math.max(100, necessario - aba.getMaxRows()));
  }
  var range = aba.getRange(inicio, 1, linhas.length, cab.length);
  range.setNumberFormat('@');
  range.setValues(linhas);
}

/** Atualiza os campos informados do registro cujo campoId = id. Retorna o registro atualizado. */
function db_atualizar(nomeAba, campoId, id, parcial) {
  var aba = db_aba(nomeAba);
  var cab = db_cabecalho(aba);
  var atual = db_buscarPor(nomeAba, campoId, id);
  if (!atual) throw new Error('Registro não encontrado em ' + nomeAba + ': ' + id);
  var novo = {};
  cab.forEach(function (c) { novo[c] = Object.prototype.hasOwnProperty.call(parcial, c) ? parcial[c] : atual[c]; });
  var range = aba.getRange(atual._linha, 1, 1, cab.length);
  range.setNumberFormat('@');
  range.setValues([_db_linhaDe(cab, novo)]);
  novo._linha = atual._linha;
  return novo;
}

/** Remove o campo interno _linha antes de devolver ao navegador. */
function db_limpo(obj) {
  if (!obj) return obj;
  var out = {};
  Object.keys(obj).forEach(function (k) { if (k !== '_linha') out[k] = obj[k]; });
  return out;
}
