import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <SignUp
      forceRedirectUrl="/setup"
      signInUrl="/sign-in"
      appearance={{
        elements: {
          card: 'shadow-none border border-[var(--color-border)]',
        },
      }}
    />
  );
}
