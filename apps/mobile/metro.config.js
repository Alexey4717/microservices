const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Expo SDK 57 watches each workspace package, including libs/graphql.
// Adding the repository root as a watch folder makes the app entry unresolvable.
const graphqlRoot = path.resolve(monorepoRoot, 'libs/graphql');
const watched = new Set(
  config.watchFolders.map((folder) => path.resolve(folder)),
);
if (!watched.has(graphqlRoot)) {
  config.watchFolders.push(graphqlRoot);
}

// Windows + pnpm: expo-router's require.context can prefix a second drive
// letter (`c:\C:\...`). Strip it so route files still resolve.
const doubledDrive = /^[a-zA-Z]:\\(?=[a-zA-Z]:\\)/;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const normalized = doubledDrive.test(moduleName)
    ? moduleName.replace(doubledDrive, '')
    : moduleName;
  return context.resolveRequest(context, normalized, platform);
};

module.exports = config;
