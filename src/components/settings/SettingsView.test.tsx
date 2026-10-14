import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsView } from './SettingsView';
import { DEFAULT_SETTINGS, DEFAULT_PLEDGE_MESSAGE } from '../../services/storage/seedData';

describe('SettingsView Accountability Section', () => {
  it('renders Accountability & Daily Pledge section with default cutoff and message', () => {
    const handleUpdateSettings = vi.fn();

    render(
      <SettingsView
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdateSettings}
        onResetSeedData={vi.fn().mockResolvedValue({ added: 0, updated: 0 })}
        onRefreshData={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    expect(screen.getByText('Accountability & Daily Pledge')).toBeInTheDocument();
    expect(screen.getByText('Daily Cutoff Time')).toBeInTheDocument();
    expect(screen.getByText('Exact Pledge Message')).toBeInTheDocument();

    const timeInput = screen.getByDisplayValue('21:00');
    expect(timeInput).toBeInTheDocument();

    const textarea = screen.getByDisplayValue(DEFAULT_PLEDGE_MESSAGE);
    expect(textarea).toBeInTheDocument();
  });

  it('allows updating the daily cutoff time and pledge message', () => {
    const handleUpdateSettings = vi.fn();

    render(
      <SettingsView
        settings={DEFAULT_SETTINGS}
        onUpdateSettings={handleUpdateSettings}
        onResetSeedData={vi.fn().mockResolvedValue({ added: 0, updated: 0 })}
        onRefreshData={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    const timeInput = screen.getByDisplayValue('21:00');
    fireEvent.change(timeInput, { target: { value: '20:30' } });
    expect(handleUpdateSettings).toHaveBeenCalledWith({ accountabilityCutoffTime: '20:30' });

    const textarea = screen.getByDisplayValue(DEFAULT_PLEDGE_MESSAGE);
    fireEvent.change(textarea, { target: { value: 'Custom pledge message' } });
    expect(handleUpdateSettings).toHaveBeenCalledWith({ accountabilityPledgeMessage: 'Custom pledge message' });
  });

  it('resets pledge message to default when "Reset Default" is clicked', () => {
    const handleUpdateSettings = vi.fn();

    render(
      <SettingsView
        settings={{
          ...DEFAULT_SETTINGS,
          accountabilityPledgeMessage: 'Some altered text',
        }}
        onUpdateSettings={handleUpdateSettings}
        onResetSeedData={vi.fn().mockResolvedValue({ added: 0, updated: 0 })}
        onRefreshData={vi.fn()}
        onShowToast={vi.fn()}
      />
    );

    const resetButton = screen.getByRole('button', { name: /reset default/i });
    fireEvent.click(resetButton);
    expect(handleUpdateSettings).toHaveBeenCalledWith({ accountabilityPledgeMessage: DEFAULT_PLEDGE_MESSAGE });
  });
});
