/**
 * RacService.gs
 * Regras de negócio da RAC: criar, editar, anexar, finalizar, consultar e mudar status.
 * Toda ação relevante gera uma linha na aba Historico, que nunca é sobrescrita (seção 31).
 */

/* ------------------------------------------------------------------ */
/* Listas de apoio                                                     */
/* ------------------------------------------------------------------ */

function rac_listas() {
  var ativos = function (l) { return l.filter(function (r) { return ehAtivo(r.ativo); }); };
  var nomes = function (l) { return ativos(l).map(function (r) { return texto(r.nome); }).filter(String); };
  var status = ativos(db_lerTodos(ABAS.STATUS))
    .sort(function (a, b) { return (+a.ordem || 0) - (+b.ordem || 0); })
    .map(function (r) { return texto(r.nome); });
  return {
    produtos: ativos(db_lerTodos(ABAS.PRODUTOS)).map(function (p) {
      return { sku: texto(p.sku), nome_produto: texto(p.nome_produto), linha: texto(p.linha), tipo_embalagem: texto(p.tipo_embalagem) };
    }).filter(function (p) { return p.nome_produto; }),
    categorias: nomes(db_lerTodos(ABAS.CATEGORIAS)),
    subcategorias: ativos(db_lerTodos(ABAS.SUBCATEGORIAS)).map(function (s) {
      return { categoria: texto(s.categoria) || '*', nome: texto(s.nome) };
    }).filter(function (s) { return s.nome; }),
    condicoes: nomes(db_lerTodos(ABAS.CONDICOES)),
    status: status.length ? status : STATUS_ORDEM,
    legendas: LEGENDAS_EVIDENCIA
  };
}

/* ------------------------------------------------------------------ */
/* Histórico                                                           */
/* ------------------------------------------------------------------ */

