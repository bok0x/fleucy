# Fleucy Incident Runbook

## Severity Levels
- `SEV-1`: Data leak, cross-tenant access, auth bypass.
- `SEV-2`: Core flows unavailable (login, dashboard, write actions).
- `SEV-3`: Partial degradation (specific feature failure).

## First 15 Minutes
1. Confirm incident scope and affected users.
2. Freeze deployments.
3. Assign incident lead and communication owner.
4. Capture timestamps, error logs, and recent changes.

## Response
1. Mitigate impact (disable feature, rollback, block routes).
2. Validate tenant isolation and data integrity.
3. Communicate status to users through support channel.

## Recovery
1. Verify critical paths: sign-in, lock, dashboard, transactions create.
2. Confirm no data corruption for impacted users.
3. Re-enable affected features gradually.

## Postmortem Checklist
- Root cause documented
- Detection gap documented
- Preventive fix shipped
- Monitoring/alerting updated
