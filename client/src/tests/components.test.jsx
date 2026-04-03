import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Pagination from '../common/Pagination';
import ActionMenu from '../common/ActionMenu';
import ConfirmModal from '../common/ConfirmModal';

// Helper to wrap components that need Router context
const withRouter = (ui) => <BrowserRouter>{ui}</BrowserRouter>;

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} totalItems={5} pageSize={10} onPage={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders page info and buttons', () => {
    render(
      <Pagination page={1} totalPages={3} totalItems={25} pageSize={10} onPage={() => {}} />
    );
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText(/Showing 1 to 10 of 25/)).toBeInTheDocument();
  });

  it('disables Prev on first page', () => {
    render(
      <Pagination page={1} totalPages={3} totalItems={25} pageSize={10} onPage={() => {}} />
    );
    const prevBtn = screen.getByText('Prev').closest('button');
    expect(prevBtn).toBeDisabled();
  });

  it('calls onPage when Next is clicked', async () => {
    const onPage = vi.fn();
    render(
      <Pagination page={1} totalPages={3} totalItems={25} pageSize={10} onPage={onPage} />
    );
    await userEvent.click(screen.getByText('Next'));
    expect(onPage).toHaveBeenCalledWith(2);
  });
});

describe('ConfirmModal', () => {
  it('renders title and message', () => {
    render(
      <ConfirmModal
        title="Delete Item?"
        message="This cannot be undone."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Delete Item?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onCancel when cancel clicked', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        title="Test"
        message="Test"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    await userEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onConfirm when confirm clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        title="Test"
        message="Test"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );
    await userEvent.click(screen.getByText('Delete'));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('ActionMenu', () => {
  it('renders the trigger button', () => {
    render(
      <ActionMenu
        id="test-1"
        openId={null}
        onToggle={() => {}}
        items={[{ label: 'Edit', icon: null, onClick: () => {} }]}
      />
    );
    // The trigger button contains the EllipsisVertical icon
    const btn = document.querySelector('.icon-btn');
    expect(btn).toBeInTheDocument();
  });

  it('shows menu items when open', () => {
    render(
      <ActionMenu
        id="test-1"
        openId="test-1"
        onToggle={() => {}}
        items={[
          { label: 'Edit', icon: null, onClick: () => {} },
          { label: 'Delete', icon: null, onClick: () => {} },
        ]}
      />
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('does not show menu items when closed', () => {
    render(
      <ActionMenu
        id="test-1"
        openId="other-id"
        onToggle={() => {}}
        items={[{ label: 'Edit', icon: null, onClick: () => {} }]}
      />
    );
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});
