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

export function useEnergyData() {
  const [currentWatts, setCurrentWatts] = useState<number | null>(null);
  const [todayReadings, setTodayReadings] = useState<PowerReading[]>([]);
  const [monthReadings, setMonthReadings] = useState<PowerReading[]>([]);
  const [tariff, setTariffState] = useState(0.85);

  useEffect(() => {
    const unsubscribeCurrent = subscribeToCurrentPower(setCurrentWatts);
    const unsubscribeToday = subscribeToReadingsSince(startOfTodayMs(), setTodayReadings);
    const unsubscribeMonth = subscribeToReadingsSince(startOfMonthMs(), setMonthReadings);
    getTariff().then(setTariffState);

    return () => {
      unsubscribeCurrent();
      unsubscribeToday();
      unsubscribeMonth();
    };
  }, []);

  const todayKwh = calculateKwh(todayReadings);
  const monthKwh = calculateKwh(monthReadings);
  const estimatedBill = monthKwh * tariff;
  const peakWatts = monthReadings.reduce((max, r) => Math.max(max, r.watts), 0);

  return { currentWatts, todayKwh, monthKwh, estimatedBill, tariff, peakWatts };
}
