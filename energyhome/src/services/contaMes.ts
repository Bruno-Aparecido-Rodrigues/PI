// Conta do mês: usada pelo Dashboard (useEnergyData) e pelo widget da tela
// inicial, pra os dois mostrarem exatamente o mesmo valor. (Não importa nada
// do Firebase: o logout usa este arquivo via widget.)

// Só projeta a conta do mês depois de ter pelo menos 24h de medição no mês.
// Com menos que isso, a projeção fica distorcida (ex: medir só a madrugada
// e projetar o mês inteiro como se fosse sempre madrugada).
export const MIN_PROJECTION_COVERAGE_MS = 24 * 60 * 60 * 1000;

/** "Verde" / "bandeira amarela" / "Vermelha P1" -> "Bandeira Verde" etc. */
export function rotuloBandeira(bandeira: string | null | undefined): string | null {
  if (!bandeira) return null;
  const nome = bandeira.trim().replace(/^bandeira\s+/i, '');
  return nome ? `Bandeira ${nome.charAt(0).toUpperCase()}${nome.slice(1)}` : null;
}

export interface ContaDoMes {
  /** Conta até agora (R$): kWh do mês x tarifa + iluminação pública */
  estimada: number;
  /** Conta prevista pro mês inteiro (R$), ou null antes de 24h de medição */
  projetada: number | null;
  /** kWh previstos pro mês inteiro, ou null antes de 24h de medição */
  projetadaKwh: number | null;
}

/**
 * Projeção até o fim do mês: pega o ritmo médio de consumo nas horas que de
 * fato foram medidas (kWh ÷ tempo medido) e aplica no tempo que falta.
 */
export function calcularContaDoMes(
  monthKwh: number,
  coveredMs: number,
  tariff: number,
  cip: number,
  agora: number = Date.now()
): ContaDoMes {
  let projetadaKwh: number | null = null;
  if (coveredMs >= MIN_PROJECTION_COVERAGE_MS) {
    const kwhPorMs = monthKwh / coveredMs;
    const d = new Date(agora);
    const fimDoMes = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const restanteMs = Math.max(0, fimDoMes - agora);
    projetadaKwh = monthKwh + kwhPorMs * restanteMs;
  }
  return {
    estimada: monthKwh * tariff + cip,
    projetada: projetadaKwh !== null ? projetadaKwh * tariff + cip : null,
    projetadaKwh,
  };
}
