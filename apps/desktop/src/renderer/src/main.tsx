import { ApolloProvider } from '@apollo/client/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';

import { apolloClient } from './apollo';
import { App } from './App';
import { SessionProvider } from './session';
import './styles/index.scss';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Не найден элемент #root');
}

createRoot(root).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <HashRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </HashRouter>
    </ApolloProvider>
  </StrictMode>,
);
