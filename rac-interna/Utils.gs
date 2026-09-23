/**
 * Utils.gs
 * Funções puras (sem chamadas a serviços Google). São testadas em tests/run.js.
 */

var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
             'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/* ------------------------------------------------------------------ */
/* Texto e datas                                                        */
/* ------------------------------------------------------------------ */

function pad(n, tamanho) {
  var s = String(n);
  while (s.length < tamanho) s = '0' + s;
  return s;
}

function texto(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function ehAtivo(v) {
  var s = texto(v).toUpperCase();
  return s === '' || s === 'SIM' || s === 'S' || s === 'TRUE' || s === 'VERDADEIRO' || s === '1' || s === 'ATIVO';
}

/** "2026-09-23 10:32:05" (texto ordenável gravado na planilha). */
function dataHoraIso(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2) + ' ' +
    pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2);
}

function dataIso(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
}

function horaCurta(d) {
  return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2);
}

/** "2026-09-23" ou "2026-09-23 10:32:05" -> "23/09/2026" ou "23/09/2026 10:32". */
function formatarDataBR(iso) {
  var s = texto(iso);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return s;
  var base = m[3] + '/' + m[2] + '/' + m[1];
  return m[4] ? base + ' ' + m[4] + ':' + m[5] : base;
}

/** Converte "AAAA-MM-DD[ HH:MM:SS]" em Date local. */
function parseIso(iso) {
  var m = texto(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

/** 9 -> "09 Setembro" (nome da pasta do mês). */
function nomePastaMes(mes) {
  return pad(mes, 2) + ' ' + MESES[mes - 1];
}

function removerAcentos(s) {
  return texto(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* ------------------------------------------------------------------ */
/* Numeração                                                            */
/* ------------------------------------------------------------------ */

function formatarNumeroRac(ano, sequencial) {
  return RAC_PREFIXO + '-' + ano + '-' + pad(sequencial, 4);
}

/** Retorna o sequencial de um número RAC do ano informado, ou 0. */
function extrairSequencial(numero, ano) {
  var m = texto(numero).match(/^RAC-INT-(\d{4})-(\d+)$/);
  if (!m || +m[1] !== +ano) return 0;
  return parseInt(m[2], 10);
}

/**
 * Próximo sequencial do ano: maior valor entre o contador salvo e os números
 * já existentes na base (protege contra contador apagado ou desatualizado).
 * A numeração reinicia a cada ano porque só números do próprio ano contam.
 */
function proximoSequencial(numerosExistentes, ano, contadorSalvo) {
  var maior = parseInt(contadorSalvo, 10) || 0;
  (numerosExistentes || []).forEach(function (n) {
    var s = extrairSequencial(n, ano);
    if (s > maior) maior = s;
  });
  return maior + 1;
}

/* ------------------------------------------------------------------ */
/* Arquivos                                                             */
/* ------------------------------------------------------------------ */

var TIPOS_ACEITOS = {
  jpg: { mime: 'image/jpeg', grupo: 'imagem' },
  jpeg: { mime: 'image/jpeg', grupo: 'imagem' },
  png: { mime: 'image/png', grupo: 'imagem' },
  webp: { mime: 'image/webp', grupo: 'imagem' },
  pdf: { mime: 'application/pdf', grupo: 'pdf' },
  mp4: { mime: 'video/mp4', grupo: 'video' }
};

function extensaoDe(nome) {
  var m = texto(nome).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

/** Nome seguro para Drive: sem acentos, sem símbolos, espaços viram "_". */
function sanitizarNomeArquivo(nome) {
  var s = removerAcentos(nome)
    .replace(/[^A-Za-z0-9._ -]+/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return s.slice(0, 60) || 'Evidencia';
}

/** (3, "Caixa externa", "IMG_2020.JPEG") -> "03_Caixa_externa.jpeg" */
function nomeEvidencia(ordem, legenda, nomeOriginal) {
  var ext = extensaoDe(nomeOriginal) || 'bin';
  return pad(ordem, 2) + '_' + sanitizarNomeArquivo(legenda || 'Evidência') + '.' + ext;
}

/**
 * Valida tipo e tamanho de um arquivo. Retorna mensagem de erro ou ''.
 * arquivo: {nome, tamanho}  limites: {imagemMb, pdfMb, videoMb, aceitarVideo}
 */
function validarArquivo(arquivo, limites) {
  var ext = extensaoDe(arquivo.nome);
  var tipo = TIPOS_ACEITOS[ext];
  if (!tipo || (tipo.grupo === 'video' && !limites.aceitarVideo)) {
    return 'Tipo de arquivo não aceito: ' + (arquivo.nome || '(sem nome)') +
      '. Aceitos: JPG, JPEG, PNG, WEBP, PDF' + (limites.aceitarVideo ? ', MP4' : '') + '.';
  }
  var limiteMb = tipo.grupo === 'imagem' ? limites.imagemMb : tipo.grupo === 'pdf' ? limites.pdfMb : limites.videoMb;
  if (arquivo.tamanho > limiteMb * 1024 * 1024) {
    return 'O arquivo ' + arquivo.nome + ' ultrapassa o limite de ' + limiteMb + ' MB.';
  }
  if (!arquivo.tamanho) return 'O arquivo ' + (arquivo.nome || '') + ' está vazio.';
  return '';
}

function mimeDe(nome) {
  var t = TIPOS_ACEITOS[extensaoDe(nome)];
  return t ? t.mime : 'application/octet-stream';
}

/** Tamanho em bytes de um conteúdo base64. */
function tamanhoBase64(b64) {
  var s = texto(b64).replace(/\s/g, '');
  var padding = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  return Math.floor(s.length * 3 / 4) - padding;
}

/* ------------------------------------------------------------------ */
/* Validação da RAC (seção 48) e LGPD (seção 50)                        */
/* ------------------------------------------------------------------ */

var CAMPOS_FORMULARIO = [
  'produto', 'sku', 'lote', 'nota_fiscal', 'chamado_estoca', 'chamado_nao_aberto',
  'categoria', 'subcategoria', 'condicao_caixa', 'descricao', 'observacao'
];

var PADROES_DADOS_PESSOAIS = [
  { nome: 'CPF', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
  { nome: 'e-mail', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { nome: 'telefone', re: /\(?\b\d{2}\)?\s?9?\d{4}-\d{4}\b/ }
];

/** Retorna o nome do tipo de dado pessoal encontrado no texto, ou ''. */
function detectarDadoPessoal(valor) {
  var s = texto(valor);
  for (var i = 0; i < PADROES_DADOS_PESSOAIS.length; i++) {
    if (PADROES_DADOS_PESSOAIS[i].re.test(s)) return PADROES_DADOS_PESSOAIS[i].nome;
  }
  return '';
}

/**
 * Valida os dados do formulário.
 * listas (opcional): {produtos:[{sku,nome_produto}], categorias:[], subcategorias:[{categoria,nome}], condicoes:[]}
 * Retorna {valido, erros:[{campo, mensagem}], dados} com os dados normalizados.
 */
function validarRac(dados, listas) {
  dados = dados || {};
  listas = listas || {};
  var erros = [];
  var d = {};

  Object.keys(dados).forEach(function (k) {
    if (CAMPOS_FORMULARIO.indexOf(k) === -1) {
      erros.push({ campo: k, mensagem: 'Campo não permitido: ' + k + '. A RAC não armazena dados do cliente.' });
    }
  });

  CAMPOS_FORMULARIO.forEach(function (k) { d[k] = k === 'chamado_nao_aberto' ? !!dados[k] : texto(dados[k]); });
  d.lote = d.lote.toUpperCase();

  function exigir(campo, rotulo) {
    if (!d[campo]) erros.push({ campo: campo, mensagem: 'Preencha o campo ' + rotulo + '.' });
  }

  exigir('produto', 'Produto');
  exigir('lote', 'Lote');
  exigir('nota_fiscal', 'Nota Fiscal');
  exigir('categoria', 'Categoria da ocorrência');
  exigir('descricao', 'Descrição');

  if (d.chamado_nao_aberto) {
    d.chamado_estoca = CHAMADO_NAO_ABERTO;
  } else if (!d.chamado_estoca) {
    erros.push({ campo: 'chamado_estoca', mensagem: 'Informe o chamado Estoca ou marque "Chamado ainda não aberto".' });
  } else if (!/^[A-Za-z0-9./-]{1,30}$/.test(d.chamado_estoca)) {
    erros.push({ campo: 'chamado_estoca', mensagem: 'Chamado Estoca deve conter apenas letras, números, ".", "/" ou "-".' });
  }

  if (d.lote && !/^[A-Z0-9./ -]{1,40}$/.test(d.lote)) {
    erros.push({ campo: 'lote', mensagem: 'Lote deve conter apenas letras, números, espaço, ".", "/" ou "-" (máx. 40).' });
  }
  if (d.nota_fiscal && !/^[A-Za-z0-9./-]{1,30}$/.test(d.nota_fiscal)) {
    erros.push({ campo: 'nota_fiscal', mensagem: 'Nota Fiscal deve conter apenas letras, números, ".", "/" ou "-".' });
  }
  if (d.descricao && d.descricao.length < 15) {
    erros.push({ campo: 'descricao', mensagem: 'Descreva a ocorrência com um pouco mais de detalhe (mín. 15 caracteres).' });
  }
  if (d.descricao.length > 3000) erros.push({ campo: 'descricao', mensagem: 'Descrição muito longa (máx. 3000 caracteres).' });
  if (d.observacao.length > 2000) erros.push({ campo: 'observacao', mensagem: 'Observação muito longa (máx. 2000 caracteres).' });

  ['descricao', 'observacao'].forEach(function (campo) {
    var tipo = detectarDadoPessoal(d[campo]);
    if (tipo) {
      erros.push({ campo: campo, mensagem: 'Parece haver ' + tipo + ' neste campo. Remova dados pessoais do cliente (LGPD).' });
    }
  });

  if (listas.produtos && d.produto) {
    var prod = null;
    listas.produtos.forEach(function (p) {
      if (!prod && d.sku && texto(p.sku).toUpperCase() === d.sku.toUpperCase()) prod = p;
    });
    if (!prod) {
      listas.produtos.forEach(function (p) {
        if (!prod && texto(p.nome_produto).toLowerCase() === d.produto.toLowerCase()) prod = p;
      });
    }
    if (!prod) {
      erros.push({ campo: 'produto', mensagem: 'Selecione um produto da lista cadastrada.' });
    } else {
      d.produto = texto(prod.nome_produto);
      d.sku = texto(prod.sku);
    }
  }
  if (listas.categorias && d.categoria && listas.categorias.indexOf(d.categoria) === -1) {
    erros.push({ campo: 'categoria', mensagem: 'Selecione uma categoria da lista.' });
  }
  if (listas.subcategorias && d.subcategoria &&
      subcategoriasDe(listas.subcategorias, d.categoria).indexOf(d.subcategoria) === -1) {
    erros.push({ campo: 'subcategoria', mensagem: 'Subcategoria inválida para a categoria selecionada.' });
  }
  if (listas.condicoes && d.condicao_caixa && listas.condicoes.indexOf(d.condicao_caixa) === -1) {
    erros.push({ campo: 'condicao_caixa', mensagem: 'Selecione uma condição da lista.' });
  }

  delete d.chamado_nao_aberto;
  return { valido: erros.length === 0, erros: erros, dados: d };
}

/** Subcategorias válidas para a categoria ("*" vale para todas). */
function subcategoriasDe(subcategorias, categoria) {
  var out = [];
  subcategorias.forEach(function (s) {
    if ((s.categoria === '*' || s.categoria === categoria) && out.indexOf(s.nome) === -1) out.push(s.nome);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Permissões e transições de status                                   */
/* ------------------------------------------------------------------ */

function temPermissao(perfil, acao) {
  var lista = PERMISSOES[texto(perfil).toUpperCase()];
  return !!lista && lista.indexOf(acao) !== -1;
}

/**
 * Status para os quais o usuário pode mover a RAC.
 * - SAC: cancela a própria RAC em elaboração; confirma envio (Registrada -> Encaminhada).
 * - QUALIDADE: qualquer status a partir de "Registrada", menos "Em elaboração". RAC concluída/cancelada só reabre com ADMIN.
 * - ADMIN: como Qualidade, e também reabre RAC concluída ou cancelada.
 */
function statusPermitidos(perfil, statusAtual, ehCriador) {
  perfil = texto(perfil).toUpperCase();
  var finais = [STATUS.CONCLUIDA, STATUS.CANCELADA];
  if (perfil === PERFIS.SAC) {
    if (statusAtual === STATUS.ELABORACAO && ehCriador) return [STATUS.CANCELADA];
    if (statusAtual === STATUS.REGISTRADA) return [STATUS.ENCAMINHADA];
    return [];
  }
  if (perfil === PERFIS.QUALIDADE || perfil === PERFIS.ADMIN) {
    if (statusAtual === STATUS.ELABORACAO) return perfil === PERFIS.ADMIN ? [STATUS.CANCELADA] : [];
    if (finais.indexOf(statusAtual) !== -1 && perfil !== PERFIS.ADMIN) return [];
    return STATUS_ORDEM.filter(function (s) { return s !== STATUS.ELABORACAO && s !== statusAtual; });
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* E-mail (seção 23)                                                    */
/* ------------------------------------------------------------------ */

function montarAssunto(rac) {
  var partes = ['RAC INTERNA', rac.rac_numero, rac.categoria];
  if (rac.sku) partes.push(rac.sku);
  partes.push('Lote ' + rac.lote);
  return partes.join(' | ');
}

/** opts: {linkPasta, qtdAnexos, remetente, assinatura} */
function montarCorpo(rac, opts) {
  opts = opts || {};
  var categoria = rac.categoria + (rac.subcategoria ? ' / ' + rac.subcategoria : '');
  var chamado = rac.chamado_estoca === CHAMADO_NAO_ABERTO ? 'ainda não aberto' : rac.chamado_estoca;
  var qtd = parseInt(opts.qtdAnexos, 10) || 0;
  var linhas = [
    'Olá, equipe da Qualidade,',
    '',
    'Informamos a abertura da RAC Interna ' + rac.rac_numero + ', registrada pelo SAC em ' +
      formatarDataBR(rac.data_abertura) + ' às ' + rac.hora_abertura + '.',
    '',
    'DADOS PRINCIPAIS',
    '• Produto: ' + rac.produto,
    '• SKU: ' + (rac.sku || '-'),
    '• Lote: ' + rac.lote,
    '• Nota fiscal: ' + rac.nota_fiscal,
    '• Chamado Estoca: ' + chamado,
    '• Categoria: ' + categoria,
    '• Condição da embalagem externa: ' + (rac.condicao_caixa || 'Não informada'),
    '',
    'DESCRIÇÃO DA OCORRÊNCIA',
    rac.descricao,
    '',
    'EVIDÊNCIAS',
    (qtd === 1 ? 'Foi anexada 1 evidência.' : 'Foram anexadas ' + qtd + ' evidências.') +
      ' O PDF da RAC segue anexo a este e-mail.' +
      (opts.linkPasta ? ' Os arquivos originais estão na pasta: ' + opts.linkPasta : ''),
    '',
    'A tratativa logística e financeira desta ocorrência segue separadamente junto à Estoca' +
      (rac.chamado_estoca === CHAMADO_NAO_ABERTO ? '.' : ' (chamado ' + chamado + ').') +
      ' Esta RAC tem finalidade técnica, estatística e preventiva.',
    '',
    'Solicitamos, por gentileza, a análise técnica da ocorrência.',
    '',
    'Atenciosamente,'
  ];
  if (opts.remetente) linhas.push(opts.remetente);
  if (opts.assinatura) linhas.push(opts.assinatura);
  return linhas.join('\n');
}

/* ------------------------------------------------------------------ */
/* Template do documento (seção 40)                                     */
/* ------------------------------------------------------------------ */

function variaveisTemplate(rac) {
  return {
    RAC_NUMERO: rac.rac_numero,
    DATA: formatarDataBR(rac.data_abertura) + ' ' + texto(rac.hora_abertura),
    PRODUTO: rac.produto,
    SKU: rac.sku || '-',
    LOTE: rac.lote,
    NOTA_FISCAL: rac.nota_fiscal,
    CHAMADO_ESTOCA: rac.chamado_estoca,
    CATEGORIA: rac.categoria,
    SUBCATEGORIA: rac.subcategoria || '-',
    CONDICAO_CAIXA: rac.condicao_caixa || 'Não informada',
    DESCRICAO: rac.descricao,
    OBSERVACAO: rac.observacao || '-',
    STATUS: rac.status,
    USUARIO: rac.usuario_criador,
    QTD_ANEXOS: texto(rac.quantidade_anexos) || '0',
    LINK_PASTA: rac.link_pasta || '-'
  };
}

/** Substitui {{CHAVE}} num texto (usado nos testes e como referência). */
function preencherTemplate(modelo, vars) {
  return texto(modelo).replace(/\{\{([A-Z_]+)\}\}/g, function (m, k) {
    return Object.prototype.hasOwnProperty.call(vars, k) ? texto(vars[k]) : m;
  });
}

/* ------------------------------------------------------------------ */
/* Consulta (seção 46)                                                  */
/* ------------------------------------------------------------------ */

/** filtros: {texto, status, categoria, de, ate} (datas AAAA-MM-DD). */
function filtrarRacs(racs, filtros) {
  filtros = filtros || {};
  var termo = removerAcentos(texto(filtros.texto)).toLowerCase();
  var campos = ['rac_numero', 'sku', 'produto', 'lote', 'nota_fiscal', 'chamado_estoca', 'categoria', 'subcategoria', 'status'];
  return racs.filter(function (r) {
    if (filtros.status && r.status !== filtros.status) return false;
    if (filtros.categoria && r.categoria !== filtros.categoria) return false;
    if (filtros.de && texto(r.data_abertura) < filtros.de) return false;
    if (filtros.ate && texto(r.data_abertura) > filtros.ate) return false;
    if (!termo) return true;
    return campos.some(function (c) {
      return removerAcentos(texto(r[c])).toLowerCase().indexOf(termo) !== -1;
    });
  }).sort(function (a, b) {
    return texto(b.data_abertura + b.hora_abertura + b.rac_numero)
      .localeCompare(texto(a.data_abertura + a.hora_abertura + a.rac_numero));
  });
}

/* ------------------------------------------------------------------ */
/* Dashboard (seções 32 e 33)                                           */
/* ------------------------------------------------------------------ */

/** Conta registros por campo. Retorna [{chave, total}] em ordem decrescente. */
function agregarPor(registros, campoOuFn, limite) {
  var mapa = {};
  registros.forEach(function (r) {
    var k = typeof campoOuFn === 'function' ? campoOuFn(r) : r[campoOuFn];
    k = texto(k) || 'Não informado';
    mapa[k] = (mapa[k] || 0) + 1;
  });
  var lista = Object.keys(mapa).map(function (k) { return { chave: k, total: mapa[k] }; });
  lista.sort(function (a, b) { return b.total - a.total || a.chave.localeCompare(b.chave); });
  return limite ? lista.slice(0, limite) : lista;
}

/** Últimos N meses (inclusive o atual) com contagem, em ordem cronológica. */
function serieMensal(registros, hoje, meses) {
  var out = [];
  for (var i = meses - 1; i >= 0; i--) {
    var d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    var chave = d.getFullYear() + '-' + pad(d.getMonth() + 1, 2);
    out.push({ chave: chave, rotulo: MESES[d.getMonth()].slice(0, 3) + '/' + String(d.getFullYear()).slice(2), total: 0 });
  }
  registros.forEach(function (r) {
    var k = texto(r.data_abertura).slice(0, 7);
    out.forEach(function (m) { if (m.chave === k) m.total++; });
  });
  return out;
}

/**
 * Indicadores do dashboard.
 * Considera todas as RACs, exceto "Em elaboração" e "Cancelada".
 * produtos (opcional) permite agrupar por tipo de embalagem e fornecedor.
 */
function calcularDashboard(todas, produtos, hoje) {
  var racs = todas.filter(function (r) {
    return r.status !== STATUS.ELABORACAO && r.status !== STATUS.CANCELADA;
  });
  var mesAtual = hoje.getFullYear() + '-' + pad(hoje.getMonth() + 1, 2);
  var porSku = {};
  (produtos || []).forEach(function (p) { porSku[texto(p.sku).toUpperCase()] = p; });
  function produtoDe(r) { return porSku[texto(r.sku).toUpperCase()] || {}; }

  var tempos = [];
  racs.forEach(function (r) {
    if (r.status !== STATUS.CONCLUIDA) return;
    var ini = parseIso(r.data_envio_qualidade) || parseIso(r.data_abertura);
    var fim = parseIso(r.data_conclusao);
    if (ini && fim && fim >= ini) tempos.push((fim - ini) / 86400000);
  });
  var tempoMedio = tempos.length ? tempos.reduce(function (a, b) { return a + b; }, 0) / tempos.length : null;

  return {
    total: racs.length,
    noMes: racs.filter(function (r) { return texto(r.data_abertura).slice(0, 7) === mesAtual; }).length,
    concluidas: racs.filter(function (r) { return r.status === STATUS.CONCLUIDA; }).length,
    emAnalise: racs.filter(function (r) { return STATUS_EM_ANALISE.indexOf(r.status) !== -1; }).length,
    aguardandoQualidade: racs.filter(function (r) {
      return r.status === STATUS.REGISTRADA || r.status === STATUS.ENCAMINHADA;
    }).length,
    tempoMedioDias: tempoMedio === null ? null : Math.round(tempoMedio * 10) / 10,
    porMes: serieMensal(racs, hoje, 12),
    porProduto: agregarPor(racs, 'produto', 10),
    porSku: agregarPor(racs, 'sku', 10),
    porLote: agregarPor(racs, function (r) { return r.lote ? r.lote + ' (' + r.sku + ')' : ''; }, 10),
    porCategoria: agregarPor(racs, 'categoria'),
    porSubcategoria: agregarPor(racs, 'subcategoria'),
    porCondicaoCaixa: agregarPor(racs, 'condicao_caixa'),
    porTipoEmbalagem: agregarPor(racs, function (r) { return produtoDe(r).tipo_embalagem; }, 10),
    porFornecedor: agregarPor(racs, function (r) { return r.fornecedor || produtoDe(r).fornecedor_embalagem; }, 10),
    porStatus: agregarPor(todas.filter(function (r) { return r.status !== STATUS.ELABORACAO; }), 'status')
  };
}
