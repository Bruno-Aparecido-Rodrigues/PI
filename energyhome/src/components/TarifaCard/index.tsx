import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ConfigTarifa,
  subscribeToConfigTarifa,
  salvarConfigTarifa,
  atualizarTarifaAneel,
  listarDistribuidoras,
  sugerirDistribuidora,
  calcularTarifaFinal,
} from '../../services/tarifa';
import { criarEstilos } from './style';
import { useCores, useEstilos } from '../../theme/TemaContext';
import { useT } from '../../i18n/IdiomaContext';
import { reais, num, dataCurta, diaMesCurto, hora, mesAno, nomeBandeira, t as traduzir } from '../../i18n';

interface TarifaCardProps {
  hubId: string | null;
}

/** "2026-07-04" -> "04/07/2026" / "Jul 4, 2026" */
function dataIso(iso: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-').map(Number);
  return dataCurta(new Date(a, m - 1, d).getTime());
}

/** "09/11 às 14:05" / "Nov 9 at 14:05" */
function quando(ms: number): string {
  return traduzir('comum.dataHora', { data: diaMesCurto(ms), hora: hora(ms) });
}

/** "18" / "18,5" / "18.5" -> 18.5 (ou null se não for número) */
function lerCampo(texto: string): number | null {
  const n = Number(texto.trim().replace(',', '.'));
  return texto.trim() !== '' && Number.isFinite(n) ? n : null;
}

/** 5.6 -> "5,6" (pt) / "5.6" (en), sem casas a mais */
function paraCampo(n: number): string {
  return num(n, 4).replace(/[.,]?0+$/, '');
}

// A base da ANEEL ainda usa a sigla antiga de algumas distribuidoras que
// mudaram de nome. Mostramos o nome atual entre parênteses pra pessoa
// reconhecer a empresa da conta de luz. A sigla gravada não muda.
const NOMES_ATUAIS: Record<string, string> = {
  ELETROPAULO: 'Enel SP',
  AMPLA: 'Enel RJ',
  COELCE: 'Enel CE',
  BANDEIRANTE: 'EDP SP',
  ESCELSA: 'EDP ES',
  ELEKTRO: 'Neoenergia Elektro',
  COELBA: 'Neoenergia Coelba',
  CELPE: 'Neoenergia Pernambuco',
  COSERN: 'Neoenergia Cosern',
  CEMAR: 'Equatorial Maranhão',
  CELPA: 'Equatorial Pará',
  CEPISA: 'Equatorial Piauí',
  CEAL: 'Equatorial Alagoas',
};

/** "ELETROPAULO" -> "ELETROPAULO (Enel SP)" */
function nomeDistribuidora(sigla: string): string {
  const atual = NOMES_ATUAIS[sigla.toUpperCase()];
  return atual ? `${sigla} (${atual})` : sigla;
}

/** "Bandeira amarela" -> "Amarela" / "Yellow" (mais curto pra caber na tela) */
function nomeCurtoBandeira(nome: string | null): string {
  return nomeBandeira(nome) ?? '—';
}

/**
 * Cartão de tarifa da tela de Ajustes: tarifa manual ou automática (ANEEL),
 * impostos da conta de luz e iluminação pública. Ver services/tarifa.ts.
 */
