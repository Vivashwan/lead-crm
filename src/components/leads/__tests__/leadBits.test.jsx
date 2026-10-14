import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeLead } from '../../../test/fixtures';
import LeadActions from '../LeadActions';
import PriorityChip from '../PriorityChip';
import StatusChip from '../StatusChip';
import StatusSelect from '../StatusSelect';

describe('chips', () => {
  it('render labels and ignore unknown values', () => {
    const { container } = render(
      <>
        <StatusChip status="PROPOSAL" />
        <PriorityChip priority="URGENT" />
        <StatusChip status="BOGUS" />
      </>,
    );
    expect(screen.getByText('Proposal')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(container.querySelectorAll('.MuiChip-root')).toHaveLength(2);
  });
});

describe('StatusSelect', () => {
  it('lists all statuses and reports changes', async () => {
    const onChange = vi.fn();
    render(<StatusSelect value="NEW" onChange={onChange} label="Status for Asha" />);
    const select = screen.getByRole('combobox', { name: 'Status for Asha' });
    expect(select.querySelectorAll('option')).toHaveLength(6);
    await userEvent.selectOptions(select, 'WON');
    expect(onChange).toHaveBeenCalledWith('WON');
  });
});

describe('LeadActions', () => {
  it('calls edit and delete with the lead', async () => {
    const lead = makeLead();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<LeadActions lead={lead} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Asha Rao' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Asha Rao' }));
    expect(onEdit).toHaveBeenCalledWith(lead);
    expect(onDelete).toHaveBeenCalledWith(lead);
  });
});
