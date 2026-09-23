#!/usr/bin/env node
/**
 * Testes das funções puras (Config.gs + Utils.gs).
 * Uso: node rac-interna/tests/run.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const raiz = path.join(__dirname, '..');
const ctx = vm.createContext({ console });
['Config.gs', 'Utils.gs'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
});
const G = ctx;

let ok = 0;
let falhas = 0;
function teste(nome, fn) {
  try {
    fn();
    ok++;
    console.log('  ✓ ' + nome);
  } catch (e) {
    falhas++;
    console.log('  ✗ ' + nome + '\n    ' + e.message);
  }
}
// Objetos criados dentro do vm têm outro protótipo; normaliza para comparar.
const js = (v) => JSON.parse(JSON.stringify(v));

const produtos = [{ sku: 'SKU001949', nome_produto: 'Geleia Seiva by Rodrigo Vizu 300 g', tipo_embalagem: 'Pote 300 g', fornecedor_embalagem: 'Fornecedor X' }];
const listas = {
  produtos,
  categorias: G.LISTAS_INICIAIS.categorias,
  subcategorias: G.LISTAS_INICIAIS.subcategorias.map((s) => ({ categoria: s[0], nome: s[1] })),
  condicoes: G.LISTAS_INICIAIS.condicoes
};
const valido = () => ({
  produto: 'Geleia Seiva by Rodrigo Vizu 300 g', sku: 'SKU001949', lote: '64225', nota_fiscal: '87432',
  chamado_estoca: '321987', chamado_nao_aberto: false, categoria: 'Vazamento', subcategoria: 'Tampa',
  condicao_caixa: 'Sem avaria aparente',
  descricao: 'Cliente relatou produto vazando dentro da embalagem. Nas imagens é possível observar concentração de produto na região da tampa.',
  observacao: ''
});

console.log('Numeração');
teste('formata RAC-INT-AAAA-NNNN', () => {
  assert.strictEqual(G.formatarNumeroRac(2026, 47), 'RAC-INT-2026-0047');
  assert.strictEqual(G.formatarNumeroRac(2026, 12345), 'RAC-INT-2026-12345');
});
teste('próximo sequencial usa o maior entre contador e base', () => {
  const nums = ['RAC-INT-2026-0001', 'RAC-INT-2026-0046', 'RAC-INT-2025-0300'];
  assert.strictEqual(G.proximoSequencial(nums, 2026, '10'), 47);
  assert.strictEqual(G.proximoSequencial(nums, 2026, '60'), 61);
});
teste('numeração reinicia na virada do ano', () => {
  assert.strictEqual(G.proximoSequencial(['RAC-INT-2026-0500'], 2027, null), 1);
});

console.log('Validação');
teste('aceita o exemplo da seção 55', () => {
  const r = G.validarRac(valido(), listas);
  assert.deepStrictEqual(js(r.erros), []);
  assert.strictEqual(r.valido, true);
  assert.strictEqual(r.dados.sku, 'SKU001949');
});
teste('exige produto, lote, NF, categoria e descrição', () => {
  const r = G.validarRac({}, listas);
  const campos = r.erros.map((e) => e.campo);
  ['produto', 'lote', 'nota_fiscal', 'categoria', 'descricao', 'chamado_estoca'].forEach((c) => assert.ok(campos.includes(c), c));
});
teste('"chamado ainda não aberto" dispensa o número', () => {
  const d = Object.assign(valido(), { chamado_estoca: '', chamado_nao_aberto: true });
  const r = G.validarRac(d, listas);
  assert.strictEqual(r.valido, true);
  assert.strictEqual(r.dados.chamado_estoca, G.CHAMADO_NAO_ABERTO);
});
teste('SKU vem do cadastro, não do navegador', () => {
  const r = G.validarRac(Object.assign(valido(), { sku: 'OUTRO' }), listas);
  assert.strictEqual(r.valido, true);
  assert.strictEqual(r.dados.sku, 'SKU001949');
});
teste('rejeita produto fora da lista e subcategoria inválida', () => {
  const r = G.validarRac(Object.assign(valido(), { produto: 'Inexistente', sku: '', subcategoria: 'Xyz' }), listas);
  const campos = r.erros.map((e) => e.campo);
  assert.ok(campos.includes('produto'));
  assert.ok(campos.includes('subcategoria'));
});
teste('lote alfanumérico é aceito e normalizado', () => {
  const r = G.validarRac(Object.assign(valido(), { lote: 'ab-123/9' }), listas);
  assert.strictEqual(r.valido, true);
  assert.strictEqual(r.dados.lote, 'AB-123/9');
});
teste('LGPD: bloqueia campos de cliente e dados pessoais no texto', () => {
  let r = G.validarRac(Object.assign(valido(), { nome_cliente: 'Maria' }), listas);
  assert.ok(r.erros.some((e) => e.campo === 'nome_cliente'));
  r = G.validarRac(Object.assign(valido(), { descricao: 'Cliente de CPF 123.456.789-00 relatou vazamento na tampa.' }), listas);
  assert.ok(r.erros.some((e) => e.campo === 'descricao' && /CPF/.test(e.mensagem)));
  r = G.validarRac(Object.assign(valido(), { observacao: 'Contato: cliente@exemplo.com' }), listas);
  assert.ok(r.erros.some((e) => e.campo === 'observacao'));
  r = G.validarRac(Object.assign(valido(), { observacao: 'Ligar para (11) 98765-4321' }), listas);
  assert.ok(r.erros.some((e) => e.campo === 'observacao'));
});

console.log('Arquivos');
const lim = { imagemMb: 20, pdfMb: 20, videoMb: 35, aceitarVideo: false };
teste('aceita JPG/PNG/WEBP/PDF e recusa MP4 quando desativado', () => {
  ['a.jpg', 'a.JPEG', 'a.png', 'a.webp', 'a.pdf'].forEach((n) => assert.strictEqual(G.validarArquivo({ nome: n, tamanho: 1000 }, lim), ''));
  assert.notStrictEqual(G.validarArquivo({ nome: 'v.mp4', tamanho: 1000 }, lim), '');
  assert.strictEqual(G.validarArquivo({ nome: 'v.mp4', tamanho: 1000 }, Object.assign({}, lim, { aceitarVideo: true })), '');
  assert.notStrictEqual(G.validarArquivo({ nome: 'x.exe', tamanho: 1000 }, lim), '');
});
teste('respeita limite de tamanho', () => {
  assert.notStrictEqual(G.validarArquivo({ nome: 'a.jpg', tamanho: 21 * 1024 * 1024 }, lim), '');
});
teste('padroniza nome do arquivo', () => {
  assert.strictEqual(G.nomeEvidencia(3, 'Caixa externa', 'IMG_2020.JPEG'), '03_Caixa_externa.jpeg');
  assert.strictEqual(G.nomeEvidencia(1, 'Válvula ou pump', 'x.png'), '01_Valvula_ou_pump.png');
  assert.strictEqual(G.nomeEvidencia(12, '', 'foto'), '12_Evidencia.bin');
});
teste('calcula tamanho de base64', () => {
  assert.strictEqual(G.tamanhoBase64(Buffer.from('abcde').toString('base64')), 5);
  assert.strictEqual(G.tamanhoBase64(Buffer.from('abcdef').toString('base64')), 6);
});
teste('pasta do mês', () => assert.strictEqual(G.nomePastaMes(9), '09 Setembro'));

console.log('E-mail e documento');
const rac = Object.assign(valido(), {
  rac_numero: 'RAC-INT-2026-0047', data_abertura: '2026-09-23', hora_abertura: '10:32',
  status: 'Registrada', link_pasta: 'https://drive/x', quantidade_anexos: '4', usuario_criador: 'sac@arvensis.com.br'
});
teste('assunto no padrão da seção 23', () => {
  assert.strictEqual(G.montarAssunto(rac), 'RAC INTERNA | RAC-INT-2026-0047 | Vazamento | SKU001949 | Lote 64225');
});
teste('corpo contém dados, anexos e aviso da tratativa logística', () => {
  const c = G.montarCorpo(rac, { linkPasta: rac.link_pasta, qtdAnexos: 4, remetente: 'Ana', assinatura: 'Equipe SAC Arvensis' });
  ['RAC-INT-2026-0047', '23/09/2026', 'Lote: 64225', 'Chamado Estoca: 321987', 'Vazamento / Tampa',
    'Foram anexadas 4 evidências', 'https://drive/x', 'junto à Estoca', 'Solicitamos', 'Equipe SAC Arvensis']
    .forEach((t) => assert.ok(c.includes(t), t));
});
teste('template substitui todas as variáveis', () => {
  const modelo = '{{RAC_NUMERO}} {{DATA}} {{PRODUTO}} {{SKU}} {{LOTE}} {{NOTA_FISCAL}} {{CHAMADO_ESTOCA}} {{CATEGORIA}} ' +
    '{{SUBCATEGORIA}} {{CONDICAO_CAIXA}} {{DESCRICAO}} {{OBSERVACAO}} {{DESCONHECIDA}}';
  const out = G.preencherTemplate(modelo, G.variaveisTemplate(rac));
  assert.ok(out.startsWith('RAC-INT-2026-0047 23/09/2026 10:32 Geleia'));
  assert.ok(out.endsWith(' - {{DESCONHECIDA}}'));
});

console.log('Permissões');
teste('perfis', () => {
  assert.ok(G.temPermissao('SAC', 'criar'));
  assert.ok(!G.temPermissao('SAC', 'alterar_status'));
  assert.ok(!G.temPermissao('QUALIDADE', 'criar'));
  assert.ok(G.temPermissao('admin', 'administrar'));
  assert.ok(!G.temPermissao('OUTRO', 'visualizar'));
});
teste('transições de status', () => {
  const S = G.STATUS;
  assert.deepStrictEqual(js(G.statusPermitidos('SAC', S.REGISTRADA, false)), [S.ENCAMINHADA]);
  assert.deepStrictEqual(js(G.statusPermitidos('SAC', S.ELABORACAO, true)), [S.CANCELADA]);
  assert.deepStrictEqual(js(G.statusPermitidos('SAC', S.ELABORACAO, false)), []);
  assert.deepStrictEqual(js(G.statusPermitidos('SAC', S.EM_ANALISE, true)), []);
  const q = G.statusPermitidos('QUALIDADE', S.ENCAMINHADA, false);
  assert.ok(q.includes(S.EM_ANALISE) && q.includes(S.CONCLUIDA) && !q.includes(S.ELABORACAO) && !q.includes(S.ENCAMINHADA));
  assert.deepStrictEqual(js(G.statusPermitidos('QUALIDADE', S.CONCLUIDA, false)), []);
  assert.ok(G.statusPermitidos('ADMIN', S.CONCLUIDA, false).includes(S.EM_ANALISE));
});

console.log('Consulta e dashboard');
const base = [
  { rac_numero: 'RAC-INT-2026-0001', data_abertura: '2026-08-10', hora_abertura: '09:00', produto: 'Geleia Seiva', sku: 'SKU001949', lote: '64225', categoria: 'Vazamento', subcategoria: 'Tampa', status: 'Concluída', data_envio_qualidade: '2026-08-10 10:00:00', data_conclusao: '2026-08-14 10:00:00' },
  { rac_numero: 'RAC-INT-2026-0002', data_abertura: '2026-09-01', hora_abertura: '11:00', produto: 'Geleia Seiva', sku: 'SKU001949', lote: '64225', categoria: 'Vazamento', subcategoria: 'Rosca', status: 'Em análise' },
  { rac_numero: 'RAC-INT-2026-0003', data_abertura: '2026-09-20', hora_abertura: '15:00', produto: 'Shampoo Cachos', sku: 'SKU000100', lote: 'A12', categoria: 'Tampa quebrada', subcategoria: '', status: 'Encaminhada à Qualidade' },
  { rac_numero: 'RAC-INT-2026-0004', data_abertura: '2026-09-21', hora_abertura: '15:00', produto: 'Shampoo Cachos', sku: 'SKU000100', lote: 'A12', categoria: 'Quebra', status: 'Cancelada' },
  { rac_numero: 'RAC-INT-2026-0005', data_abertura: '2026-09-22', hora_abertura: '15:00', produto: 'Shampoo Cachos', sku: 'SKU000100', lote: 'A13', categoria: 'Quebra', status: 'Em elaboração' }
];
teste('pesquisa global sem acento e ordenação mais recente primeiro', () => {
  const r = G.filtrarRacs(base, { texto: 'geleia' });
  assert.deepStrictEqual(r.map((x) => x.rac_numero), ['RAC-INT-2026-0002', 'RAC-INT-2026-0001']);
  assert.strictEqual(G.filtrarRacs(base, { texto: 'encaminhada a qualidade' }).length, 1);
  assert.strictEqual(G.filtrarRacs(base, { status: 'Em análise' }).length, 1);
  assert.strictEqual(G.filtrarRacs(base, { de: '2026-09-01', ate: '2026-09-20' }).length, 2);
});
teste('indicadores', () => {
  const d = G.calcularDashboard(base, produtos, new Date(2026, 8, 23));
  assert.strictEqual(d.total, 3);
  assert.strictEqual(d.noMes, 2);
  assert.strictEqual(d.concluidas, 1);
  assert.strictEqual(d.emAnalise, 1);
  assert.strictEqual(d.aguardandoQualidade, 1);
  assert.strictEqual(d.tempoMedioDias, 4);
  assert.deepStrictEqual(js(d.porSku[0]), { chave: 'SKU001949', total: 2 });
  assert.deepStrictEqual(js(d.porLote[0]), { chave: '64225 (SKU001949)', total: 2 });
  assert.deepStrictEqual(js(d.porTipoEmbalagem[0]), { chave: 'Pote 300 g', total: 2 });
  assert.strictEqual(d.porMes.length, 12);
  assert.strictEqual(d.porMes[11].chave, '2026-09');
  assert.strictEqual(d.porMes[11].total, 2);
  assert.strictEqual(d.porMes[10].total, 1);
  assert.ok(!d.porStatus.some((s) => s.chave === 'Em elaboração'));
});

console.log('\n' + ok + ' passaram, ' + falhas + ' falharam.');
process.exit(falhas ? 1 : 0);
