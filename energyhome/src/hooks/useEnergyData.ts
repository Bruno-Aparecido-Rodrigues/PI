import { useEffect, useMemo, useRef, useState } from 'react';
import {
  subscribeToCurrentPower,
  subscribeToReadingsSince,
  integrateEnergy,
  averageWattsAtHour,
  startOfTodayMs,
  startOfDaysAgoMs,
  inicioDoHistorico,
  PowerReading,
} from '../services/energyData';
import { calcularContaDoMes } from '../services/contaMes';
import { periodoAtual } from '../services/ciclo';
import { atualizarWidgetConta } from '../widget/atualizarWidget';
import {
  ConfigTarifa,
  TARIFA_PADRAO,
  subscribeToConfigTarifa,
  dadosAneelVencidos,
  atualizarTarifaAneel,
} from '../services/tarifa';

// Quantas leituras de /current manter em memória pra desenhar a curva "ao
// vivo" do Dashboard. O firmware manda /current a cada ~3s, então 30
// amostras cobrem uma janela de ~1min30 de histórico recente.
const MAX_WATTS_HISTORY = 30;

// Quantos dias passados usar pra saber o consumo "normal" de cada horário
// (base da seta de tendência do card "Consumo Atual").
const TREND_HISTORY_DAYS = 7;

// Diferença mínima em relação ao normal pra mostrar seta pra cima/baixo.
// Abaixo disso, mostramos "dentro do normal" (evita a seta ficar trocando
// por qualquer oscilação pequena).
const TREND_TOLERANCE = 0.1; // 10%

export type Trend = 'up' | 'down' | 'neutral';

