/**
 * Config.gs
 * Constantes do sistema e leitura de configurações.
 *
 * Tudo que é "regra fixa" do código fica aqui. O que o administrador pode
 * alterar sem mexer no código fica na aba "Config" da planilha (ver CONFIG_PADRAO).
 */

var APP_NOME = 'RAC Interna Arvensis';
var RAC_PREFIXO = 'RAC-INT';
var CHAMADO_NAO_ABERTO = 'Chamado ainda não aberto';

var ABAS = {
  RACS: 'RACs',
  HISTORICO: 'Historico',
  ANEXOS: 'Anexos',
  PRODUTOS: 'Produtos',
  CATEGORIAS: 'Categorias',
  SUBCATEGORIAS: 'Subcategorias',
  CONDICOES: 'CondicoesCaixa',
  STATUS: 'Status',
  CAUSAS: 'CausasProvaveis',
  USUARIOS: 'Usuarios',
  CONFIG: 'Config',
  FORNECEDORES: 'Fornecedores',
  EMBALAGENS: 'Embalagens'
};

/** Cabeçalhos de cada aba (ordem das colunas na planilha). */
var COLUNAS = {
  RACs: [
    'rac_id', 'rac_numero', 'data_abertura', 'hora_abertura', 'usuario_criador',
    'produto', 'sku', 'lote', 'nota_fiscal', 'chamado_estoca',
    'categoria', 'subcategoria', 'condicao_caixa', 'descricao', 'observacao',
    'status', 'responsavel_qualidade', 'data_envio_qualidade', 'data_inicio_analise',
    'data_conclusao', 'causa_provavel', 'acao_corretiva', 'fornecedor',
    'link_pasta', 'link_pdf', 'quantidade_anexos', 'ultima_atualizacao',
    'pasta_id', 'pdf_id', 'rascunho_email_id'
  ],
  Historico: [
    'id', 'rac_id', 'rac_numero', 'data_hora', 'usuario', 'acao',
    'status_anterior', 'status_novo', 'descricao'
  ],
  Anexos: [
    'id', 'rac_id', 'rac_numero', 'ordem', 'legenda', 'nome_original', 'nome_sistema',
    'tipo', 'tamanho_bytes', 'file_id', 'url', 'created_at', 'usuario'
  ],
  Produtos: [
    'produto_id', 'sku', 'nome_produto', 'linha', 'categoria', 'volume',
    'tipo_embalagem', 'fornecedor_embalagem', 'ativo'
  ],
  Categorias: ['nome', 'ativo'],
  Subcategorias: ['categoria', 'nome', 'ativo'],
  CondicoesCaixa: ['nome', 'ativo'],
  Status: ['ordem', 'nome', 'ativo'],
  CausasProvaveis: ['nome', 'ativo'],
  Usuarios: ['email', 'nome', 'perfil', 'ativo'],
  Config: ['chave', 'valor', 'descricao'],
  Fornecedores: ['fornecedor_id', 'nome', 'tipo_embalagem', 'codigo_interno', 'produtos', 'ativo'],
  Embalagens: ['embalagem_id', 'nome', 'codigo', 'fornecedor_id', 'tipo', 'ativo']
};

var STATUS = {
  ELABORACAO: 'Em elaboração',
  REGISTRADA: 'Registrada',
  ENCAMINHADA: 'Encaminhada à Qualidade',
  RECEBIDA: 'Recebida pela Qualidade',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_INFO: 'Aguardando informações',
  AGUARDANDO_FORNECEDOR: 'Aguardando fornecedor',
  ACAO_CORRETIVA: 'Ação corretiva em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada'
};

var STATUS_ORDEM = [
  STATUS.ELABORACAO, STATUS.REGISTRADA, STATUS.ENCAMINHADA, STATUS.RECEBIDA,
  STATUS.EM_ANALISE, STATUS.AGUARDANDO_INFO, STATUS.AGUARDANDO_FORNECEDOR,
  STATUS.ACAO_CORRETIVA, STATUS.CONCLUIDA, STATUS.CANCELADA
];

/** Status considerados "com a Qualidade, ainda não concluídos". */
var STATUS_EM_ANALISE = [
  STATUS.RECEBIDA, STATUS.EM_ANALISE, STATUS.AGUARDANDO_INFO,
  STATUS.AGUARDANDO_FORNECEDOR, STATUS.ACAO_CORRETIVA
];

var PERFIS = { SAC: 'SAC', QUALIDADE: 'QUALIDADE', ADMIN: 'ADMIN' };

/** Ações que cada perfil pode executar (seção 7 da especificação). */
var PERMISSOES = {
  SAC: ['criar', 'editar', 'anexar', 'visualizar', 'dashboard', 'criar_email'],
  QUALIDADE: ['visualizar', 'dashboard', 'alterar_status', 'anexar'],
  ADMIN: ['criar', 'editar', 'anexar', 'visualizar', 'dashboard', 'criar_email',
          'alterar_status', 'administrar']
};

