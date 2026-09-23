/**
 * EmailService.gs
 * Nível 2 da seção 24: cria um RASCUNHO no Gmail de quem está usando o sistema.
 * O SAC revisa e clica em enviar. Assunto e corpo também ficam disponíveis
 * para copiar (Nível 1), caso o rascunho não possa ser criado.
 */

function email_conteudo(rac, usuario) {
  return {
    para: texto(cfg('EMAIL_DESTINATARIOS')),
    cc: texto(cfg('EMAIL_CC')),
    assunto: montarAssunto(rac),
    corpo: montarCorpo(rac, {
      linkPasta: rac.link_pasta,
      qtdAnexos: rac.quantidade_anexos,
      remetente: usuario ? usuario.nome : '',
      assinatura: cfg('ASSINATURA_EMAIL')
    })
  };
}

/** Cria o rascunho com o PDF anexado. Retorna {draftId, link, para, assunto, corpo}. */
function email_criarRascunho(rac, usuario) {
  var c = email_conteudo(rac, usuario);
  if (!c.para) {
    throw new Error('Nenhum destinatário configurado. O administrador deve preencher EMAIL_DESTINATARIOS na aba Config.');
  }
  var opcoes = {};
  if (c.cc) opcoes.cc = c.cc;
  if (rac.pdf_id) opcoes.attachments = [DriveApp.getFileById(rac.pdf_id).getBlob()];
  var draft = GmailApp.createDraft(c.para, c.assunto, c.corpo, opcoes);
  c.draftId = draft.getId();
  c.link = 'https://mail.google.com/mail/#drafts?compose=' + draft.getMessage().getId();
  return c;
}
