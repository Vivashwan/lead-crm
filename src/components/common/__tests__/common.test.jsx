import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmptyState from '../EmptyState';
import ErrorBoundary from '../ErrorBoundary';
import ErrorState from '../ErrorState';
import { NotificationProvider, useNotify } from '../NotificationProvider';
import SetupRequired from '../SetupRequired';

afterEach(() => vi.restoreAllMocks());

function Notifier() {
  const notify = useNotify();
  return (
    <>
      <button onClick={() => notify.success('Saved!')}>ok</button>
      <button onClick={() => notify.error('Failed!')}>fail</button>
    </>
  );
}

describe('NotificationProvider', () => {
  it('shows queued toasts one at a time', async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Notifier />
      </NotificationProvider>,
    );
    await user.click(screen.getByText('ok'));
    await user.click(screen.getByText('fail'));
    expect(await screen.findByText('Saved!')).toBeInTheDocument();
    expect(screen.queryByText('Failed!')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(await screen.findByText('Failed!')).toBeInTheDocument();
  });

  it('throws when useNotify is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Notifier />)).toThrow(/inside NotificationProvider/);
  });
});

describe('ErrorBoundary', () => {
  it('renders a fallback instead of crashing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Boom = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('renders children when nothing fails', () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
});

describe('state screens', () => {
  it('SetupRequired lists missing keys', () => {
    render(<SetupRequired missingKeys={['apiKey', 'projectId']} />);
    expect(screen.getByText(/missing: apiKey, projectId/i)).toBeInTheDocument();
  });

  it('EmptyState runs its action', async () => {
    const onAction = vi.fn();
    render(<EmptyState title="No leads yet" actionLabel="Add lead" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('ErrorState offers retry', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Offline" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
