/**
 * AuthService.gs
 * Identifica o usuário logado e controla permissões por perfil (seção 7).
 * Os perfis ficam na aba "Usuarios": email | nome | perfil (SAC, QUALIDADE, ADMIN) | ativo.
 */

var _usuarioCache = null;

function auth_usuarioAtual() {
  if (_usuarioCache) return _usuarioCache;
  var email = texto(Session.getActiveUser().getEmail()).toLowerCase();
  if (!email) {
    throw new Error('Não foi possível identificar o usuário. Acesse com sua conta corporativa Google.');
  }
  var dominio = texto(cfg('DOMINIO_PERMITIDO')).toLowerCase().replace(/^@/, '');
  if (dominio && !email.endsWith('@' + dominio)) {
    throw new Error('Acesso permitido somente para contas @' + dominio + '.');
  }
  var registro = null;
  db_lerTodos(ABAS.USUARIOS).forEach(function (u) {
    if (!registro && texto(u.email).toLowerCase() === email && ehAtivo(u.ativo)) registro = u;
  });
  if (!registro) {
    throw new Error('O usuário ' + email + ' não está cadastrado no sistema. Solicite acesso ao administrador.');
  }
  var perfil = texto(registro.perfil).toUpperCase();
  if (!PERMISSOES[perfil]) {
    throw new Error('Perfil inválido para ' + email + ': "' + registro.perfil + '". Use SAC, QUALIDADE ou ADMIN.');
  }
  _usuarioCache = { email: email, nome: texto(registro.nome) || email, perfil: perfil };
  return _usuarioCache;
}

/** Garante que o usuário atual pode executar a ação. Retorna o usuário. */
function auth_exigir(acao) {
  var u = auth_usuarioAtual();
  if (!temPermissao(u.perfil, acao)) {
    throw new Error('Seu perfil (' + u.perfil + ') não permite esta ação.');
  }
  return u;
}
