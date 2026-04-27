import { vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  clientEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_stub',
    NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-stub',
  },
  serverEnv: () => ({
    CLERK_SECRET_KEY: 'sk_test_stub',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-stub',
    DATABASE_URL: 'postgresql://stub',
    DIRECT_URL: 'postgresql://stub',
    PIN_SESSION_SECRET: 'stub-secret-at-least-32-characters-long',
  }),
}));

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AmountInput } from '@/components/feature/amount-input';

describe('AmountInput', () => {
  it('renders with empty value when zero', () => {
    render(<AmountInput value={0n} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('shows formatted value when non-zero', () => {
    render(<AmountInput value={12345n} onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('123.45');
  });

  it('calls onChange with fen bigint on valid input', () => {
    const onChange = vi.fn();
    render(<AmountInput value={0n} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(5000n);
  });

  it('calls onChange with 0n on empty input', () => {
    const onChange = vi.fn();
    render(<AmountInput value={5000n} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(0n);
  });

  it('ignores invalid input (does not call onChange)', () => {
    const onChange = vi.fn();
    render(<AmountInput value={0n} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
