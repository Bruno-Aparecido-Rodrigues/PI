// Nome e estados do widget "Conta do mês". Arquivo separado (sem importar a
// biblioteca do widget) pra poder ser usado pelo app no Expo Go também.

export const NOME_WIDGET = 'ContaProjetada';

/** Toque no "↻ Atualizar" do widget (WIDGET_CLICK com esse clickAction) */
export const ACAO_ATUALIZAR = 'ATUALIZAR_CONTA';

/** Como foi a última tentativa de atualizar (aparece no rodapé do widget) */
export type Situacao =
  | { tipo: 'ok' }
  | { tipo: 'atualizando' }
  | { tipo: 'falhou'; em: number; motivo: string }
  | { tipo: 'semInternet'; em: number };

export type EstadoWidget =
  | {
      tipo: 'conta';
      estimada: number;
      projetada: number | null;
      tarifa: number; // R$/kWh usado na conta
      atualizadoEm: number;
      bandeira: string | null;
      situacao?: Situacao;
    }
  | { tipo: 'aviso'; mensagem: string; semInternet?: boolean };
