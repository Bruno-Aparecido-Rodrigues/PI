// Resumo do workflow "Dependências": lê a saída de `npm audit --json` e de
// `npm outdated --json` e escreve uma tabela na página da execução (aba
// Actions). Sai com erro se houver vulnerabilidade CRÍTICA em dependência do
// app, pra o PR não ser aceito assim.

import { readFileSync, appendFileSync } from 'node:fs';

const [arqAudit, arqDesatualizados] = process.argv.slice(2);

function lerJson(caminho) {
  try {
    const texto = readFileSync(caminho, 'utf8').trim();
    return texto ? JSON.parse(texto) : {};
  } catch {
    return null; // npm não gerou o arquivo (ex.: sem internet)
  }
}

const audit = lerJson(arqAudit);
const desatualizados = lerJson(arqDesatualizados) ?? {};

// Pacotes que só sobem na troca de SDK do Expo (mesma lista do dependabot.yml).
// Os do próprio Expo (expo, expo-*, @expo/*) recebem correções pelo Dependabot,
// mas versão minor/major nova também é troca de SDK.
const DO_SDK = new Set([
  'react',
  'react-native',
  'react-native-safe-area-context',
  'react-native-screens',
  'react-native-svg',
  '@react-native-async-storage/async-storage',
  '@types/react',
  'typescript',
]);
const eDoExpo = (nome) => nome === 'expo' || nome.startsWith('expo-') || nome.startsWith('@expo/');

const linhas = [];
const GRAVIDADES = [
  ['critical', 'Crítica'],
  ['high', 'Alta'],
  ['moderate', 'Moderada'],
  ['low', 'Baixa'],
];

// ─── Vulnerabilidades ───────────────────────────────────────────────────
linhas.push('## Vulnerabilidades (dependências do app, sem as de desenvolvimento)', '');
let criticas = 0;
if (!audit || audit.error) {
  linhas.push('⚠️ Não foi possível consultar o `npm audit` nesta execução.', '');
} else {
  const contagem = audit.metadata?.vulnerabilities ?? {};
  criticas = contagem.critical ?? 0;
  linhas.push('| Gravidade | Quantidade |', '|---|---|');
  for (const [chave, nome] of GRAVIDADES) linhas.push(`| ${nome} | ${contagem[chave] ?? 0} |`);
  linhas.push('');

  const graves = Object.values(audit.vulnerabilities ?? {}).filter((v) => ['critical', 'high'].includes(v.severity));
  if (graves.length) {
    linhas.push('| Pacote | Gravidade | Correção |', '|---|---|---|');
    for (const v of graves) {
      let correcao = 'sem correção ainda';
      if (v.fixAvailable === true) correcao = '`npm audit fix`';
      else if (v.fixAvailable && typeof v.fixAvailable === 'object') {
        const instalado = desatualizados[v.fixAvailable.name]?.current;
        const voltaVersao =
          instalado && Number(v.fixAvailable.version.split('.')[0]) < Number(instalado.split('.')[0]);
        correcao = voltaVersao
          ? `o npm sugere voltar ${v.fixAvailable.name} para ${v.fixAvailable.version}: não fazer, ver docs/DEPENDENCIAS.md`
          : `atualizar ${v.fixAvailable.name} para ${v.fixAvailable.version}` +
            (v.fixAvailable.isSemVerMajor ? ' (versão major: testar com cuidado)' : '');
      }
      linhas.push(`| ${v.name} | ${v.severity === 'critical' ? 'Crítica' : 'Alta'} | ${correcao} |`);
    }
    linhas.push('');
  }
}

// ─── Desatualizados ─────────────────────────────────────────────────────
const lista = Object.entries(desatualizados);
linhas.push('## Pacotes desatualizados', '');
if (!lista.length) {
  linhas.push('Todos os pacotes estão na versão mais nova permitida. ✅', '');
} else {
  linhas.push(
    '| Pacote | Instalado | Dentro da faixa do package.json | Mais nova | Quem atualiza |',
    '|---|---|---|---|---|'
  );
  for (const [nome, info] of lista.sort(([a], [b]) => a.localeCompare(b))) {
    const major = String(info.latest ?? '').split('.')[0] !== String(info.current ?? '').split('.')[0];
    let quem;
    if (DO_SDK.has(nome)) quem = 'troca de SDK do Expo';
    else {
      const partes = [];
      // Fora do Expo, o Dependabot propõe tudo que não for major (inclusive
      // 0.24 -> 0.26, que o npm não instala sozinho por causa do ^0.24)
      const alvo = !major && !eDoExpo(nome) ? info.latest : info.wanted;
      if (alvo && alvo !== info.current) partes.push(`Dependabot (até ${alvo})`);
      else if (info.wanted && info.wanted !== info.current) partes.push(`Dependabot (até ${info.wanted})`);
      if (eDoExpo(nome)) {
        if (info.latest !== info.wanted) partes.push('versão nova = troca de SDK do Expo');
      } else if (major) {
        partes.push(`a equipe, à mão (${info.latest} é major)`);
      }
      quem = partes.join(' · ') || '—';
    }
    linhas.push(`| ${nome} | ${info.current ?? '—'} | ${info.wanted ?? '—'} | ${info.latest ?? '—'} | ${quem} |`);
  }
  linhas.push('');
}

if (criticas) {
  linhas.push(`❌ **${criticas} vulnerabilidade(s) crítica(s).** Veja a tabela acima e o guia em docs/DEPENDENCIAS.md.`);
}

const resumo = linhas.join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo);
console.log(resumo);
process.exit(criticas ? 1 : 0);
