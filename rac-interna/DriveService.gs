/**
 * DriveService.gs
 * Estrutura de pastas (seção 20): RAC Interna / AAAA / MM Mês / RAC-INT-AAAA-NNNN
 * As pastas herdam o compartilhamento da pasta raiz. Nada é tornado público.
 */

function drive_pastaRaiz() {
  return DriveApp.getFolderById(prop(PROP.ROOT_FOLDER_ID));
}

function drive_obterOuCriar(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

/** Cria (ou reaproveita) a pasta da RAC. Deve ser chamada dentro do lock de criação. */
function drive_criarPastaRac(numero, data) {
  var ano = drive_obterOuCriar(drive_pastaRaiz(), String(data.getFullYear()));
  var mes = drive_obterOuCriar(ano, nomePastaMes(data.getMonth() + 1));
  return drive_obterOuCriar(mes, numero);
}

function drive_pasta(id) {
  return DriveApp.getFolderById(id);
}

/** Salva um arquivo enviado em base64 dentro da pasta. */
function drive_salvarArquivo(pasta, base64, nome) {
  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, mimeDe(nome), nome);
  return pasta.createFile(blob);
}