function rac_registrarHistorico(rac, usuario, acao, descricao, statusAnterior, statusNovo) {
  db_inserir(ABAS.HISTORICO, {
    id: Utilities.getUuid(),
    rac_id: rac.rac_id,
    rac_numero: rac.rac_numero,
    data_hora: dataHoraIso(new Date()),
    usuario: usuario.email,
    acao: acao,
    status_anterior: statusAnterior || '',
    status_novo: statusNovo || '',
    descricao: descricao || ''
  });
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

function rac_obterRegistro(racId) {
  var rac = db_buscarPor(ABAS.RACS, 'rac_id', racId);
  if (!rac) throw new Error('RAC não encontrada.');
  return rac;
}

function rac_anexosDe(racId) {
  return db_filtrar(ABAS.ANEXOS, function (a) { return a.rac_id === racId; })
    .sort(function (a, b) { return (+a.ordem) - (+b.ordem); });
}

function _rac_erroValidacao(erros) {
  var e = new Error(erros.map(function (x) { return x.mensagem; }).join(' '));
  e.erros = erros;
  return e;
}

/* ------------------------------------------------------------------ */
/* Criação e edição                                                    */
/* ------------------------------------------------------------------ */

/**
 * Etapa 1 do "Gerar RAC": valida, gera número, grava registro e cria a pasta.
 * A RAC nasce "Em elaboração" e só vira "Registrada" em rac_finalizar.
 */
function rac_criar(dados, usuario) {
  var v = validarRac(dados, rac_listas());
  if (!v.valido) throw _rac_erroValidacao(v.erros);

  var agora = new Date();
  var ano = agora.getFullYear();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var rac;
  try {
    var props = PropertiesService.getScriptProperties();
    var chaveSeq = 'SEQ_' + ano;
    var existentes = db_lerTodos(ABAS.RACS).map(function (r) { return r.rac_numero; });
    var seq = proximoSequencial(existentes, ano, props.getProperty(chaveSeq));
    var numero = formatarNumeroRac(ano, seq);
    var pasta = drive_criarPastaRac(numero, agora);

    rac = {
      rac_id: Utilities.getUuid(),
      rac_numero: numero,
      data_abertura: dataIso(agora),
      hora_abertura: horaCurta(agora),
      usuario_criador: usuario.email,
      status: STATUS.ELABORACAO,
      link_pasta: pasta.getUrl(),
      pasta_id: pasta.getId(),
      quantidade_anexos: '0',
      ultima_atualizacao: dataHoraIso(agora)
    };
    Object.keys(v.dados).forEach(function (k) { rac[k] = v.dados[k]; });
    db_inserir(ABAS.RACS, rac);
    props.setProperty(chaveSeq, String(seq));
  } finally {
    lock.releaseLock();
  }
  rac_registrarHistorico(rac, usuario, 'RAC criada', 'RAC criada por ' + usuario.perfil + ' (' + usuario.email + ').', '', STATUS.ELABORACAO);
  return rac;
}

function _rac_exigirEdicao(rac, usuario) {
  if (rac.status !== STATUS.ELABORACAO) throw new Error('Só é possível editar uma RAC em elaboração.');
  if (usuario.perfil !== PERFIS.ADMIN && rac.usuario_criador !== usuario.email) {
    throw new Error('Somente quem criou a RAC pode editá-la.');
  }
}

function rac_editar(racId, dados, usuario) {
  var rac = rac_obterRegistro(racId);
  _rac_exigirEdicao(rac, usuario);
  var v = validarRac(dados, rac_listas());
  if (!v.valido) throw _rac_erroValidacao(v.erros);
  var parcial = { ultima_atualizacao: dataHoraIso(new Date()) };
  var alterados = [];
  Object.keys(v.dados).forEach(function (k) {
    if (texto(rac[k]) !== texto(v.dados[k])) alterados.push(k);
    parcial[k] = v.dados[k];
  });
  rac = db_atualizar(ABAS.RACS, 'rac_id', racId, parcial);
  if (alterados.length) rac_registrarHistorico(rac, usuario, 'RAC editada', 'Campos alterados: ' + alterados.join(', ') + '.');
  return rac;
}

/* ------------------------------------------------------------------ */
/* Anexos                                                              */
/* ------------------------------------------------------------------ */

/** arquivo: {nome, legenda, base64} */
function rac_anexar(racId, arquivo, usuario) {
  var rac = rac_obterRegistro(racId);
  if (rac.status === STATUS.CONCLUIDA || rac.status === STATUS.CANCELADA) {
    throw new Error('Não é possível anexar evidências a uma RAC ' + rac.status.toLowerCase() + '.');
  }
  if (usuario.perfil === PERFIS.SAC && rac.status === STATUS.ELABORACAO && rac.usuario_criador !== usuario.email) {
    throw new Error('Somente quem criou a RAC pode anexar evidências enquanto ela está em elaboração.');
  }
  var tamanho = tamanhoBase64(arquivo.base64);
  var erro = validarArquivo({ nome: arquivo.nome, tamanho: tamanho }, limitesUpload());
  if (erro) throw new Error(erro);

  var legenda = LEGENDAS_EVIDENCIA.indexOf(arquivo.legenda) !== -1 ? arquivo.legenda : 'Evidência';
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  var registro;
  try {
    var anexos = rac_anexosDe(racId);
    var ordem = anexos.reduce(function (m, a) { return Math.max(m, +a.ordem || 0); }, 0) + 1;
    var nome = nomeEvidencia(ordem, legenda, arquivo.nome);
    var file = drive_salvarArquivo(drive_pasta(rac.pasta_id), arquivo.base64, nome);
    registro = {
      id: Utilities.getUuid(),
      rac_id: rac.rac_id,
      rac_numero: rac.rac_numero,
      ordem: String(ordem),
      legenda: legenda,
      nome_original: texto(arquivo.nome).slice(0, 200),
      nome_sistema: nome,
      tipo: mimeDe(arquivo.nome),
      tamanho_bytes: String(tamanho),
      file_id: file.getId(),
      url: file.getUrl(),
      created_at: dataHoraIso(new Date()),
      usuario: usuario.email
    };
    db_inserir(ABAS.ANEXOS, registro);
    db_atualizar(ABAS.RACS, 'rac_id', racId, {
      quantidade_anexos: String(anexos.length + 1),
      ultima_atualizacao: dataHoraIso(new Date())
    });
  } finally {
    lock.releaseLock();
  }
  // Durante a criação o histórico registra o total em rac_finalizar; depois, cada anexo.
  if (rac.status !== STATUS.ELABORACAO) {
    rac_registrarHistorico(rac, usuario, 'Evidência anexada', registro.nome_sistema);
  }
  return registro;
}

/* ------------------------------------------------------------------ */
/* Finalização: PDF + rascunho de e-mail                               */
/* ------------------------------------------------------------------ */

/**
 * Etapa final do "Gerar RAC" (seção 19): confere evidências, gera o PDF,
 * muda para "Registrada" e prepara o rascunho do e-mail.
 * Falha no e-mail não desfaz a RAC: o usuário pode tentar de novo depois.
 */
function rac_finalizar(racId, usuario) {
  var rac = rac_obterRegistro(racId);
  _rac_exigirEdicao(rac, usuario);
  var anexos = rac_anexosDe(racId);
  if (!anexos.length && cfgSim('EXIGIR_EVIDENCIA')) {
    throw _rac_erroValidacao([{ campo: 'evidencias', mensagem: 'Anexe pelo menos uma evidência.' }]);
  }
  if (anexos.length) {
    rac_registrarHistorico(rac, usuario, 'Evidências anexadas',
      anexos.length + (anexos.length === 1 ? ' evidência anexada.' : ' evidências anexadas.'));
  }

  rac.status = STATUS.REGISTRADA;
  rac.quantidade_anexos = String(anexos.length);
  var pdf = doc_gerarPdf(rac, anexos);
  rac = db_atualizar(ABAS.RACS, 'rac_id', racId, {
    status: STATUS.REGISTRADA,
    link_pdf: pdf.getUrl(),
    pdf_id: pdf.getId(),
    quantidade_anexos: String(anexos.length),
    ultima_atualizacao: dataHoraIso(new Date())
  });
  rac_registrarHistorico(rac, usuario, 'PDF gerado', pdf.getName());
  rac_registrarHistorico(rac, usuario, 'Status alterado', '', STATUS.ELABORACAO, STATUS.REGISTRADA);

  var email;
  try {
    email = rac_criarEmail(racId, usuario);
  } catch (e) {
    email = email_conteudo(rac, usuario);
    email.erro = e.message;
  }
  return { rac: db_limpo(rac_obterRegistro(racId)), email: email };
}

function rac_criarEmail(racId, usuario) {
  var rac = rac_obterRegistro(racId);
  if (rac.status === STATUS.ELABORACAO) throw new Error('Finalize a RAC antes de criar o e-mail.');
  var email = email_criarRascunho(rac, usuario);
  db_atualizar(ABAS.RACS, 'rac_id', racId, { rascunho_email_id: email.draftId });
  rac_registrarHistorico(rac, usuario, 'Rascunho de e-mail criado', 'Para: ' + email.para + ' | ' + email.assunto);
  return email;
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

function rac_alterarStatus(racId, novoStatus, comentario, usuario) {
  var rac = rac_obterRegistro(racId);
  var permitidos = statusPermitidos(usuario.perfil, rac.status, rac.usuario_criador === usuario.email);
  if (permitidos.indexOf(novoStatus) === -1) {
    throw new Error('Mudança de "' + rac.status + '" para "' + novoStatus + '" não permitida para o perfil ' + usuario.perfil + '.');
  }
  comentario = texto(comentario).slice(0, 2000);
  if (detectarDadoPessoal(comentario)) throw new Error('Remova dados pessoais do cliente do comentário (LGPD).');

  var agora = dataHoraIso(new Date());
  var parcial = { status: novoStatus, ultima_atualizacao: agora };
  if (novoStatus === STATUS.ENCAMINHADA && !rac.data_envio_qualidade) parcial.data_envio_qualidade = agora;
  if (novoStatus === STATUS.EM_ANALISE && !rac.data_inicio_analise) parcial.data_inicio_analise = agora;
  if (novoStatus === STATUS.CONCLUIDA) parcial.data_conclusao = agora;
  if (novoStatus !== STATUS.CONCLUIDA && rac.data_conclusao) parcial.data_conclusao = '';
  if (usuario.perfil !== PERFIS.SAC && !rac.responsavel_qualidade && novoStatus !== STATUS.CANCELADA) {
    parcial.responsavel_qualidade = usuario.email;
  }
  var atualizado = db_atualizar(ABAS.RACS, 'rac_id', racId, parcial);
  rac_registrarHistorico(atualizado, usuario, 'Status alterado', comentario, rac.status, novoStatus);
  return atualizado;
}

/* ------------------------------------------------------------------ */
/* Consulta                                                            */
/* ------------------------------------------------------------------ */

var CAMPOS_LISTAGEM = ['rac_id', 'rac_numero', 'data_abertura', 'hora_abertura', 'produto', 'sku',
  'lote', 'nota_fiscal', 'chamado_estoca', 'categoria', 'subcategoria', 'status', 'usuario_criador',
  'quantidade_anexos'];

function rac_pesquisar(filtros) {
  return filtrarRacs(db_lerTodos(ABAS.RACS), filtros).slice(0, 500).map(function (r) {
    var o = {};
    CAMPOS_LISTAGEM.forEach(function (c) { o[c] = r[c]; });
    return o;
  });
}

/** Detalhe completo (seção 47) com anexos, histórico e ações permitidas ao usuário. */
function rac_detalhe(racId, usuario) {
  var rac = db_limpo(rac_obterRegistro(racId));
  var ehCriador = rac.usuario_criador === usuario.email;
  var editavel = rac.status === STATUS.ELABORACAO && (ehCriador || usuario.perfil === PERFIS.ADMIN);
  return {
    rac: rac,
    anexos: rac_anexosDe(racId).map(db_limpo),
    historico: db_filtrar(ABAS.HISTORICO, function (h) { return h.rac_id === racId; })
      .map(db_limpo)
      .sort(function (a, b) { return texto(a.data_hora).localeCompare(texto(b.data_hora)); }),
    acoes: {
      statusPermitidos: statusPermitidos(usuario.perfil, rac.status, ehCriador),
      continuarPreenchimento: editavel && temPermissao(usuario.perfil, 'editar'),
      anexar: temPermissao(usuario.perfil, 'anexar') && !editavel &&
        rac.status !== STATUS.CONCLUIDA && rac.status !== STATUS.CANCELADA && rac.status !== STATUS.ELABORACAO,
      criarEmail: temPermissao(usuario.perfil, 'criar_email') && rac.status !== STATUS.ELABORACAO &&
        rac.status !== STATUS.CANCELADA
    }
  };
}
