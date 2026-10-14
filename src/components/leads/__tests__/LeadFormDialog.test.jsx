import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../domain/validation';
import { makeLead } from '../../../test/fixtures';
import LeadFormDialog from '../LeadFormDialog';

const setup = (props = {}) => {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue({ queued: false });
  const onClose = vi.fn();
  render(<LeadFormDialog open onClose={onClose} onSubmit={onSubmit} {...props} />);
  return { onSubmit, onClose, user: userEvent.setup() };
};

const field = (name) => screen.getByRole('textbox', { name: new RegExp(`^${name}`, 'i') });
const select = (name) => screen.getByRole('combobox', { name: new RegExp(`^${name}`, 'i') });

async function fillValid(user) {
  await user.type(field('name'), 'Asha Rao');
  await user.type(field('email'), 'asha@acme.com');
  await user.type(field('mobile'), '9876543210');
}

describe('LeadFormDialog', () => {
  it('renders an empty create form with default status and priority', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Add lead' })).toBeInTheDocument();
    expect(field('name')).toHaveValue('');
    expect(select('status')).toHaveValue('NEW');
    expect(select('priority')).toHaveValue('MEDIUM');
  });

  it('shows required errors for every empty field on submit and does not submit', async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Mobile number is required')).toBeInTheDocument();
    expect(field('name')).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates a field when leaving it, and clears the error once fixed', async () => {
    const { user } = setup();
    await user.type(field('email'), 'not-an-email');
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(field('email')).toHaveAttribute('aria-invalid', 'true');

    await user.clear(field('email'));
    await user.type(field('email'), 'ok@acme.com');
    expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument();
  });

  it.each([
    ['name', 'A', 'Name must be at least 2 characters'],
    ['mobile', '98765abc10', 'Mobile number must contain digits only'],
    ['mobile', '98765 4321', 'Mobile number must contain digits only'],
    ['mobile', '987654321', 'Mobile number must be exactly 10 digits'],
    ['mobile', '0876543210', 'Mobile number cannot start with 0'],
  ])('rejects invalid %s', async (name, value, message) => {
    const { user, onSubmit } = setup();
    await fillValid(user);
    await user.clear(field(name));
    await user.type(field(name), value);
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('limits input length', () => {
    setup();
    expect(field('name')).toHaveAttribute('maxLength', '100');
    expect(field('email')).toHaveAttribute('maxLength', '254');
    expect(field('mobile')).toHaveAttribute('maxLength', '10');
    expect(field('mobile')).toHaveAttribute('inputMode', 'numeric');
  });

  it('submits entered values and closes', async () => {
    const { user, onSubmit, onClose } = setup();
    await fillValid(user);
    await user.selectOptions(select('status'), 'QUALIFIED');
    await user.selectOptions(select('priority'), 'URGENT');
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Asha Rao',
      email: 'asha@acme.com',
      mobile: '9876543210',
      status: 'QUALIFIED',
      priority: 'URGENT',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows duplicate errors from the server under the field and stays open', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ValidationError({ email: 'A lead with this email already exists' }));
    const { user, onClose } = setup({ onSubmit });
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(await screen.findByText('A lead with this email already exists')).toBeInTheDocument();
    expect(field('email')).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();

    await user.type(field('email'), 'x');
    expect(screen.queryByText('A lead with this email already exists')).not.toBeInTheDocument();
  });

  it('shows a friendly message for server failures', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ code: 'unavailable' });
    const { user, onClose } = setup({ onSubmit });
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(await screen.findByText(/check your internet connection/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables saving while a submit is in flight (no double submit)', async () => {
    let resolve;
    const onSubmit = vi.fn(() => new Promise((r) => (resolve = r)));
    const { user } = setup({ onSubmit });
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    const saving = screen.getByRole('button', { name: 'Saving…' });
    expect(saving).toBeDisabled();
    fireEvent.submit(saving.closest('form')); // e.g. pressing Enter again
    await new Promise((r) => setTimeout(r, 0));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve();
  });

  it('pre-fills values in edit mode', async () => {
    const lead = makeLead({ status: 'WON', priority: 'LOW' });
    const { user, onSubmit } = setup({ lead });
    expect(screen.getByRole('heading', { name: 'Edit lead' })).toBeInTheDocument();
    expect(field('name')).toHaveValue('Asha Rao');
    expect(select('status')).toHaveValue('WON');
    await user.clear(field('name'));
    await user.type(field('name'), 'Asha R');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Asha R', email: lead.email }));
  });

  it('cancels without submitting', async () => {
    const { user, onSubmit, onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
