const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// pretty-format@29 doesn't expose internal paths in its "exports" field,
// causing Metro to fail resolving "./collections" from pretty-format/build/index.js.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
