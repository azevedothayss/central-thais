/**
 * Code.gs
 * Ponto de entrada do web app e funções chamadas pelo navegador (google.script.run).
 * Toda função api_* verifica permissão e devolve {ok, dados} ou {ok:false, mensagem, erros}.
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP_NOME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Usado nos templates HTML: <?!= include('Styles') ?> */
function include(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

function _api(acao, fn) {
  try {
    var usuario = auth_exigir(acao);
    return { ok: true, dados: fn(usuario) };
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    return { ok: false, mensagem: e.message || String(e), erros: e.erros || [] };
  }
}

/** Dados iniciais da tela: usuário, listas, limites e (para ADMIN) links de administração. */
function api_contexto() {
  return _api('visualizar', function (u) {
    var ctx = {
      usuario: u,
      permissoes: PERMISSOES[u.perfil],
      listas: rac_listas(),
      limites: limitesUpload(),
      exigirEvidencia: cfgSim('EXIGIR_EVIDENCIA'),
      chamadoNaoAberto: CHAMADO_NAO_ABERTO,
      statusFixos: STATUS
    };
    if (u.perfil === PERFIS.ADMIN) {
      ctx.admin = {
        planilha: db_planilha().getUrl(),
        pastaRaiz: drive_pastaRaiz().getUrl(),
        template: 'https://docs.google.com/document/d/' + prop(PROP.TEMPLATE_DOC_ID) + '/edit',
        destinatarios: cfg('EMAIL_DESTINATARIOS'),
        dominio: cfg('DOMINIO_PERMITIDO'),
        usuarios: db_lerTodos(ABAS.USUARIOS).map(db_limpo)
      };
    }
    return ctx;
  });
}

function api_criarRac(dados) {
  return _api('criar', function (u) {
    var rac = rac_criar(dados, u);
    return { rac_id: rac.rac_id, rac_numero: rac.rac_numero };
  });
}

function api_editarRac(racId, dados) {
  return _api('editar', function (u) {
    var rac = rac_editar(racId, dados, u);
    return { rac_id: rac.rac_id, rac_numero: rac.rac_numero };
  });
}

function api_enviarAnexo(racId, arquivo) {
  return _api('anexar', function (u) {
    return db_limpo(rac_anexar(racId, arquivo, u));
  });
}

function api_finalizarRac(racId) {
  return _api('criar', function (u) { return rac_finalizar(racId, u); });
}

function api_criarEmail(racId) {
  return _api('criar_email', function (u) { return rac_criarEmail(racId, u); });
}

function api_textoEmail(racId) {
  return _api('visualizar', function (u) { return email_conteudo(rac_obterRegistro(racId), u); });
}

function api_pesquisar(filtros) {
  return _api('visualizar', function () { return rac_pesquisar(filtros || {}); });
}

function api_obterRac(racId) {
  return _api('visualizar', function (u) { return rac_detalhe(racId, u); });
}

/** Mudança de status: a regra fina por perfil está em statusPermitidos (Utils.gs). */
function api_alterarStatus(racId, novoStatus, comentario) {
  return _api('visualizar', function (u) {
    rac_alterarStatus(racId, novoStatus, comentario, u);
    return rac_detalhe(racId, u);
  });
}

function api_dashboard() {
  return _api('dashboard', function () { return dash_calcular(); });
}
