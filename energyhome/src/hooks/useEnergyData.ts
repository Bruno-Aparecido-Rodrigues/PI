import { useEffect, useState } from 'react';
import {
  subscribeToCurrentPower,
  subscribeToReadingsSince,
  calculateKwh,
  startOfTodayMs,
  startOfMonthMs,
  getTariff,
  PowerReading,
} from '../services/energyData';

// Quantas leituras de /current manter em memória pra desenhar a curva "ao
// vivo" do Dashboard. O firmware manda /current a cada ~3s, então 30
// amostras cobrem uma janela de ~1min30 de histórico recente.
const MAX_WATTS_HISTORY = 30;

export function useEnergyData(hubId: string | null) {
  const [currentWatts, setCurrentWatts] = useState<number | null>(null);
  const [wattsHistory, setWattsHistory] = useState<number[]>([]);
  const [todayReadings, setTodayReadings] = useState<PowerReading[]>([]);
  const [monthReadings, setMonthReadings] = useState<PowerReading[]>([]);
  const [tariff, setTariffState] = useState(0.85);

  useEffect(() => {
    if (!hubId) {
      setCurrentWatts(null);
      setWattsHistory([]);
      setTodayReadings([]);
      setMonthReadings([]);
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
    const unsubscribeToday = subscribeToReadingsSince(hubId, startOfTodayMs(), setTodayReadings);
    const unsubscribeMonth = subscribeToReadingsSince(hubId, startOfMonthMs(), setMonthReadings);
    getTariff(hubId).then(setTariffState);

    return () => {
      unsubscribeCurrent();
      unsubscribeToday();
      unsubscribeMonth();
    };
  }, [hubId]);

  const todayKwh = calculateKwh(todayReadings);
  const monthKwh = calculateKwh(monthReadings);
  const estimatedBill = monthKwh * tariff;
  const peakWatts = monthReadings.reduce((max, r) => Math.max(max, r.watts), 0);

  return { currentWatts, wattsHistory, todayKwh, monthKwh, estimatedBill, tariff, peakWatts };
}
