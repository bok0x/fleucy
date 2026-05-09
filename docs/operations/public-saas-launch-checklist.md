# Public SaaS Launch Checklist

## Legal and Trust
- [ ] `/privacy` page published and linked
- [ ] `/terms` page published and linked
- [ ] `/support` page published and linked

## Data Rights
- [ ] Full account export works end-to-end
- [ ] Self-serve account data deletion works end-to-end
- [ ] Data deletion confirmation is explicit and irreversible

## Security
- [ ] User-facing writes use RLS-aware clients where possible
- [ ] Validation enforced for money/date/contact fields
- [ ] PIN/auth security events are logged

## Reliability
- [ ] Error boundaries render recoverable UI
- [ ] Query failures have retry states on core pages
- [ ] Incident runbook is documented and accessible

## Go/No-Go
- [ ] Typecheck, build, and tests pass
- [ ] Manual smoke test passes for sign-in, setup, lock, transactions, debts, settings