export function useEnergyData(hubId: string | null) {
  const [currentWatts, setCurrentWatts] = useState<number | null>(null);
  const [wattsHistory, setWattsHistory] = useState<number[]>([]);
  const [readings, setReadings] = useState<PowerReading[]>([]);
  const [configTarifa, setConfigTarifa] = useState<ConfigTarifa | null>(null);
  const atualizandoAneel = useRef(false);

  useEffect(() => {
    if (!hubId) {
      setCurrentWatts(null);
      setWattsHistory([]);
      setReadings([]);
      return;
    }

    // Reseta o histórico ao trocar de hub, pra não misturar leituras de
    // dispositivos diferentes na mesma curva.
    setWattsHistory([]);

    const handleCurrentPower = (watts: number | null) => {
      setCurrentWatts(watts);
      if (watts !== null) {
        setWattsHistory((prev) => {
          const next = [...prev, watts];
          return next.length > MAX_WATTS_HISTORY ? next.slice(next.length - MAX_WATTS_HISTORY) : next;
        });
      }
    };

    const unsubscribeCurrent = subscribeToCurrentPower(hubId, handleCurrentPower);
    // Tarifa, impostos, iluminação pública e ciclo da conta (atualiza na hora
    // se mudar em Ajustes)
    const unsubscribeTarifa = subscribeToConfigTarifa(hubId, setConfigTarifa);

    return () => {
      unsubscribeCurrent();
      unsubscribeTarifa();
    };
  }, [hubId]);

  // Período da conta: ciclo de leitura informado em Ajustes, ou o mês do
  // calendário (ver services/ciclo.ts). Recalculado a cada render (é barato),
  // pra virar de ciclo sozinho com o app aberto.
  const ciclo = configTarifa?.ciclo ?? null;
  const periodo = periodoAtual(ciclo);

  // Uma única assinatura cobre tudo que o Dashboard precisa: o período da
  // conta (kWh, conta, pico) e os últimos 7 dias (consumo normal por
  // horário). Hoje está contido nos dois. Dela, filtramos cada recorte.
  // Só assina depois de saber o ciclo, e o início só muda quando o ciclo
  // muda (não à meia-noite), pra não baixar o histórico de novo à toa.
  const cicloChave = ciclo ? `${ciclo.ultimaLeitura}-${ciclo.proximaLeitura}` : 'mes';
  const desde = useMemo(
    () => (configTarifa ? inicioDoHistorico(periodo.inicio) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configTarifa !== null, cicloChave, periodo.inicio]
  );

  useEffect(() => {
    if (!hubId || desde === null) {
      setReadings([]);
      return;
    }
    return subscribeToReadingsSince(hubId, desde, setReadings);
  }, [hubId, desde]);

  // Modo automático: se os dados da ANEEL tiverem mais de 1 dia (ou a
  // bandeira for de outro mês), busca de novo em segundo plano. Se a ANEEL
  // estiver fora do ar, segue com os últimos valores salvos.
  useEffect(() => {
    if (!hubId || !configTarifa || atualizandoAneel.current) return;
    if (!dadosAneelVencidos(configTarifa)) return;
    atualizandoAneel.current = true;
    atualizarTarifaAneel(hubId, configTarifa)
      .catch((erro) => console.warn('Não foi possível atualizar a tarifa da ANEEL:', erro))
      .finally(() => {
        atualizandoAneel.current = false;
      });
  }, [hubId, configTarifa]);

  const tariff = configTarifa?.tariff ?? TARIFA_PADRAO;
  // Iluminação pública (CIP): valor fixo por mês, entra uma vez na conta
  const cip = configTarifa?.cip ?? 0;

  // Recalcula só quando chega leitura nova de histórico (~1x por minuto),
  // não a cada atualização do /current (~3s).
  const energy = useMemo(() => {
    const todayStart = startOfTodayMs();
    const monthStart = periodo.inicio;
    const trendStart = startOfDaysAgoMs(TREND_HISTORY_DAYS);

    const todayReadings = readings.filter((r) => r.timestamp >= todayStart);
    const monthReadings = readings.filter((r) => r.timestamp >= monthStart);
    // Dias anteriores (sem hoje), pra comparar o agora com o "normal".
    const pastDaysReadings = readings.filter((r) => r.timestamp >= trendStart && r.timestamp < todayStart);

    const today = integrateEnergy(todayReadings);
    const month = integrateEnergy(monthReadings);
    const peakWatts = monthReadings.reduce((max, r) => Math.max(max, r.watts), 0);

    return {
      todayKwh: today.kwh,
      monthKwh: month.kwh,
      monthCoveredMs: month.coveredMs,
      // Última leitura do mês: o widget continua a conta a partir dela
      lastMonthReading: monthReadings.length > 0 ? monthReadings[monthReadings.length - 1] : null,
      peakWatts,
      pastDaysReadings,
    };
  }, [readings, periodo.inicio]);

  const typicalWattsNow = useMemo(
    () => averageWattsAtHour(energy.pastDaysReadings, new Date().getHours()),
    // Recalcula quando o histórico muda; a hora atual é lida na hora.
    [energy.pastDaysReadings]
  );

  const { trend, trendLabel } = describeTrend(currentWatts, typicalWattsNow);

  const conta = calcularContaDoMes(energy.monthKwh, energy.monthCoveredMs, tariff, cip, Date.now(), periodo.fim);
  const estimatedBill = conta.estimada;
  const projectedBill = conta.projetada;
  const bandeira = configTarifa?.modo === 'aneel' ? configTarifa.aneel?.bandeira ?? null : null;

  // Widget da tela inicial: atualiza na hora com os mesmos números do
  // Dashboard (só quando a conta muda, ~1x por minuto) e guarda o ponto de
  // partida pra ele continuar a conta sozinho com o app fechado.
  useEffect(() => {
    if (!hubId || !configTarifa) return;
    atualizarWidgetConta({
      hubId,
      monthKwh: energy.monthKwh,
      coveredMs: energy.monthCoveredMs,
      ultimaLeitura: energy.lastMonthReading,
      tariff,
      cip,
      bandeira,
      periodoInicio: periodo.inicio,
      periodoFim: periodo.fim,
    });
  }, [hubId, configTarifa, energy, tariff, cip, bandeira, periodo.inicio, periodo.fim]);

  return {
    currentWatts,
    wattsHistory,
    todayKwh: energy.todayKwh,
    monthKwh: energy.monthKwh,
    estimatedBill,
    projectedBill,
    tariff,
    cip,
    bandeira,
    peakWatts: energy.peakWatts,
    trend,
    trendLabel,
    periodo,
  };
}

/** Compara o consumo de agora com a média do mesmo horário nos últimos dias. */
function describeTrend(currentWatts: number | null, typicalWatts: number | null): { trend: Trend; trendLabel: string } {
  if (currentWatts === null) {
    return { trend: 'neutral', trendLabel: 'Aguardando leitura do Hub…' };
  }
  if (typicalWatts === null || typicalWatts <= 0) {
    return { trend: 'neutral', trendLabel: 'Leitura em tempo real do Hub' };
  }

  const difference = (currentWatts - typicalWatts) / typicalWatts;
  const percent = Math.round(Math.abs(difference) * 100);

  if (Math.abs(difference) < TREND_TOLERANCE) {
    return { trend: 'neutral', trendLabel: 'Dentro do normal para este horário' };
  }
  if (difference > 0) {
    return { trend: 'up', trendLabel: `${percent}% acima do normal para este horário` };
  }
  return { trend: 'down', trendLabel: `${percent}% abaixo do normal para este horário` };
}
