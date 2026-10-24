// Paleta do tema CLARO (Material 3, cor base #0052ff). O app pega as cores do
// tema ativo pelo useTema()/useEstilos() (src/theme/TemaContext.tsx); este
// objeto continua exportado como "colors" pro que não depende do tema.
export const colors = {
  primary: '#0052ff',
  primaryContainer: '#0052ff',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#dfe3ff',
  primaryFixed: '#dde1ff',
  primaryFixedDim: '#b7c4ff',
  onPrimaryFixed: '#001452',
  onPrimaryFixedVariant: '#0038b6',

  secondary: '#006688',
  secondaryContainer: '#00c1fd',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#004b65',
  secondaryFixed: '#c2e8ff',
  secondaryFixedDim: '#75d1ff',
  onSecondaryFixed: '#001e2b',
  onSecondaryFixedVariant: '#004d67',

  tertiary: '#005b20',
  tertiaryContainer: '#00762c',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#79ff8c',
  tertiaryFixed: '#72fe88',
  tertiaryFixedDim: '#53e16f',
  onTertiaryFixed: '#002107',
  onTertiaryFixedVariant: '#00531c',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  background: '#f8f9ff',
  onBackground: '#0b1c30',
  surface: '#f8f9ff',
  onSurface: '#0b1c30',
  surfaceVariant: '#d3e4fe',
  onSurfaceVariant: '#434656',

  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',

  outline: '#737688',
  outlineVariant: '#c3c5d9',

  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',
  inversePrimary: '#b7c4ff',
};

export type AppColors = typeof colors;

// Paleta do tema ESCURO, com as mesmas chaves. Mantém o azul da marca
// (#0052ff) nos cards de destaque e clareia os textos/destaques pra ter
// contraste no fundo escuro. "surfaceContainerLowest" é a cor dos cards no
// app, então aqui ela fica um pouco MAIS clara que o fundo (no claro, o card é
// branco sobre o fundo azul-claro).
export const colorsEscuro: AppColors = {
  primary: '#b7c4ff',
  primaryContainer: '#0052ff',
  onPrimary: '#00287d',
  onPrimaryContainer: '#dfe3ff',
  primaryFixed: '#dde1ff',
  primaryFixedDim: '#b7c4ff',
  onPrimaryFixed: '#001452',
  onPrimaryFixedVariant: '#0038b6',

  secondary: '#75d1ff',
  secondaryContainer: '#004d67',
  onSecondary: '#003548',
  onSecondaryContainer: '#c2e8ff',
  secondaryFixed: '#c2e8ff',
  secondaryFixedDim: '#75d1ff',
  onSecondaryFixed: '#001e2b',
  onSecondaryFixedVariant: '#004d67',

  tertiary: '#53e16f',
  tertiaryContainer: '#00531c',
  onTertiary: '#003910',
  onTertiaryContainer: '#72fe88',
  tertiaryFixed: '#72fe88',
  tertiaryFixedDim: '#53e16f',
  onTertiaryFixed: '#002107',
  onTertiaryFixedVariant: '#00531c',

  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',

  background: '#0b1326',
  onBackground: '#dbe2f9',
  surface: '#0b1326',
  onSurface: '#dbe2f9',
  surfaceVariant: '#434656',
  onSurfaceVariant: '#c3c5d9',

  surfaceDim: '#0b1326',
  surfaceBright: '#31394d',
  surfaceContainerLowest: '#161e31',
  surfaceContainerLow: '#10182b',
  surfaceContainer: '#1f283c',
  surfaceContainerHigh: '#262f44',
  surfaceContainerHighest: '#2d3449',

  outline: '#8d90a2',
  outlineVariant: '#434656',

  inverseSurface: '#dbe2f9',
  inverseOnSurface: '#283044',
  inversePrimary: '#0052ff',
};
