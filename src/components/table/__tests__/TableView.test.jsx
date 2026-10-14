import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../constants/leads';
import { makeLead, sampleLeads } from '../../../test/fixtures';
import { mockScreen, resetScreen } from '../../../test/media';
import TableView from '../TableView';

afterEach(resetScreen);

const setup = (props = {}) => {
  const handlers = { onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), onClearSearch: vi.fn() };
  const utils = render(<TableView leads={sampleLeads} search="" {...handlers} {...props} />);
  return { ...handlers, ...utils, user: userEvent.setup() };
};

const bodyRows = () => within(screen.getByRole('table', { name: 'Leads' })).getAllByRole('row').slice(2);
const names = () => bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent);

describe('TableView (desktop table)', () => {
  it('renders all columns and rows, newest first by default', () => {
    setup();
    ['Name', 'Email', 'Mobile', 'Status', 'Priority'].forEach((h) =>
      expect(screen.getByRole('columnheader', { name: new RegExp(`^${h}`) })).toBeInTheDocument(),
    );
    expect(names()).toEqual(['Dana Fox', 'Asha Rao', 'Chen Li', 'Bharat Singh']);
    expect(screen.getByText('4 leads')).toBeInTheDocument();
  });

  it('renders safe contact links', () => {
    setup();
    expect(screen.getByRole('link', { name: 'asha@acme.com' })).toHaveAttribute('href', 'mailto:asha@acme.com');
    expect(screen.getByRole('link', { name: '9876543210' })).toHaveAttribute('href', 'tel:9876543210');
  });

  it('sorts by every column, toggling direction, and remembers the sort', async () => {
    const { user, unmount } = setup();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(names()).toEqual(['Asha Rao', 'Bharat Singh', 'Chen Li', 'Dana Fox']);
    expect(screen.getByRole('columnheader', { name: /^Name/ })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(names()).toEqual(['Dana Fox', 'Chen Li', 'Bharat Singh', 'Asha Rao']);

    await user.click(screen.getByRole('button', { name: 'Priority' }));
    expect(names()).toEqual(['Bharat Singh', 'Dana Fox', 'Asha Rao', 'Chen Li']);

    await user.click(screen.getByRole('button', { name: 'Status' }));
    expect(names()[3]).toBe('Bharat Singh'); // WON after NEW/PROPOSAL

    await user.click(screen.getByRole('button', { name: 'Email' }));
    expect(names()[0]).toBe('Asha Rao');
    await user.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(names()[0]).toBe('Dana Fox');

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SORT))).toEqual({ field: 'mobile', direction: 'asc' });
    unmount();
    setup();
    expect(names()[0]).toBe('Dana Fox');
  });

  it.each([
    ['name', 'chen', ['Chen Li']],
    ['email', 'acme', ['Asha Rao', 'Chen Li']],
    ['mobile', '555 123', ['Dana Fox']],
  ])('searches the %s column', async (column, term, expected) => {
    const { user } = setup();
    await user.type(screen.getByRole('searchbox', { name: `Filter by ${column}` }), term);
    await waitFor(() => expect(names()).toEqual(expected));
    expect(screen.getByText(`${expected.length} of 4 leads`)).toBeInTheDocument();
  });

  it('filters by status and priority multi-selects', async () => {
    const { user } = setup();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Filter by status' }));
    await user.click(screen.getByRole('option', { name: 'New' }));
    await user.click(screen.getByRole('option', { name: 'Won' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(names()).toEqual(['Asha Rao', 'Chen Li', 'Bharat Singh']));

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Filter by priority' }));
    await user.click(screen.getByRole('option', { name: 'Urgent' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(names()).toEqual(['Chen Li']));
  });

  it('applies the global search', () => {
    setup({ search: 'proposal' });
    expect(names()).toEqual(['Dana Fox']);
  });

  it('shows a no-match state that clears filters and search', async () => {
    const { user, onClearSearch } = setup();
    await user.type(screen.getByRole('searchbox', { name: 'Filter by name' }), 'zzz');
    expect(await screen.findByText('No leads match your search')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(onClearSearch).toHaveBeenCalled();
    await waitFor(() => expect(names()).toHaveLength(4));
  });

  it('shows an empty state with Add when there are no leads', async () => {
    const { user, onAdd } = setup({ leads: [] });
    expect(screen.getByText('No leads yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(onAdd).toHaveBeenCalled();
  });

  describe('paging', () => {
    const many = Array.from({ length: 23 }, (_, i) =>
      makeLead({ id: `l${i}`, name: `Lead ${String(i).padStart(2, '0')}`, email: `l${i}@x.com`, mobile: `90000000${String(i).padStart(2, '0')}`, createdAt: i }),
    );

    it('pages through results and changes page size (remembered)', async () => {
      const { user, unmount } = setup({ leads: many });
      expect(bodyRows()).toHaveLength(10);
      expect(screen.getByText('1–10 of 23')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /next page/i }));
      expect(screen.getByText('11–20 of 23')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /next page/i }));
      expect(bodyRows()).toHaveLength(3);

      fireEvent.mouseDown(screen.getByRole('combobox', { name: /rows per page/i }));
      await user.click(screen.getByRole('option', { name: '25' }));
      expect(bodyRows()).toHaveLength(23);
      expect(localStorage.getItem(STORAGE_KEYS.PAGE_SIZE)).toBe('25');
      unmount();
      setup({ leads: many });
      expect(bodyRows()).toHaveLength(23);
    });

    it('returns to page 1 when the search changes', async () => {
      const { user, rerender, onAdd, onEdit, onDelete, onClearSearch } = setup({ leads: many });
      await user.click(screen.getByRole('button', { name: /next page/i }));
      expect(screen.getByText('11–20 of 23')).toBeInTheDocument();
      rerender(
        <TableView leads={many} search="lead" onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onClearSearch={onClearSearch} />,
      );
      expect(screen.getByText('1–10 of 23')).toBeInTheDocument();
    });

    it('stays on a valid page when leads are deleted', () => {
      const { rerender, onAdd, onEdit, onDelete, onClearSearch } = setup({ leads: many });
      fireEvent.click(screen.getByRole('button', { name: /next page/i }));
      fireEvent.click(screen.getByRole('button', { name: /next page/i }));
      act(() =>
        rerender(
          <TableView leads={many.slice(0, 15)} search="" onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onClearSearch={onClearSearch} />,
        ),
      );
      expect(screen.getByText('11–15 of 15')).toBeInTheDocument();
    });
  });

  it('fires edit and delete with the row lead', async () => {
    const { user, onEdit, onDelete } = setup();
    await user.click(screen.getByRole('button', { name: 'Edit Chen Li' }));
    await user.click(screen.getByRole('button', { name: 'Delete Chen Li' }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });
});

describe('TableView (phone cards)', () => {
  it('renders cards with sort dropdown and collapsible column filters', async () => {
    mockScreen({ phone: true });
    const { user } = setup();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const cards = () => screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'));
    expect(cards()).toEqual(['Dana Fox', 'Asha Rao', 'Chen Li', 'Bharat Singh']);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'name:asc');
    expect(cards()).toEqual(['Asha Rao', 'Bharat Singh', 'Chen Li', 'Dana Fox']);

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.type(screen.getByRole('searchbox', { name: 'Filter by email' }), 'zen');
    await waitFor(() => expect(cards()).toEqual(['Bharat Singh']));
  });
});
