import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders Today as the focused first screen', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /make the next session count/i })).toBeInTheDocument();
    expect(screen.getByText(/keep tuesday easy/i)).toBeInTheDocument();
  });

  it('navigates to the import review screen', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /import/i })[0]);

    expect(screen.getByRole('heading', { name: /review gym programming/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /back squat/i })).toBeInTheDocument();
  });

  it('navigates to the profile privacy context', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);

    expect(screen.getByRole('heading', { name: /kai's training context/i })).toBeInTheDocument();
    expect(screen.getByText(/secure backend/i)).toBeInTheDocument();
  });

  it('toggles the review state of an imported workout', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /import/i })[0]);

    const card = screen.getByText('Gymnastics skill + engine').closest('article');
    expect(card).not.toBeNull();
    const approveButton = within(card as HTMLElement).getByRole('button', { name: /approve/i });

    await user.click(approveButton);

    expect(approveButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies an easier version of the next hard session and lets the user restore it', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText(/crossfit class/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /apply easy version/i }));

    expect(screen.getByText(/easier: crossfit class/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /restore/i }));

    expect(screen.queryByText(/easier: crossfit class/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/crossfit class/i).length).toBeGreaterThan(0);
  });

  it('saves a log entry and shows it in the Recent logs panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /^log$/i })[0]);

    const sessionSelect = screen.getByLabelText(/which session/i);
    await user.selectOptions(sessionSelect, 'mon-cf');

    const durationInput = screen.getByLabelText(/duration/i) as HTMLInputElement;
    await user.clear(durationInput);
    await user.type(durationInput, '62');

    const notes = screen.getByLabelText(/notes/i);
    await user.type(notes, 'felt strong');

    await user.click(screen.getByRole('button', { name: /save log/i }));

    expect(screen.getByText(/saved/i)).toBeInTheDocument();
    const recentLogs = screen.getByRole('region', { name: /recent logs/i });
    expect(within(recentLogs).getByText(/felt strong/i)).toBeInTheDocument();
  });
});
