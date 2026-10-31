import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConfigTarifa, subscribeToConfigTarifa, salvarCiclo } from '../../services/tarifa';
import { dataCompleta, diaMes, mascaraData, periodoAtual, validarCiclo } from '../../services/ciclo';
// Mesmo visual do card de tarifa, logo acima dele em Ajustes
import { criarEstilos } from '../TarifaCard/style';
import { useCores, useEstilos } from '../../theme/TemaContext';

interface CicloCardProps {
  hubId: string | null;
}

/**
 * Datas de leitura da conta de luz (vêm impressas na conta: "Leitura atual"
 * e "Próxima leitura"). Com elas, a conta estimada, a projeção, o widget e o
 * gráfico "Ciclo" usam o mesmo período que a distribuidora cobra, em vez do
 * mês do calendário.
 */
export function CicloCard({ hubId }: CicloCardProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const [config, setConfig] = useState<ConfigTarifa | null>(null);
  const [ultima, setUltima] = useState('');
  const [proxima, setProxima] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    if (!hubId) return;
    return subscribeToConfigTarifa(hubId, setConfig);
  }, [hubId]);

  // Preenche os campos com o que está salvo
  const ciclo = config?.ciclo ?? null;
  useEffect(() => {
    setUltima(ciclo ? dataCompleta(ciclo.ultimaLeitura) : '');
    setProxima(ciclo ? dataCompleta(ciclo.proximaLeitura) : '');
  }, [ciclo?.ultimaLeitura, ciclo?.proximaLeitura]);

  const periodo = periodoAtual(ciclo);
  const desabilitado = !hubId || !config;

  async function salvar() {
    if (!hubId) return;
    setErro('');
    setMensagem('');
    const resultado = validarCiclo(ultima, proxima);
    if (typeof resultado === 'string') {
      setErro(resultado);
      return;
    }
    setSalvando(true);
    try {
      await salvarCiclo(hubId, resultado);
      setMensagem('Ciclo salvo. A conta estimada já usa essas datas.');
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function usarMesDoCalendario() {
    if (!hubId) return;
    setErro('');
    setMensagem('');
    try {
      await salvarCiclo(hubId, null);
      setMensagem('Voltou a usar o mês do calendário.');
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="event" size={20} color={colors.primary} />
        <Text style={styles.cardTitle}>Ciclo da Conta</Text>
      </View>
      <Text style={styles.hint}>
        A distribuidora cobra o consumo entre duas leituras do relógio, não o mês do calendário. Copie as datas
        da sua conta de luz.
      </Text>

      <View style={styles.linhaCampos}>
        <View style={styles.campoMetade}>
          <Text style={styles.label}>Última leitura</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="26/10/2026"
            placeholderTextColor={colors.outline}
            value={ultima}
            onChangeText={(t) => setUltima(mascaraData(t))}
            maxLength={10}
            editable={!desabilitado}
          />
        </View>
        <View style={styles.campoMetade}>
          <Text style={styles.label}>Próxima leitura</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder="23/11/2026"
            placeholderTextColor={colors.outline}
            value={proxima}
            onChangeText={(t) => setProxima(mascaraData(t))}
            maxLength={10}
            editable={!desabilitado}
          />
        </View>
      </View>

      <View style={styles.resultado}>
        <Text style={styles.resultadoRotulo}>Período usado na conta</Text>
        <Text style={styles.resultadoValor}>
          {periodo.tipo === 'ciclo' ? `${diaMes(periodo.inicio)} a ${diaMes(periodo.fim)}` : 'Mês do calendário'}
        </Text>
      </View>
      {periodo.tipo === 'ciclo' && periodo.estimado ? (
        <Text style={styles.hint}>
          A próxima leitura informada já passou, então o app estimou o ciclo atual com a mesma duração. Quando
          chegar a conta nova, atualize as datas.
        </Text>
      ) : null}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}

      <TouchableOpacity style={styles.botao} onPress={salvar} disabled={desabilitado || salvando}>
        {salvando ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.botaoTexto}>Salvar</Text>
        )}
      </TouchableOpacity>
      {ciclo ? (
        <TouchableOpacity onPress={usarMesDoCalendario} disabled={desabilitado}>
          <Text style={styles.link}>Usar o mês do calendário</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
