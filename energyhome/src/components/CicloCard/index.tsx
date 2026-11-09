import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ConfigTarifa, subscribeToConfigTarifa, salvarCiclo } from '../../services/tarifa';
import { dataCompleta, mascaraData, periodoAtual, validarCiclo } from '../../services/ciclo';
// Mesmo visual do card de tarifa, logo acima dele em Ajustes
import { criarEstilos } from '../TarifaCard/style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';
import { diaMesCurto } from '../../i18n';

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
  const t = useT();
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
      setMensagem(t('ciclo.salvo'));
    } catch {
      setErro(t('comum.erroSalvar'));
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
      setMensagem(t('ciclo.voltouMes'));
    } catch {
      setErro(t('comum.erroSalvar'));
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="event" size={20} color={colors.primary} />
        <Text style={styles.cardTitle}>{t('ciclo.titulo')}</Text>
      </View>
      <Text style={styles.hint}>{t('ciclo.dica')}</Text>

      <View style={styles.linhaCampos}>
        <View style={styles.campoMetade}>
          <Text style={styles.label}>{t('ciclo.ultima')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder={t('ciclo.placeholderUltima')}
            placeholderTextColor={colors.outline}
            value={ultima}
            onChangeText={(t) => setUltima(mascaraData(t))}
            maxLength={10}
            editable={!desabilitado}
          />
        </View>
        <View style={styles.campoMetade}>
          <Text style={styles.label}>{t('ciclo.proxima')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholder={t('ciclo.placeholderProxima')}
            placeholderTextColor={colors.outline}
            value={proxima}
            onChangeText={(t) => setProxima(mascaraData(t))}
            maxLength={10}
            editable={!desabilitado}
          />
        </View>
      </View>

      <View style={styles.resultado}>
        <Text style={styles.resultadoRotulo}>{t('ciclo.periodo')}</Text>
        <Text style={styles.resultadoValor}>
          {periodo.tipo === 'ciclo'
            ? t('ciclo.intervalo', { inicio: diaMesCurto(periodo.inicio), fim: diaMesCurto(periodo.fim) })
            : t('ciclo.mesCalendario')}
        </Text>
      </View>
      {periodo.tipo === 'ciclo' && periodo.estimado ? (
        <Text style={styles.hint}>{t('ciclo.estimadoDica')}</Text>
      ) : null}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}

      <TouchableOpacity style={styles.botao} onPress={salvar} disabled={desabilitado || salvando}>
        {salvando ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.botaoTexto}>{t('comum.salvar')}</Text>
        )}
      </TouchableOpacity>
      {ciclo ? (
        <TouchableOpacity onPress={usarMesDoCalendario} disabled={desabilitado}>
          <Text style={styles.link}>{t('ciclo.usarMes')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
