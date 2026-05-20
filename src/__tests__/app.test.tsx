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

  it('shows the profile prompt on first launch', () => {
    render(<App />);
    expect(screen.getByText(/set up your profile to make hybrid coach feel like yours/i)).toBeInTheDocument();
  });

  it('dismisses the profile prompt and remembers the dismissal', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    const banner = screen.getByRole('region', { name: /profile prompt/i });
    await user.click(within(banner).getByRole('button', { name: /dismiss profile prompt/i }));

    expect(screen.queryByRole('region', { name: /profile prompt/i })).not.toBeInTheDocument();

    unmount();
    render(<App />);
    expect(screen.queryByRole('region', { name: /profile prompt/i })).not.toBeInTheDocument();
  });

  it('navigates to the profile screen from the prompt', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /set up profile/i }));

    expect(screen.getByRole('heading', { name: /training context/i })).toBeInTheDocument();
  });

  it('saves profile edits and hides the profile prompt afterwards', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);

    const nameInput = screen.getByLabelText(/^name$/i) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Sam');

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(screen.getByText(/saved/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /today/i })[0]);

    expect(screen.queryByRole('region', { name: /profile prompt/i })).not.toBeInTheDocument();
  });

  it('blocks save when name is empty', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);

    const nameInput = screen.getByLabelText(/^name$/i) as HTMLInputElement;
    await user.clear(nameInput);

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  it('adding a PR then removing it leaves no trace of the entry', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    expect(saveButton).toBeDisabled();

    const liftInput = screen.getByPlaceholderText(/lift \(e\.g\. back squat\)/i);
    const valueInput = screen.getByPlaceholderText(/value \(e\.g\. 150 kg\)/i);
    await user.type(liftInput, 'Snatch double');
    await user.type(valueInput, '70 kg');

    await user.click(screen.getByRole('button', { name: /^add pr$/i }));

    expect(saveButton).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: /remove snatch double/i }));

    expect(screen.queryByText('Snatch double')).not.toBeInTheDocument();
  });
});
