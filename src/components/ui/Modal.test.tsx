import { fireEvent, render, screen } from '@testing-library/react';
import { it, expect, vi } from 'vitest';
import { Modal } from './Modal';

it('traps keyboard focus, uses the latest close handler, and restores the opener', () => {
  const opener = document.createElement('button');
  document.body.append(opener);
  opener.focus();
  const close = vi.fn(),
    latest = vi.fn();
  const { rerender, unmount } = render(
    <Modal title="Edit bot" subtitle="Details" onClose={close}>
      <input aria-label="Name" />
      <button>Save</button>
    </Modal>,
  );
  expect(screen.getByRole('dialog')).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(screen.getByText('Save')).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(screen.getByLabelText('Close dialog')).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(screen.getByText('Save')).toHaveFocus();
  rerender(
    <Modal title="Edit bot" onClose={latest} wide>
      <input aria-label="Name" />
    </Modal>,
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByLabelText('Close dialog'));
  expect(latest).toHaveBeenCalledTimes(2);
  expect(close).not.toHaveBeenCalled();
  unmount();
  expect(opener).toHaveFocus();
  opener.remove();
});
