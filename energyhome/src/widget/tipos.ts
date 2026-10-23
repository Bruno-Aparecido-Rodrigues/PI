// Nome e estados do widget "Conta do mês". Arquivo separado (sem importar a
// biblioteca do widget) pra poder ser usado pelo app no Expo Go também.

export const NOME_WIDGET = 'ContaProjetada';

export type EstadoWidget =
  | {
      tipo: 'conta';
      estimada: number;
      projetada: number | null;
      tarifa: number; // R$/kWh usado na conta
      atualizadoEm: number;
      bandeira: string | null;
    }
  | { tipo: 'aviso'; mensagem: string };
