import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sampleLeads } from '../../../test/fixtures';

// Keep dnd-kit real, but capture DndContext's handlers: jsdom has no layout, so
// pointer-driven collision detection cannot run here.
const dnd = vi.hoisted(() => ({ props: null }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    DndContext: (props) => {
      dnd.props = props;
      return <actual.DndContext {...props} />;
    },
  };
});

const { default: KanbanView } = await import('../KanbanView');

const handlers = () => ({ onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onStatusChange: vi.fn(), onClearSearch: vi.fn() });
const column = (label) => screen.getByRole('region', { name: `${label} column` });
const cardsIn = (label) => within(column(label)).queryAllByRole('article').map((a) => a.getAttribute('aria-label'));

let h;
beforeEach(() => {
  h = handlers();
});

describe('KanbanView', () => {
  it('renders one column per status in order with counts', () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent);
    expect(headings).toEqual(['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']);
    expect(within(column('New')).getByLabelText('2 leads')).toBeInTheDocument();
    expect(within(column('Contacted')).getByText('Drop leads here')).toBeInTheDocument();
  });

  it('puts each lead in its status column, urgent first', () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    expect(cardsIn('New')).toEqual(['Chen Li', 'Asha Rao']);
    expect(cardsIn('Won')).toEqual(['Bharat Singh']);
    expect(cardsIn('Proposal')).toEqual(['Dana Fox']);
  });

  it('changes status from the card dropdown', async () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status for Asha Rao' }), 'QUALIFIED');
    expect(h.onStatusChange).toHaveBeenCalledWith('a', 'QUALIFIED');
  });

  it('moves a lead when dropped on another column', () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    act(() => dnd.props.onDragStart({ active: { id: 'a' } }));
    act(() => dnd.props.onDragEnd({ active: { id: 'a', data: { current: { status: 'NEW' } } }, over: { id: 'WON' } }));
    expect(h.onStatusChange).toHaveBeenCalledWith('a', 'WON');
  });

  it('ignores drops on the same column or outside any column', () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    act(() => dnd.props.onDragEnd({ active: { id: 'a', data: { current: { status: 'NEW' } } }, over: { id: 'NEW' } }));
    act(() => dnd.props.onDragEnd({ active: { id: 'a', data: { current: { status: 'NEW' } } }, over: null }));
    expect(h.onStatusChange).not.toHaveBeenCalled();
  });

  it('does nothing when a drag is cancelled', () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    act(() => dnd.props.onDragStart({ active: { id: 'c' } }));
    act(() => dnd.props.onDragCancel());
    expect(h.onStatusChange).not.toHaveBeenCalled();
    expect(cardsIn('New')).toEqual(['Chen Li', 'Asha Rao']);
  });

  it('announces drag actions for screen readers', () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    const a = dnd.props.accessibility.announcements;
    expect(a.onDragStart({ active: { id: 'a' } })).toBe('Picked up Asha Rao.');
    expect(a.onDragEnd({ active: { id: 'a' }, over: { id: 'WON' } })).toBe('Asha Rao moved to Won.');
  });

  it('has a keyboard-focusable drag handle per card', () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    const handle = screen.getByRole('button', { name: 'Drag Asha Rao' });
    handle.focus();
    expect(handle).toHaveFocus();
  });

  it('filters cards with the global search and offers to clear it', async () => {
    const { rerender } = render(<KanbanView leads={sampleLeads} search="acme" {...h} />);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('2 of 4 leads')).toBeInTheDocument();

    rerender(<KanbanView leads={sampleLeads} search="zzz" {...h} />);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(h.onClearSearch).toHaveBeenCalled();
  });

  it('edits and deletes from a card', async () => {
    render(<KanbanView leads={sampleLeads} search="" {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Dana Fox' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Dana Fox' }));
    expect(h.onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'd' }));
    expect(h.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'd' }));
  });

  it('shows an empty state when there are no leads', async () => {
    render(<KanbanView leads={[]} search="" {...h} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(h.onAdd).toHaveBeenCalled();
  });
});