export function TarifaCard({ hubId }: TarifaCardProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
  const t = useT();
  // Margem da barra de navegação do celular no seletor de distribuidora
  const insets = useSafeAreaInsets();
  const [config, setConfig] = useState<ConfigTarifa | null>(null);

  // Campos editáveis (texto, pra aceitar vírgula enquanto digita)
  const [tarifaManual, setTarifaManual] = useState('');
  const [icms, setIcms] = useState('');
  const [pisCofins, setPisCofins] = useState('');
  const [cip, setCip] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [buscandoAneel, setBuscandoAneel] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  // Lista de distribuidoras
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [distribuidoras, setDistribuidoras] = useState<string[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [busca, setBusca] = useState('');

  // Configuração salva no Firebase (em tempo real). Os campos só são
  // preenchidos na primeira leitura, pra não apagar o que a pessoa digita.
  const [camposIniciados, setCamposIniciados] = useState(false);
  useEffect(() => {
    if (!hubId) return;
    setCamposIniciados(false);
    return subscribeToConfigTarifa(hubId, setConfig);
  }, [hubId]);

  useEffect(() => {
    if (!config || camposIniciados) return;
    setTarifaManual(paraCampo(Number(config.tariff.toFixed(2))));
    setIcms(config.icms ? paraCampo(config.icms) : '');
    setPisCofins(config.pisCofins ? paraCampo(config.pisCofins) : '');
    setCip(config.cip ? paraCampo(config.cip) : '');
    setCamposIniciados(true);
  }, [config, camposIniciados]);

  const automatica = config?.modo === 'aneel';

  // Prévia da tarifa final com o que está digitado agora
  const previa = useMemo(() => {
    if (!config) return null;
    if (!automatica) return lerCampo(tarifaManual);
    if (!config.aneel) return null;
    try {
      return calcularTarifaFinal(
        config.aneel.tarifaKwh,
        config.aneel.bandeiraAdicionalKwh,
        lerCampo(icms) ?? 0,
        lerCampo(pisCofins) ?? 0
      );
    } catch {
      return null;
    }
  }, [config, automatica, tarifaManual, icms, pisCofins]);

  function limparAvisos() {
    setMensagem('');
    setErro('');
  }

  async function carregarDistribuidoras(): Promise<string[]> {
    if (distribuidoras.length > 0) return distribuidoras;
    setCarregandoLista(true);
    try {
      const lista = await listarDistribuidoras();
      setDistribuidoras(lista);
      return lista;
    } finally {
      setCarregandoLista(false);
    }
  }

  async function buscarNaAneel(cfg: ConfigTarifa) {
    if (!hubId) return;
    setBuscandoAneel(true);
    try {
      await atualizarTarifaAneel(hubId, cfg);
      setMensagem(t('tarifa.atualizada'));
    } catch (e: any) {
      setErro(
        `${e?.message ?? t('tarifa.erroAneel')} ` + (cfg.aneel ? t('tarifa.usandoUltimos') : t('tarifa.tenteDeNovo'))
      );
    } finally {
      setBuscandoAneel(false);
    }
  }

  async function alternarModo(ligar: boolean) {
    if (!hubId || !config) return;
    limparAvisos();
    try {
      if (!ligar) {
        await salvarConfigTarifa(hubId, { tarifaModo: 'manual' });
        setTarifaManual(paraCampo(Number(config.tariff.toFixed(2))));
        return;
      }
      let distribuidora = config.distribuidora;
      if (!distribuidora) {
        // Primeira vez: sugere a Enel SP (padrão do projeto)
        const lista = await carregarDistribuidoras();
        distribuidora = sugerirDistribuidora(lista);
      }
      await salvarConfigTarifa(hubId, {
        tarifaModo: 'aneel',
        ...(distribuidora ? { distribuidora } : {}),
      });
      if (!distribuidora) {
        setSeletorAberto(true);
        return;
      }
      await buscarNaAneel({ ...config, modo: 'aneel', distribuidora });
    } catch (e: any) {
      setErro(e?.message ?? t('tarifa.erroModo'));
    }
  }

  async function escolherDistribuidora(sigla: string) {
    if (!hubId || !config) return;
    setSeletorAberto(false);
    setBusca('');
    limparAvisos();
    await salvarConfigTarifa(hubId, { distribuidora: sigla });
    await buscarNaAneel({ ...config, distribuidora: sigla });
  }

  async function abrirSeletor() {
    limparAvisos();
    setSeletorAberto(true);
    try {
      await carregarDistribuidoras();
    } catch {
      setErro(t('tarifa.erroLista'));
      setSeletorAberto(false);
    }
  }

  async function salvar() {
    if (!hubId || !config) return;
    limparAvisos();

    const valorCip = cip.trim() === '' ? 0 : lerCampo(cip);
    if (valorCip === null || valorCip < 0 || valorCip > 1000) {
      setErro(t('tarifa.erroCip'));
      return;
    }

    setSalvando(true);
    try {
      if (automatica) {
        const valorIcms = icms.trim() === '' ? 0 : lerCampo(icms);
        const valorPis = pisCofins.trim() === '' ? 0 : lerCampo(pisCofins);
        if (valorIcms === null || valorPis === null || valorIcms < 0 || valorPis < 0 || valorIcms + valorPis >= 60) {
          setErro(t('tarifa.erroImpostos'));
          return;
        }
        const campos: Parameters<typeof salvarConfigTarifa>[1] = {
          icms: valorIcms,
          pisCofins: valorPis,
          cip: valorCip,
        };
        if (config.aneel) {
          campos.tariff = calcularTarifaFinal(
            config.aneel.tarifaKwh,
            config.aneel.bandeiraAdicionalKwh,
            valorIcms,
            valorPis
          );
        }
        await salvarConfigTarifa(hubId, campos);
      } else {
        const valorTarifa = lerCampo(tarifaManual);
        if (valorTarifa === null || valorTarifa <= 0 || valorTarifa >= 100) {
          setErro(t('tarifa.erroTarifa'));
          return;
        }
        await salvarConfigTarifa(hubId, { tariff: valorTarifa, cip: valorCip });
      }
      setMensagem(t('tarifa.salva'));
    } catch {
      setErro(t('comum.erroSalvar'));
    } finally {
      setSalvando(false);
    }
  }

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    // Busca pela sigla e pelo nome atual (digitar "enel" acha ELETROPAULO)
    return termo
      ? distribuidoras.filter((d) => nomeDistribuidora(d).toLowerCase().includes(termo))
      : distribuidoras;
  }, [busca, distribuidoras]);

  const desabilitado = !hubId || !config;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialIcons name="payments" size={20} color={colors.primary} />
        <Text style={styles.cardTitle}>{t('tarifa.titulo')}</Text>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchTextos}>
          <Text style={styles.switchLabel}>{t('tarifa.automatica')}</Text>
          <Text style={styles.hint}>{t('tarifa.automaticaDica')}</Text>
        </View>
        <Switch
          value={automatica}
          onValueChange={alternarModo}
          disabled={desabilitado || buscandoAneel}
          trackColor={{ false: colors.outlineVariant, true: colors.primary }}
        />
      </View>

      {automatica ? (
        <>
          <TouchableOpacity style={styles.seletor} onPress={abrirSeletor} disabled={desabilitado}>
            <View>
              <Text style={styles.label}>{t('tarifa.distribuidora')}</Text>
              <Text style={styles.seletorValor}>
                {config?.distribuidora ? nomeDistribuidora(config.distribuidora) : t('tarifa.escolher')}
              </Text>
            </View>
            <MaterialIcons name="expand-more" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View style={styles.caixaAneel}>
            {buscandoAneel ? (
              <View style={styles.linhaCarregando}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.hint}>{t('tarifa.consultando')}</Text>
              </View>
            ) : config?.aneel ? (
              <>
                <View style={styles.linhaInfo}>
                  <Text style={styles.infoRotulo}>{t('tarifa.semImpostos')}</Text>
                  <Text style={styles.infoValor}>{reais(config.aneel.tarifaKwh)}/kWh</Text>
                </View>
                <Text style={styles.hint}>
                  {t('tarifa.vigente', {
                    inicio: dataIso(config.aneel.vigenciaInicio),
                    fim: dataIso(config.aneel.vigenciaFim),
                  })}
                </Text>
                <View style={styles.linhaInfo}>
                  <Text style={styles.infoRotulo}>
                    {t('tarifa.bandeiraDe', { mes: mesAno(config.aneel.bandeiraCompetencia) })}
                  </Text>
                  <Text style={styles.infoValor}>{nomeCurtoBandeira(config.aneel.bandeira)}</Text>
                </View>
                {config.aneel.bandeiraAdicionalKwh > 0 ? (
                  <Text style={styles.hint}>
                    {t('tarifa.adicional', { valor: reais(config.aneel.bandeiraAdicionalKwh * 100) })}
                  </Text>
                ) : null}
                <View style={styles.linhaInfo}>
                  <Text style={styles.hint}>{t('tarifa.atualizadoEm', { data: quando(config.aneel.atualizadoEm) })}</Text>
                  <TouchableOpacity onPress={() => config && buscarNaAneel(config)}>
                    <Text style={styles.link}>{t('tarifa.atualizarAgora')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.hint}>{t('tarifa.escolhaDistribuidora')}</Text>
            )}
          </View>

          <View style={styles.linhaCampos}>
            <View style={styles.campoMetade}>
              <Text style={styles.label}>ICMS (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={t('tarifa.exIcms')}
                placeholderTextColor={colors.outline}
                value={icms}
                onChangeText={setIcms}
                editable={!desabilitado}
              />
            </View>
            <View style={styles.campoMetade}>
              <Text style={styles.label}>PIS + COFINS (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder={t('tarifa.exPis')}
                placeholderTextColor={colors.outline}
                value={pisCofins}
                onChangeText={setPisCofins}
                editable={!desabilitado}
              />
            </View>
          </View>
          <Text style={styles.hint}>{t('tarifa.impostosDica')}</Text>
        </>
      ) : (
        <View style={styles.campo}>
          <Text style={styles.label}>{t('tarifa.comImpostos')}</Text>
          <View style={styles.inputComPrefixo}>
            <Text style={styles.prefixo}>R$</Text>
            <TextInput
              style={styles.inputSemBorda}
              keyboardType="decimal-pad"
              value={tarifaManual}
              onChangeText={setTarifaManual}
              editable={!desabilitado}
            />
          </View>
        </View>
      )}

      <View style={styles.campo}>
        <Text style={styles.label}>{t('tarifa.iluminacao')}</Text>
        <View style={styles.inputComPrefixo}>
          <Text style={styles.prefixo}>R$</Text>
          <TextInput
            style={styles.inputSemBorda}
            keyboardType="decimal-pad"
            placeholder={num(0)}
            placeholderTextColor={colors.outline}
            value={cip}
            onChangeText={setCip}
            editable={!desabilitado}
          />
        </View>
        <Text style={styles.hint}>{t('tarifa.iluminacaoDica')}</Text>
      </View>

      <View style={styles.resultado}>
        <Text style={styles.resultadoRotulo}>{t('tarifa.final')}</Text>
        <Text style={styles.resultadoValor}>{previa !== null ? `${reais(previa)}/kWh` : '—'}</Text>
      </View>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}

      <TouchableOpacity style={styles.botao} onPress={salvar} disabled={desabilitado || salvando}>
        {salvando ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.botaoTexto}>{t('comum.salvar')}</Text>
        )}
      </TouchableOpacity>

      <Modal visible={seletorAberto} animationType="slide" transparent onRequestClose={() => setSeletorAberto(false)}>
        <View style={styles.modalFundo}>
          <View style={[styles.modalCaixa, { paddingBottom: 16 + insets.bottom }]}>
            <View style={styles.modalTopo}>
              <Text style={styles.cardTitle}>{t('tarifa.distribuidora')}</Text>
              <TouchableOpacity onPress={() => setSeletorAberto(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('tarifa.buscar')}
              placeholderTextColor={colors.outline}
              autoCapitalize="characters"
              value={busca}
              onChangeText={setBusca}
            />
            {carregandoLista ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : (
              <FlatList
                data={listaFiltrada}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.itemLista} onPress={() => escolherDistribuidora(item)}>
                    <Text style={[styles.itemTexto, item === config?.distribuidora && styles.itemSelecionado]}>
                      {nomeDistribuidora(item)}
                    </Text>
                    {item === config?.distribuidora ? (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.hint}>{t('tarifa.nenhuma')}</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
