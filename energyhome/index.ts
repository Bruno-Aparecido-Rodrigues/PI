import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import App from './App';

registerRootComponent(App);

// Widget "Conta do mês" (Android): tarefa que roda com o app fechado pra
// atualizar o widget. No Expo Go a parte nativa não existe e isso é ignorado.
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widget/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (erro) {
    console.warn('Widget indisponível neste build:', erro);
  }
}
