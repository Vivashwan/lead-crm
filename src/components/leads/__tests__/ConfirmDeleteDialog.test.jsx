import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeLead } from '../../../test/fixtures';
import ConfirmDeleteDialog from '../ConfirmDeleteDialog';

const lead = makeLead();

const setup = (onConfirm = vi.fn().mockResolvedValue()) => {
  const onClose = vi.fn();
  render(<ConfirmDeleteDialog open lead={lead} onClose={onClose} onConfirm={onConfirm} />);
  return { onClose, onConfirm, user: userEvent.setup() };
};

describe('ConfirmDeleteDialog', () => {
  it('names the lead and focuses Cancel', () => {
    setup();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('cancel does not delete', async () => {
    const { user, onClose, onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirm deletes then closes', async () => {
    const { user, onClose, onConfirm } = setup();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledWith(lead);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows an error and stays open when deletion fails', async () => {
    const { user, onClose } = setup(vi.fn().mockRejectedValue({ code: 'permission-denied' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/server rejected/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
