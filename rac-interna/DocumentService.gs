/**
 * DocumentService.gs
 * Gera o PDF da RAC a partir do template do Google Docs (seções 21, 22 e 40).
 * Evidências: até MAX_MINIATURAS_PDF fotos reduzidas no PDF e link para a pasta
 * com os originais (alternativa B da seção 22).
 */

/** Gera o PDF na pasta da RAC e devolve o arquivo. A cópia temporária do Doc vai para a lixeira. */
function doc_gerarPdf(rac, anexos) {
  var pasta = drive_pasta(rac.pasta_id);
  var modelo = DriveApp.getFileById(prop(PROP.TEMPLATE_DOC_ID));
  var copia = modelo.makeCopy(rac.rac_numero + ' (temporário)', pasta);
  try {
    var doc = DocumentApp.openById(copia.getId());
    var vars = variaveisTemplate(rac);
    [doc.getBody(), doc.getHeader(), doc.getFooter()].forEach(function (secao) {
      if (!secao) return;
      Object.keys(vars).forEach(function (k) { doc_substituir(secao, k, vars[k]); });
    });
    doc_inserirEvidencias(doc.getBody(), anexos);
    doc.saveAndClose();

    var nomePdf = rac.rac_numero + '.pdf';
    var antigos = pasta.getFilesByName(nomePdf);
    while (antigos.hasNext()) antigos.next().setTrashed(true);
    return pasta.createFile(copia.getAs(MimeType.PDF).setName(nomePdf));
  } finally {
    copia.setTrashed(true);
  }
}

/**
 * Troca {{CHAVE}} pelo valor sem usar expressões regulares no valor
 * (descrições podem conter "$", "\" etc.).
 */
function doc_substituir(secao, chave, valor) {
  var padrao = '\\{\\{' + chave + '\\}\\}';
  var limpo = texto(valor).replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }');
  var r = secao.findText(padrao);
  var guarda = 0;
  while (r && guarda++ < 50) {
    var t = r.getElement().asText();
    var ini = r.getStartOffset();
    t.deleteText(ini, r.getEndOffsetInclusive());
    if (limpo) t.insertText(ini, limpo);
    r = secao.findText(padrao);
  }
}

function doc_inserirEvidencias(body, anexos) {
  var r = body.findText('\\{\\{EVIDENCIAS\\}\\}');
  if (!r) return;
  var t = r.getElement().asText();
  t.deleteText(r.getStartOffset(), r.getEndOffsetInclusive());
  var paragrafo = t.getParent();

  var max = cfgNumero('MAX_MINIATURAS_PDF');
  var imagens = anexos.filter(function (a) { return /^image\//.test(a.tipo); }).slice(0, max);
  var inseridas = [];
  imagens.forEach(function (a) {
    var blob = doc_blobImagem(a.file_id, a.tipo);
    if (!blob) return;
    try {
      var img = paragrafo.appendInlineImage(blob);
      var largura = 220;
      var escala = largura / img.getWidth();
      img.setWidth(largura).setHeight(Math.round(img.getHeight() * escala));
      paragrafo.appendText('  ');
      inseridas.push(a.nome_sistema);
    } catch (e) {
      console.warn('Imagem não inserida no PDF (' + a.nome_sistema + '): ' + e.message);
    }
  });

  var nota = inseridas.length
    ? '\nImagens no documento: ' + inseridas.join(', ') + '.'
    : 'Nenhuma imagem inserida no documento.';
  nota += ' Total de evidências na pasta da RAC: ' + anexos.length + '.';
  paragrafo.appendText(nota);
}

/**
 * Versão reduzida da imagem (≈1000 px) via miniatura do Drive, para o PDF não ficar pesado.
 * Se não for possível, usa o original (somente JPEG/PNG até 5 MB).
 */
function doc_blobImagem(fileId, mime) {
  try {
    var resp = UrlFetchApp.fetch('https://drive.google.com/thumbnail?sz=w1000&id=' + encodeURIComponent(fileId), {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });
    var tipo = texto(resp.getHeaders()['Content-Type']);
    if (resp.getResponseCode() === 200 && /^image\/(jpeg|png)/.test(tipo)) return resp.getBlob();
  } catch (e) {
    console.warn('Miniatura indisponível para ' + fileId + ': ' + e.message);
  }
  if (mime === 'image/jpeg' || mime === 'image/png') {
    var f = DriveApp.getFileById(fileId);
    if (f.getSize() <= 5 * 1024 * 1024) return f.getBlob();
  }
  return null;
}
