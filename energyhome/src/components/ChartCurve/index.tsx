import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../../constants/colors';
import { styles } from './style';

interface ChartCurveProps {
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  path?: string;
}

const DEFAULT_PATH = 'M0,150 Q100,140 200,160 T400,100 T600,130 T800,80';

export function ChartCurve({
  height = 160,
  strokeColor = colors.primary,
  fillColor = `${colors.primary}1A`,
  path = DEFAULT_PATH,
}: ChartCurveProps) {
  return (
    <View style={[styles.container, { height }]}>
      <Svg viewBox="0 0 800 200" width="100%" height="100%">
        <Path d={`${path} L800,200 L0,200 Z`} fill={fillColor} />
        <Path d={path} fill="none" stroke={strokeColor} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={800} cy={80} r={5} fill={strokeColor} />
      </Svg>
    </View>
  );
}
