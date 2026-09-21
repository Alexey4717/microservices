import { Component, type ReactNode } from 'react';

import { signalTelegramReady } from '../telegram';
import { GateScreen } from './GateScreen';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  message: string | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Не удалось открыть кабинет.';
    return { message };
  }

  componentDidCatch(): void {
    signalTelegramReady();
  }

  render() {
    if (this.state.message) {
      return <GateScreen message={this.state.message} />;
    }
    return this.props.children;
  }
}
