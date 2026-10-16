import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  resolve: {
    // graphql-query-complexity (ESM) and the tests must share one graphql instance.
    dedupe: ['graphql'],
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    server: {
      deps: {
        inline: ['graphql-query-complexity'],
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      'apps/web-client/**',
    ],
  },
});
