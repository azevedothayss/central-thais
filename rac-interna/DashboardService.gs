/**
 * DashboardService.gs
 * Indicadores básicos (seções 32 e 33). O cálculo fica em calcularDashboard (Utils.gs).
 */

function dash_calcular() {
  var racs = db_lerTodos(ABAS.RACS);
  var produtos = db_lerTodos(ABAS.PRODUTOS);
  var dados = calcularDashboard(racs, produtos, new Date());
  dados.atualizadoEm = dataHoraIso(new Date());
  return dados;
}
