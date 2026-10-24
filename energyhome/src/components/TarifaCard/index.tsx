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

interface TarifaCardProps {
  hubId: string | null;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function reais(valor: number, casas = 2): string {
  return `R$ ${valor.toFixed(casas).replace('.', ',')}`;
}

function dataBR(iso: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function mesBR(competencia: string | null): string {
  if (!competencia) return '—';
  const [a, m] = competencia.split('-');
  return `${MESES[Number(m) - 1] ?? m}/${a}`;
}

function horaBR(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "18" / "18,5" -> 18.5 (ou null se não for número) */
function lerCampo(texto: string): number | null {
  const n = Number(texto.trim().replace(',', '.'));
  return texto.trim() !== '' && Number.isFinite(n) ? n : null;
}

function paraCampo(n: number): string {
  return String(n).replace('.', ',');
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

/** "Bandeira amarela" -> "Amarela" (mais curto pra caber na tela) */
function nomeCurtoBandeira(nome: string | null): string {
  if (!nome) return '—';
  const curto = nome.replace(/^bandeira\s+/i, '');
  return curto.charAt(0).toUpperCase() + curto.slice(1);
}

/**
 * Cartão de tarifa da tela de Ajustes: tarifa manual ou automática (ANEEL),
 * impostos da conta de luz e iluminação pública. Ver services/tarifa.ts.
 */
export function TarifaCard({ hubId }: TarifaCardProps) {
  const styles = useEstilos(criarEstilos);
  const colors = useCores();
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
      setMensagem('Tarifa e bandeira atualizadas pela ANEEL.');
    } catch (e: any) {
      setErro(
        `${e?.message ?? 'Não foi possível consultar a ANEEL.'} ` +
          (cfg.aneel ? 'Continuamos usando os últimos valores.' : 'Tente de novo em instantes.')
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
      setErro(e?.message ?? 'Não foi possível mudar o modo da tarifa.');
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
      setErro('Não foi possível carregar a lista de distribuidoras da ANEEL.');
      setSeletorAberto(false);
    }
  }

  async function salvar() {
    if (!hubId || !config) return;
    limparAvisos();

    const valorCip = cip.trim() === '' ? 0 : lerCampo(cip);
    if (valorCip === null || valorCip < 0 || valorCip > 1000) {
      setErro('Digite um valor de iluminação pública válido (em reais).');
      return;
    }

    setSalvando(true);
    try {
      if (automatica) {
        const valorIcms = icms.trim() === '' ? 0 : lerCampo(icms);
        const valorPis = pisCofins.trim() === '' ? 0 : lerCampo(pisCofins);
        if (valorIcms === null || valorPis === null || valorIcms < 0 || valorPis < 0 || valorIcms + valorPis >= 60) {
          setErro('Confira os impostos: digite só os percentuais (ex: 18 e 5,6).');
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
          setErro('Digite um valor de tarifa válido (R$ por kWh).');
          return;
        }
        await salvarConfigTarifa(hubId, { tariff: valorTarifa, cip: valorCip });
      }
      setMensagem('Configuração da tarifa salva.');
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
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
        <Text style={styles.cardTitle}>Tarifa de Energia</Text>
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchTextos}>
          <Text style={styles.switchLabel}>Tarifa automática (ANEEL)</Text>
          <Text style={styles.hint}>Busca a tarifa da sua distribuidora e a bandeira do mês.</Text>
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
              <Text style={styles.label}>Distribuidora</Text>
              <Text style={styles.seletorValor}>{config?.distribuidora ? nomeDistribuidora(config.distribuidora) : 'Escolher…'}</Text>
            </View>
            <MaterialIcons name="expand-more" size={22} color={colors.onSurfaceVariant} />
          </TouchableOpacity>

          <View style={styles.caixaAneel}>
            {buscandoAneel ? (
              <View style={styles.linhaCarregando}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.hint}>Consultando a ANEEL…</Text>
              </View>
            ) : config?.aneel ? (
              <>
                <View style={styles.linhaInfo}>
                  <Text style={styles.infoRotulo}>Tarifa ANEEL (sem impostos)</Text>
                  <Text style={styles.infoValor}>{reais(config.aneel.tarifaKwh)}/kWh</Text>
                </View>
                <Text style={styles.hint}>
                  Vigente de {dataBR(config.aneel.vigenciaInicio)} a {dataBR(config.aneel.vigenciaFim)}
                </Text>
                <View style={styles.linhaInfo}>
                  <Text style={styles.infoRotulo}>Bandeira de {mesBR(config.aneel.bandeiraCompetencia)}</Text>
                  <Text style={styles.infoValor}>{nomeCurtoBandeira(config.aneel.bandeira)}</Text>
                </View>
                {config.aneel.bandeiraAdicionalKwh > 0 ? (
                  <Text style={styles.hint}>
                    Adicional de {reais(config.aneel.bandeiraAdicionalKwh * 100)} a cada 100 kWh (sem impostos)
                  </Text>
                ) : null}
                <View style={styles.linhaInfo}>
                  <Text style={styles.hint}>Atualizado em {horaBR(config.aneel.atualizadoEm)}</Text>
                  <TouchableOpacity onPress={() => config && buscarNaAneel(config)}>
                    <Text style={styles.link}>Atualizar agora</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.hint}>Escolha a distribuidora pra buscar a tarifa.</Text>
            )}
          </View>

          <View style={styles.linhaCampos}>
            <View style={styles.campoMetade}>
              <Text style={styles.label}>ICMS (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="ex: 18"
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
                placeholder="ex: 5,6"
                placeholderTextColor={colors.outline}
                value={pisCofins}
                onChangeText={setPisCofins}
                editable={!desabilitado}
              />
            </View>
          </View>
          <Text style={styles.hint}>
            Copie os percentuais do quadro de tributos da sua conta de luz (some PIS e COFINS).
          </Text>
        </>
      ) : (
        <View style={styles.campo}>
          <Text style={styles.label}>Tarifa com impostos (R$/kWh)</Text>
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
        <Text style={styles.label}>Iluminação pública (R$/mês)</Text>
        <View style={styles.inputComPrefixo}>
          <Text style={styles.prefixo}>R$</Text>
          <TextInput
            style={styles.inputSemBorda}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={colors.outline}
            value={cip}
            onChangeText={setCip}
            editable={!desabilitado}
          />
        </View>
        <Text style={styles.hint}>Valor fixo cobrado pela prefeitura (CIP/COSIP), aparece na conta de luz.</Text>
      </View>

      <View style={styles.resultado}>
        <Text style={styles.resultadoRotulo}>Tarifa final usada nos cálculos</Text>
        <Text style={styles.resultadoValor}>{previa !== null ? `${reais(previa)}/kWh` : '—'}</Text>
      </View>

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}

      <TouchableOpacity style={styles.botao} onPress={salvar} disabled={desabilitado || salvando}>
        {salvando ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Text style={styles.botaoTexto}>Salvar</Text>
        )}
      </TouchableOpacity>

      <Modal visible={seletorAberto} animationType="slide" transparent onRequestClose={() => setSeletorAberto(false)}>
        <View style={styles.modalFundo}>
          <View style={styles.modalCaixa}>
            <View style={styles.modalTopo}>
              <Text style={styles.cardTitle}>Distribuidora</Text>
              <TouchableOpacity onPress={() => setSeletorAberto(false)}>
                <MaterialIcons name="close" size={24} color={colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Buscar (ex: ENEL)"
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
                ListEmptyComponent={<Text style={styles.hint}>Nenhuma distribuidora encontrada.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
