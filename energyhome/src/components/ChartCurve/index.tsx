import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';

interface ChartCurveProps {
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  /** Valores reais (ex: Watts) a desenhar, do mais antigo pro mais recente.
   *  Sem dado suficiente (menos de 2 pontos), cai num traço decorativo fixo. */
  data?: number[];
}

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 200;
const VERTICAL_PADDING = 20;

const DEFAULT_PATH = 'M0,150 Q100,140 200,160 T400,100 T600,130 T800,80';
const DEFAULT_LAST_POINT = { x: 800, y: 80 };

/** Converte uma lista de valores em um path SVG, normalizado ao viewBox,
 *  conectando os pontos com curvas suaves (Catmull-Rom → Bézier simplificado). */
function buildCurvePath(data: number[]): { path: string; lastPoint: { x: number; y: number } } {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * VIEWBOX_WIDTH;
    const normalized = range === 0 ? 0.5 : (value - min) / range;
    const y = VIEWBOX_HEIGHT - VERTICAL_PADDING - normalized * (VIEWBOX_HEIGHT - 2 * VERTICAL_PADDING);
    return { x, y };
  });

  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    path += ` Q${prev.x},${prev.y} ${midX},${(prev.y + curr.y) / 2}`;
  }
  path += ` T${points[points.length - 1].x},${points[points.length - 1].y}`;

  return { path, lastPoint: points[points.length - 1] };
}

export function ChartCurve({
  height = 160,
  strokeColor: strokeColorProp,
  fillColor: fillColorProp,
  data,
}: ChartCurveProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const strokeColor = strokeColorProp ?? colors.primary;
  const fillColor = fillColorProp ?? `${colors.primary}1A`;
  const hasRealData = !!data && data.length >= 2;
  const { path, lastPoint } = hasRealData
    ? buildCurvePath(data!)
    : { path: DEFAULT_PATH, lastPoint: DEFAULT_LAST_POINT };

  return (
    <View style={[styles.container, { height }]}>
      <Svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} width="100%" height="100%">
        <Path d={`${path} L${VIEWBOX_WIDTH},${VIEWBOX_HEIGHT} L0,${VIEWBOX_HEIGHT} Z`} fill={fillColor} />
        <Path d={path} fill="none" stroke={strokeColor} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={5} fill={strokeColor} />
      </Svg>
    </View>
  );
}
