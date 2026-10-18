import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { type Plugin, searchForWorkspaceRoot } from 'vite';

const workspaceRoot = searchForWorkspaceRoot(process.cwd());

// pnpm (nodeLinker: hoisted) держит React 19.2.3 в корне и 19.2.8 у desktop,
// а @apollo/client и react-router получают ещё одну вложенную копию 19.2.8.
// Vite вшивает её в пребандл, и useContext в ApolloProvider оказывается null.
const require = createRequire(import.meta.url);

function desktopPackageRoot(specifier: string): string {
  return dirname(require.resolve(`${specifier}/package.json`));
}

const reactRoot = desktopPackageRoot('react');
const reactDomRoot = desktopPackageRoot('react-dom');

const graphqlProxy = {
  '/graphql': {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
  },
};

// Vite резолвит exports через resolve.exports, который портит шаблон
// "./operations/*/*" в @libs/graphql. Указываем на исходники напрямую.
function graphqlOperationsResolver(workspaceRoot: string): Plugin {
  const operationsRoot = resolve(workspaceRoot, 'libs/graphql/src/operations');
  return {
    name: 'desktop-graphql-operations',
    enforce: 'pre',
    resolveId(source) {
      const match = /^@libs\/graphql\/operations\/(.+)$/.exec(source);
      const nested = match?.[1];
      if (!nested) {
        return null;
      }
      const file = resolve(operationsRoot, `${nested}.ts`);
      return existsSync(file) ? file : null;
    },
  };
}

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [graphqlOperationsResolver(workspaceRoot), react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        react: reactRoot,
        'react-dom': reactDomRoot,
      },
    },
    optimizeDeps: {
      include: ['@apollo/client/react', 'react-router'],
    },
    server: {
      host: '127.0.0.1',
      port: 4002,
      strictPort: true,
      fs: {
        allow: [workspaceRoot],
      },
      proxy: graphqlProxy,
    },
  },
});
