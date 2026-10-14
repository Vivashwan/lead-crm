import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AppHeader from '../AppHeader';

function Harness({ onAdd, onViewChange }) {
  const [search, setSearch] = useState('');
  return (
    <>
      <AppHeader search={search} onSearchChange={setSearch} view="table" onViewChange={onViewChange} onAdd={onAdd} />
      <output>{search}</output>
    </>
  );
}

describe('AppHeader', () => {
  it('updates and clears search', async () => {
    const user = userEvent.setup();
    render(<Harness onAdd={vi.fn()} onViewChange={vi.fn()} />);
    await user.type(screen.getByRole('searchbox', { name: 'Search leads' }), 'asha');
    expect(screen.getByRole('status')).toHaveTextContent('asha');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('switches view and ignores clicking the active view', async () => {
    const onViewChange = vi.fn();
    render(<Harness onAdd={vi.fn()} onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Table view' }));
    expect(onViewChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Kanban view' }));
    expect(onViewChange).toHaveBeenCalledWith('kanban');
  });

  it('has an Add lead action', async () => {
    const onAdd = vi.fn();
    render(<Harness onAdd={onAdd} onViewChange={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Add lead' })[0]);
    expect(onAdd).toHaveBeenCalled();
  });
});
