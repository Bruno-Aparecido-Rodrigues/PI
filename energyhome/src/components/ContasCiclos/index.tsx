import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BarChart, BarChartDatum } from '../BarChart';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';
import { diaMesCurto, mesAno, num, reais } from '../../i18n';
import type { Periodo } from '../../services/ciclo';
import type { CicloFechado } from '../../services/historicoCiclos';

const DIA_MS = 24 * 60 * 60 * 1000;
// Abaixo disso o ciclo aparece como "medição parcial" (o valor fica subestimado)
const COBERTURA_MINIMA = 0.9;

interface ContasCiclosProps {
  /** Ciclo (ou mês) que está correndo agora */
  periodo: Periodo;
  /** Conta do período atual até agora (R$) */
  estimadaAtual: number;
  /** Previsão da conta do período atual (R$), ou null antes de 24 h de medição */
  projetadaAtual: number | null;
  /** Ciclos já fechados, do mais recente pro mais antigo (null = carregando) */
  fechados: CicloFechado[] | null;
  /** Fechando ciclos antigos agora */
  calculando: boolean;
}

const competencia = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Valor final da conta de cada ciclo que já terminou, mais o ciclo atual
 * (parcial e previsão). Os ciclos fechados vêm de services/historicoCiclos.
 */
export function ContasCiclos({ periodo, estimadaAtual, projetadaAtual, fechados, calculando }: ContasCiclosProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  const ciclo = periodo.tipo === 'ciclo';

  // Ciclo: "26/10 a 23/11" | mês: "out/2026"
  const rotuloPeriodo = (inicio: number, fim: number) =>
    ciclo
      ? t('ciclo.intervalo', { inicio: diaMesCurto(inicio), fim: diaMesCurto(fim) })
      : mesAno(competencia(inicio));

  // Barra: mês em que a conta fecha ("nov"); no mês do calendário, o próprio mês
  const meses = t('tarifa.meses').split(',');
  const grafico: BarChartDatum[] = (fechados ?? [])
    .slice()
    .reverse()
    .map((c) => ({
      label: meses[new Date(ciclo ? c.fim - 1 : c.inicio).getMonth()],
      value: c.valor,
    }));

  return (
    <View style={styles.card}>
      <Text style={styles.titulo}>{t(ciclo ? 'graf.contas' : 'graf.contasMes')}</Text>
      <Text style={styles.subtitulo}>{t(ciclo ? 'graf.contasSub' : 'graf.contasSubMes')}</Text>

      {/* Período atual */}
      <View style={styles.atual}>
        <View style={styles.linhaEsquerda}>
          <Text style={styles.atualRotulo}>
            {t(ciclo ? 'graf.cicloAtual' : 'graf.mesAtual')} · {t('graf.emAndamento')}
          </Text>
          <Text style={styles.periodo}>{rotuloPeriodo(periodo.inicio, periodo.fim)}</Text>
          <Text style={styles.detalhe}>
            {projetadaAtual !== null
              ? t('graf.previsao', { valor: reais(projetadaAtual) })
              : t('graf.semPrevisao')}
          </Text>
        </View>
        <View style={styles.linhaDireita}>
          <Text style={styles.valorAtual}>{reais(estimadaAtual)}</Text>
          <Text style={styles.detalhe}>{t('graf.ateAgora')}</Text>
        </View>
      </View>

      {grafico.length >= 2 && (
        <BarChart
          data={grafico}
          barColor={colors.tertiary}
          valueFormatter={(v) => `R$${Math.round(v)}`}
        />
      )}

      {/* Ciclos fechados */}
      {fechados === null ? (
        <ActivityIndicator style={styles.carregando} color={colors.primary} />
      ) : (
        fechados.map((c) => {
          const dias = Math.round((c.fim - c.inicio) / DIA_MS);
          const cobertura = c.coberturaMs / (c.fim - c.inicio);
          const avisos: string[] = [];
          if (c.simulado) avisos.push(t('graf.dadosTeste'));
          if (cobertura < COBERTURA_MINIMA) {
            avisos.push(t('graf.medicaoParcial', { pct: Math.round(cobertura * 100) }));
          }
          if (ciclo && c.datasEstimadas) avisos.push(t('graf.datasEstimadas'));
          return (
            <View key={c.inicio} style={styles.linha}>
              <View style={styles.linhaEsquerda}>
                <Text style={styles.periodo}>{rotuloPeriodo(c.inicio, c.fim)}</Text>
                <Text style={styles.detalhe}>{t('graf.kwhDias', { kwh: num(c.kwh, 1), dias })}</Text>
                {avisos.length > 0 && (
                  <View style={styles.avisos}>
                    <MaterialIcons name="info-outline" size={13} color={colors.onSurfaceVariant} />
                    <Text style={styles.aviso}>{avisos.join(' · ')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.valor}>{reais(c.valor)}</Text>
            </View>
          );
        })
      )}

      {calculando && (
        <View style={styles.calculando}>
          <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
          <Text style={styles.detalhe}>{t('graf.calculandoCiclos')}</Text>
        </View>
      )}

      {fechados !== null && fechados.length === 0 && !calculando && (
        <Text style={styles.vazio}>
          {t(ciclo ? 'graf.nenhumFechado' : 'graf.nenhumFechadoMes', { data: diaMesCurto(periodo.fim) })}
        </Text>
      )}

      <Text style={styles.nota}>{t('graf.contasNota')}</Text>
    </View>
  );
}
