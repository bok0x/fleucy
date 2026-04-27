import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <SignIn
      forceRedirectUrl="/lock"
      signUpUrl="/sign-up"
      appearance={{
        elements: {
          card: 'shadow-none border border-[var(--color-border)]',
        },
      }}
    />
  );
}
