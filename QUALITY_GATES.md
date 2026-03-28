# BIKLabs Agent Runner — Quality Gates (Release Standard)

**Version**: v1.1  
**Date**: 2026-03-28  
**Scope**: `scripts/agent-runner/*`

---

## 1) Non-Negotiable Gates

1. **Security gate**
- Webhook must require signed headers (`X-BIK-Timestamp`, `X-BIK-Event-Id`, `X-BIK-Signature`).
- Signature must bind **timestamp + eventId + body**.
- Secrets are never accepted in JSON body.
- Admin/session auth must use bearer token and constant-time comparison.

2. **Durability gate**
- Assignment accepted only after durable insert into `agent_jobs`.
- Worker restarts must recover `leased/running` jobs to `queued`.
- Stale leases must be automatically recovered.

3. **Correctness gate**
- Job transitions are conditional (`leased -> running`, `running|leased -> completed`).
- Duplicate active execution for same `run_key` (`agentId:taskId`) is rejected.
- Idempotency by `event_id` is enforced.

4. **Operational gate**
- `/health`, `/stats`, `/jobs`, `/jobs/:id/events` must provide enough information to debug incidents without attaching a debugger.
- Cancel and retry endpoints must be available under admin auth.

5. **Terminal-first gate**
- In `RUNNER_EXECUTION_MODE=terminal`, offline agent must produce `waiting_session`.
- Session heartbeat requeues waiting work when agent comes online.
- Session client must execute in visible TTY and report start/complete explicitly.

---

## 2) API Contract Checks

## `/webhook` (POST)
- Reject missing signature headers (`401`).
- Reject invalid signature (`401`).
- Reject stale timestamp (`401`).
- Reject payload too large (`413`), default cap `64 KiB`.
- Accept valid signed request (`202`).

## `/agent/session/*`
- Must require session auth.
- Must validate `sessionId` and `agentId` format.
- `claim` only enabled in terminal mode.
- `start` requires job in `leased`.
- `complete` requires job in `running|leased`.

---

## 3) Security Checklist

- [ ] `RUNNER_SECRET` set and rotated.
- [ ] `RUNNER_ADMIN_TOKEN` separate from `RUNNER_SECRET` in production.
- [ ] `RUNNER_SKIP_PERMISSIONS=false` in production.
- [ ] Log scrubber policy ensures no MCP token appears in logs.
- [ ] Runtime hosts run with least privilege filesystem/network.

---

## 4) Reliability Checklist

- [ ] Queue depth alarm per agent.
- [ ] Dead-letter alarm (absolute + percentage).
- [ ] p95 start latency alarm.
- [ ] p95 run duration alarm.
- [ ] Retry storm alarm.

---

## 5) SLO Baseline

- **Durable enqueue success**: 99.9%
- **Assignment->running p95**: < 30s (online agents)
- **Dead-letter ratio**: < 2% weekly
- **Control-plane API availability**: 99.9%

---

## 6) Release Go/No-Go

Release is **GO** only if:
- Typecheck passes.
- Security gate + durability gate pass in smoke environment.
- One full terminal-mode flow is validated end-to-end with event timeline.
- CTO signoff on queue backend and token rotation policy.