/** Listas iniciais (seções 10, 11, 12, 18 e 30). Editáveis depois na planilha. */
var LISTAS_INICIAIS = {
  categorias: [
    'Vazamento', 'Quebra', 'Trinca', 'Tampa solta', 'Tampa quebrada', 'Problema na rosca',
    'Problema de vedação', 'Problema na válvula', 'Problema no pump', 'Frasco deformado',
    'Pote deformado', 'Embalagem primária danificada', 'Rótulo', 'Outro'
  ],
  // "*" = subcategoria válida para qualquer categoria.
  subcategorias: [
    ['*', 'Tampa'], ['*', 'Rosca'], ['*', 'Válvula'], ['*', 'Corpo do frasco'],
    ['*', 'Fundo'], ['*', 'Pump'], ['*', 'Pote'], ['*', 'Não identificado']
  ],
  condicoes: [
    'Sem avaria aparente', 'Levemente avariada', 'Muito avariada', 'Molhada',
    'Amassada', 'Perfurada', 'Violada', 'Não foi possível avaliar'
  ],
  causas: [
    'Não determinada', 'Impacto durante transporte', 'Falha de vedação', 'Problema na tampa',
    'Problema na rosca', 'Problema no frasco', 'Problema no pump', 'Problema na válvula',
    'Falha de montagem', 'Possível defeito de fabricação', 'Possível problema de fornecedor',
    'Problema de acondicionamento', 'Outros'
  ]
};

/** Legendas usadas para padronizar o nome dos arquivos de evidência. */
var LEGENDAS_EVIDENCIA = [
  'Evidência', 'Foto do produto', 'Tampa', 'Rosca', 'Válvula ou pump', 'Frasco ou pote',
  'Rótulo e lote', 'Caixa externa', 'Embalagem interna', 'Nota fiscal', 'Vídeo'
];

/** Valores padrão da aba Config: [chave, valor, descrição]. */
var CONFIG_PADRAO = [
  ['EMAIL_DESTINATARIOS', '', 'E-mails da Qualidade que recebem a RAC (separados por vírgula)'],
  ['EMAIL_CC', '', 'Cópia do e-mail (opcional, separados por vírgula)'],
  ['ASSINATURA_EMAIL', 'Equipe SAC Arvensis', 'Linha final da assinatura do e-mail'],
  ['DOMINIO_PERMITIDO', '', 'Domínio corporativo aceito no login (ex.: arvensis.com.br). Vazio = qualquer conta cadastrada em Usuarios'],
  ['LIMITE_IMAGEM_MB', '20', 'Tamanho máximo por imagem (MB)'],
  ['LIMITE_PDF_MB', '20', 'Tamanho máximo por PDF anexado (MB)'],
  ['ACEITAR_VIDEO', 'NAO', 'SIM para aceitar vídeos MP4'],
  ['LIMITE_VIDEO_MB', '35', 'Tamanho máximo por vídeo (MB). O Apps Script não aceita envios muito acima de ~35 MB'],
  ['EXIGIR_EVIDENCIA', 'SIM', 'SIM = exige ao menos uma evidência para gerar a RAC'],
  ['MAX_MINIATURAS_PDF', '4', 'Quantidade máxima de fotos inseridas no PDF (as demais ficam na pasta)']
];

/* ------------------------------------------------------------------ */
/* Leitura de propriedades e da aba Config                             */
/* ------------------------------------------------------------------ */

var PROP = {
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  ROOT_FOLDER_ID: 'ROOT_FOLDER_ID',
  TEMPLATE_DOC_ID: 'TEMPLATE_DOC_ID'
};

function prop(chave) {
  var valor = PropertiesService.getScriptProperties().getProperty(chave);
  if (!valor) {
    throw new Error('Sistema não configurado (' + chave + ' ausente). O administrador deve executar a função setup().');
  }
  return valor;
}

var _configCache = null;

/** Lê um valor da aba Config (com cache por execução). */
function cfg(chave) {
  if (!_configCache) {
    _configCache = {};
    db_lerTodos(ABAS.CONFIG).forEach(function (linha) {
      if (linha.chave) _configCache[String(linha.chave).trim()] = String(linha.valor).trim();
    });
  }
  if (Object.prototype.hasOwnProperty.call(_configCache, chave)) return _configCache[chave];
  for (var i = 0; i < CONFIG_PADRAO.length; i++) {
    if (CONFIG_PADRAO[i][0] === chave) return CONFIG_PADRAO[i][1];
  }
  return '';
}

function cfgNumero(chave) {
  var n = parseFloat(String(cfg(chave)).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function cfgSim(chave) {
  return ehAtivo(cfg(chave));
}

/** Limites de upload usados no servidor e enviados ao navegador. */
function limitesUpload() {
  return {
    imagemMb: cfgNumero('LIMITE_IMAGEM_MB') || 20,
    pdfMb: cfgNumero('LIMITE_PDF_MB') || 20,
    videoMb: cfgNumero('LIMITE_VIDEO_MB') || 35,
    aceitarVideo: cfgSim('ACEITAR_VIDEO')
  };
}
