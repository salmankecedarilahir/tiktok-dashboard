# Manual Production database reconciliation

This workflow is for database reconciliation only. Creation/push does not execute it.
It contains no application release, branch changes, Vercel commands, seed or user creation.
Historical origin of the unrecorded cost table is unknown.

## Registration and approval before execution

GitHub requires a `workflow_dispatch` workflow to exist on the default branch before
it can be dispatched. This task adds it only to `feat/contribution-plan`; main is
unchanged. A separately reviewed and authorized workflow-registration change on
the default branch is required. Do not merge the application feature merely to
register the workflow. Dispatch must then select `feat/contribution-plan` at the
reviewed workflow commit; the job rejects main, tags and other branches.

Configure the GitHub `production` environment with required reviewers where your
plan supports them, and allow the reviewed feature branch through its deployment
branch rules. Review all three added files at the exact dispatched commit.
The workflow has read-only repository permissions and serializes Production
migration jobs without cancelling an active run.

Preserve the already verified recovery point independently. The workflow neither
reads an operator Windows path nor creates, restores or uploads a backup. Confirm
the recovery point is current enough before entering `MIGRATE-PRODUCTION` and
checking `recovery_verified`. Neither input substitutes for human approval.

## Encrypted connection secrets

Configure `DATABASE_URL` and `DIRECT_URL` in the `production` environment (preferred)
or encrypted repository secrets. Both must be migration-specific PostgreSQL
connections to Production `qwsjbmaaexmzximstzqz`, database `postgres`, port **5432**,
using `sslmode=require` (or stronger certificate verification). A session pooler
in Singapore or the exact Production direct host is accepted. Both URLs must
identify Production; Preview `vacjzdfggjsssxerklbg` is explicitly rejected.

Do not copy a transaction-pooler 6543 application URL into these migration secrets.
No `pgbouncer`, custom `options`, `sslaccept` override or non-public schema is
accepted. Credentials stay in step process environments: no .env file, command
argument, output or artifact contains them. Installation receives no DB secrets.
Native/Prisma output is captured in memory and only safe gate results are logged.
The existing Prisma package.json configuration deprecation is reported separately.
Prisma advisory locking remains enabled; no bypass or automatic mutation retry.

## Source and toolchain guards

`actions/checkout` checks out the exact dispatch SHA, detached, with full ancestry
and without persisted Git credentials. Baseline application commit
`6967d75fd12dbef5cc4410ed9fedcce47c68e7a7` must be an ancestor. Both the final diff and
intervening commits may change only:

- `.github/workflows/production-db-migration.yml`
- `scripts/production-migration-preflight.mjs` (read-only verification)
- `docs/production-db-migration.md`

Every other source, migration, dependency or configuration change fails before
DB access. No local dirty files are accepted. Review helper/workflow changes before
each dispatch; this allowlist is not a substitute for trusted code review.

There were no existing repository workflows to reuse. Node **24.14.1** and pnpm
**11.1.1** match the operator's validated toolchain; Corepack is pinned to that pnpm
version without modifying package.json. Installation uses `--frozen-lockfile`.
Prisma CLI and Client must both remain **6.19.3**. Official checkout/setup-node
actions are pinned to complete commit SHAs. No dependency upgrades or additional
third-party Actions are introduced; caching is omitted for this infrequent job.

## Ordered gates and mutations

1. Validate manual confirmation, repository, branch and recovery attestation.
2. Verify source integrity and frozen toolchain. Validate/generate Prisma.
3. Prove both connection identities without printing values.
4. Require Prisma status to show exactly the cost and link migrations pending.
5. In a repeatable-read, read-only transaction verify six completed migration
   records, matching checksums (including normal LF/CRLF variants), no failures or
   duplicates, every cost column/default/PK/index/FK and all fixed baseline counts.
6. Recheck these live gates immediately before the only ledger mutation:
   `pnpm exec prisma migrate resolve --applied 20260923153500_add_contribution_production_costs`.
   No SQL insertion into the migration ledger occurs in this workflow/helper.
7. Require status and ledger to show exactly seven applied records with only
   `20260924120000_link_contribution_plans_to_campaigns` pending. A resolved record
   may legitimately have zero applied steps because its SQL was not replayed.
8. Recheck the reviewed three-statement link SQL, absence of campaign_id,
   conflicting names, valid UUID parent keys, cost equivalence and all counts.
9. Run `pnpm exec prisma migrate deploy` once. Verify its output names exactly the
   permitted link migration in Prisma 6.19.3's applied-migration summary. Frozen
   source/inventory and live ledger gates ensure
   no other repository migration is available to apply.
10. Require Prisma status to report up to date and exactly eight complete ledger
    records. Verify the nullable UUID link, normal NULL-distinct unique btree index,
    valid immediate FK with DELETE SET NULL / UPDATE CASCADE, cost table and counts.

The helper only performs status reads, catalog queries, counts and `SET TRANSACTION
READ ONLY`; it never executes schema changes or business-data mutations. Its
baseline-count file in RUNNER_TEMP contains counts only. Nothing is uploaded.

## Required counts before and after

| Table | Rows |
|---|---:|
| users | 4 |
| briefs | 5 |
| campaigns | 6 |
| campaign_videos | 11 |
| channel_config | 1 |
| inhouse_weekly_reports | 2 |
| inhouse_videos | 6 |
| contribution_plans | 3 |
| contribution_plan_members | 11 |
| contribution_tasks | 39 |
| contribution_production_costs | 3 |
| daily_metrics | 349 |
| scrape_jobs | 133 |
| video_recommendations | 8 |
| video_snapshots | 2635 |
| videos | 2585 |

Counts must match both this audited baseline and the run's initial snapshot.
Coordinate a quiet migration window: real user writes or scheduled scrapes can
change counts and correctly fail this strict gate. Do not weaken the gate during
an active run; investigate and approve a refreshed baseline separately if needed.

## Failure/partial completion

Every step uses strict shell failure handling; no safety-critical error is ignored.
Connection, identity, history, schema or count errors stop the job. Native commands
are bounded with process-group timeout handling. Mutation commands are not retried.
External migration operators must also be coordinated; GitHub concurrency covers
only this workflow, while Prisma's normal advisory lock protects its commands.

If resolve succeeds and a subsequent gate/deploy fails, its ledger change remains.
If deployment fails or times out, inspect live ledger/schema for partial completion.
The workflow reports step outcomes and performs no destructive rollback. Never
blindly rerun: the six-record preflight deliberately rejects a partially completed
or already completed run. Reconcile further action through a separately reviewed
operator plan and the preserved recovery point.

Successful DB verification is not an application release. Stop after this workflow;
authenticated Production health, main merge and Vercel release remain separate
controlled tasks.

References: [GitHub manual dispatch](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[Supabase Prisma connections](https://supabase.com/docs/guides/database/prisma).
