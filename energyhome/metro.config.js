const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Corrige o erro "Component auth has not been registered yet" causado pela
// resolução de "package.json exports" do Metro conflitando com o Firebase
// JS SDK v10+ (o Metro acaba carregando o módulo de Auth duas vezes).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
