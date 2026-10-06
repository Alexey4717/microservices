import type { CodegenConfig } from '@graphql-codegen/cli';

const avoidOptionals = {
  field: true,
  object: true,
  inputValue: false,
  defaultValue: false,
};

const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: './src/operations/**/*.graphql',
  generates: {
    './src/schema-types.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsTypes: true,
        scalars: {
          Upload: 'File',
        },
        avoidOptionals,
      },
    },
    './src/operations/': {
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.generated.ts',
        baseTypesPath: '../schema-types.ts',
      },
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        documentMode: 'graphQLTag',
        gqlImport: '@apollo/client#gql',
        enumsAsTypes: true,
        scalars: {
          Upload: 'File',
        },
        avoidOptionals,
        useTypeImports: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['node ./prettier-write.mjs'],
  },
};

export default config;
