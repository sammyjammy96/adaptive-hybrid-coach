import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../services/ocrImport', () => ({
  extractTextFromImage: vi.fn().mockResolvedValue({
    text: 'Wed: 5x3 back squat\nThen 10 min AMRAP wall balls, burpees',
    confidence: 0.82
  })
}));

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
    await user.click(screen.getByRole('button', { name: /edit profile/i }));

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
    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const nameInput = screen.getByLabelText(/^name$/i) as HTMLInputElement;
    await user.clear(nameInput);

    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  it('cancel discards profile edits without changing the saved profile', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);
    await user.click(screen.getByRole('button', { name: /edit profile/i }));

    const liftInput = screen.getByPlaceholderText(/lift \(e\.g\. back squat\)/i);
    const valueInput = screen.getByPlaceholderText(/value \(e\.g\. 150 kg\)/i);
    await user.type(liftInput, 'Snatch double');
    await user.type(valueInput, '70 kg');
    await user.click(screen.getByRole('button', { name: /^add pr$/i }));

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByText('Snatch double')).not.toBeInTheDocument();
  });

  it('regenerating the week updates the tag summary and rationale', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /^plan$/i })[0]);

    const initialTagText = screen.getByText(/^tags: /i).textContent ?? '';
    await user.click(screen.getAllByRole('button', { name: /today/i })[0]);
    const initialRationale = screen.getByText(/why this week/i).closest('p')?.textContent ?? '';

    await user.click(screen.getAllByRole('button', { name: /^plan$/i })[0]);
    await user.click(screen.getByRole('button', { name: /regenerate week/i }));

    const updatedTagText = screen.getByText(/^tags: /i).textContent ?? '';
    expect(updatedTagText).not.toBe(initialTagText);

    await user.click(screen.getAllByRole('button', { name: /today/i })[0]);
    const updatedRationale = screen.getByText(/why this week/i).closest('p')?.textContent ?? '';
    expect(updatedRationale).not.toBe(initialRationale);
  });

  it('resetting prototype data brings the profile prompt back', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    try {
      render(<App />);

      // Save a custom profile so the prompt hides.
      await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);
      await user.click(screen.getByRole('button', { name: /edit profile/i }));
      const nameInput = screen.getByLabelText(/^name$/i) as HTMLInputElement;
      await user.clear(nameInput);
      await user.type(nameInput, 'Sam');
      await user.click(screen.getByRole('button', { name: /save profile/i }));

      // Confirm the prompt is gone on Today.
      await user.click(screen.getAllByRole('button', { name: /today/i })[0]);
      expect(screen.queryByRole('region', { name: /profile prompt/i })).not.toBeInTheDocument();

      // Reset.
      await user.click(screen.getAllByRole('button', { name: /profile/i })[0]);
      await user.click(screen.getByRole('button', { name: /reset prototype data/i }));

      // Back to Today, prompt should be visible again.
      await user.click(screen.getAllByRole('button', { name: /today/i })[0]);
      expect(screen.getByRole('region', { name: /profile prompt/i })).toBeInTheDocument();
    } finally {
      confirmSpy.mockRestore();
    }
  });

  it('uploading a screenshot OCRs the file and adds a parsed workout', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: /import/i })[0]);

    const fileInput = screen
      .getByText(/upload screenshot/i)
      .closest('label')
      ?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(['image-bytes'], 'shot.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    // pickTitle: "Wed: 5x3 back squat" starts with 'W' (not a digit) so it is
    // the first candidate — the parser returns it as the title.
    const parsedCard = await screen.findByRole('heading', { name: /wed: 5x3 back squat/i });
    expect(parsedCard).toBeInTheDocument();

    const article = parsedCard.closest('article');
    expect(article).not.toBeNull();
    expect(within(article as HTMLElement).getByText(/wed pushpress/i)).toBeInTheDocument();
    expect(within(article as HTMLElement).getByText(/82% confidence/i)).toBeInTheDocument();
  });
});
