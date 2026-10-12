import { useEffect, useMemo, useState } from 'react';
import {
  subscribeToCurrentPower,
  subscribeToReadingsSince,
  integrateEnergy,
  averageWattsAtHour,
  startOfTodayMs,
  startOfMonthMs,
  startOfDaysAgoMs,
  startOfNextMonthMs,
  getTariff,
  PowerReading,
} from '../services/energyData';

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

// Só projeta a conta do mês depois de ter pelo menos 24h de medição no mês.
// Com menos que isso, a projeção fica distorcida (ex: medir só a madrugada
// e projetar o mês inteiro como se fosse sempre madrugada).
const MIN_PROJECTION_COVERAGE_MS = 24 * 60 * 60 * 1000;

export type Trend = 'up' | 'down' | 'neutral';

export function useEnergyData(hubId: string | null) {
  const [currentWatts, setCurrentWatts] = useState<number | null>(null);
  const [wattsHistory, setWattsHistory] = useState<number[]>([]);
  const [readings, setReadings] = useState<PowerReading[]>([]);
  const [tariff, setTariffState] = useState(0.85);

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

    // Uma única assinatura cobre tudo que o Dashboard precisa: o mês atual
    // (kWh do mês, conta, pico) e os últimos 7 dias (consumo normal por
    // horário). Hoje está contido nos dois. Dela, filtramos cada recorte.
    const since = Math.min(startOfMonthMs(), startOfDaysAgoMs(TREND_HISTORY_DAYS));

    const unsubscribeCurrent = subscribeToCurrentPower(hubId, handleCurrentPower);
    const unsubscribeReadings = subscribeToReadingsSince(hubId, since, setReadings);
    getTariff(hubId).then(setTariffState);

    return () => {
      unsubscribeCurrent();
      unsubscribeReadings();
    };
  }, [hubId]);

  // Recalcula só quando chega leitura nova de histórico (~1x por minuto),
  // não a cada atualização do /current (~3s).
  const energy = useMemo(() => {
    const todayStart = startOfTodayMs();
    const monthStart = startOfMonthMs();
    const trendStart = startOfDaysAgoMs(TREND_HISTORY_DAYS);

    const todayReadings = readings.filter((r) => r.timestamp >= todayStart);
    const monthReadings = readings.filter((r) => r.timestamp >= monthStart);
    // Dias anteriores (sem hoje), pra comparar o agora com o "normal".
    const pastDaysReadings = readings.filter((r) => r.timestamp >= trendStart && r.timestamp < todayStart);

    const today = integrateEnergy(todayReadings);
    const month = integrateEnergy(monthReadings);
    const peakWatts = monthReadings.reduce((max, r) => Math.max(max, r.watts), 0);

    // Projeção até o fim do mês: pega o ritmo médio de consumo nas horas que
    // de fato foram medidas (kWh ÷ tempo medido) e aplica no tempo que falta.
    let projectedMonthKwh: number | null = null;
    if (month.coveredMs >= MIN_PROJECTION_COVERAGE_MS) {
      const kwhPerMs = month.kwh / month.coveredMs;
      const remainingMs = Math.max(0, startOfNextMonthMs() - Date.now());
      projectedMonthKwh = month.kwh + kwhPerMs * remainingMs;
    }

    return {
      todayKwh: today.kwh,
      monthKwh: month.kwh,
      projectedMonthKwh,
      peakWatts,
      pastDaysReadings,
    };
  }, [readings]);

  const typicalWattsNow = useMemo(
    () => averageWattsAtHour(energy.pastDaysReadings, new Date().getHours()),
    // Recalcula quando o histórico muda; a hora atual é lida na hora.
    [energy.pastDaysReadings]
  );

  const { trend, trendLabel } = describeTrend(currentWatts, typicalWattsNow);

  const estimatedBill = energy.monthKwh * tariff;
  const projectedBill = energy.projectedMonthKwh !== null ? energy.projectedMonthKwh * tariff : null;

  return {
    currentWatts,
    wattsHistory,
    todayKwh: energy.todayKwh,
    monthKwh: energy.monthKwh,
    estimatedBill,
    projectedBill,
    tariff,
    peakWatts: energy.peakWatts,
    trend,
    trendLabel,
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
