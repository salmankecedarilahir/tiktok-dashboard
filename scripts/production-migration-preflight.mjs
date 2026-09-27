// Read-only release checks. This file never resolves or applies migrations.
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const COST = "20260923153500_add_contribution_production_costs";
export const LINK = "20260924120000_link_contribution_plans_to_campaigns";
const INITIAL = [
  "20260514094151_init", "20260514143309_add_campaign_tables",
  "20260515210016_add_briefs_table", "20260519172505_add_users_and_roles",
  "20260520141510_add_inhouse_models", "20260915150647_add_contribution_plan_models",
];
export const COUNTS = Object.freeze({
  users: 4, briefs: 5, campaigns: 6, campaign_videos: 11, channel_config: 1,
  inhouse_weekly_reports: 2, inhouse_videos: 6, contribution_plans: 3,
  contribution_plan_members: 11, contribution_tasks: 39, contribution_production_costs: 3,
  daily_metrics: 349, scrape_jobs: 133, video_recommendations: 8,
  video_snapshots: 2635, videos: 2585,
});

class GateError extends Error {}

function requireGate(condition, message) {
  if (!condition) throw new GateError(message);
}

export function verifyIdentity(environment) {
  requireGate(!environment.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK, "Advisory-lock bypass is forbidden");
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    let url;
    try { url = new URL(environment[name]); } catch { throw new GateError(`${name}: missing/invalid URL (value suppressed)`); }
    const ref = "qwsjbmaaexmzximstzqz";
    const preview = "vacjzdfggjsssxerklbg";
    let decoded;
    try { decoded = decodeURIComponent(url.href); } catch { throw new GateError(`${name}: invalid encoding`); }
    const pooled = /^aws-\d+-ap-southeast-1\.pooler\.supabase\.com$/.test(url.hostname)
      && decodeURIComponent(url.username) === `postgres.${ref}`;
    const direct = url.hostname === `db.${ref}.supabase.co`
      && decodeURIComponent(url.username) === "postgres";
    requireGate(!decoded.includes(preview) && (pooled || direct), `${name}: Production identity failed`);
    requireGate(["postgres:", "postgresql:"].includes(url.protocol) && url.password,
      `${name}: PostgreSQL credential configuration invalid`);
    requireGate((url.port || "5432") === "5432", `${name}: only direct/session port 5432 is allowed`);
    requireGate(url.pathname === "/postgres", `${name}: unexpected database`);
    requireGate(["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode")),
      `${name}: TLS is required`);
    requireGate(!url.searchParams.has("pgbouncer"), `${name}: transaction-pooling configuration forbidden`);
    requireGate(!url.searchParams.has("options") && !url.searchParams.has("sslaccept"),
      `${name}: unreviewed connection options forbidden`);
    requireGate(!url.searchParams.has("schema") || url.searchParams.get("schema") === "public",
      `${name}: unexpected schema`);
    const allowed = new Set(["sslmode", "schema", "connection_limit", "pool_timeout",
      "connect_timeout", "socket_timeout"]);
    const keys = [...url.searchParams.keys()];
    requireGate(keys.every(key => allowed.has(key)) && new Set(keys).size === keys.length,
      `${name}: unknown or duplicate connection parameters`);
  }
}

function migrationSql(name) {
  return readFileSync(join("prisma", "migrations", name, "migration.sql"), "utf8");
}

export function verifyRepository() {
  const names = readdirSync("prisma/migrations", { withFileTypes: true })
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  requireGate(JSON.stringify(names) === JSON.stringify([...INITIAL, COST, LINK]), "Unexpected repository migration inventory");
  const compact = sql => sql.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim();
  const linkSql = 'ALTER TABLE "contribution_plans" ADD COLUMN "campaign_id" UUID; '
    + 'CREATE UNIQUE INDEX "contribution_plans_campaign_id_key" ON "contribution_plans"("campaign_id"); '
    + 'ALTER TABLE "contribution_plans" ADD CONSTRAINT "contribution_plans_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;';
  requireGate(compact(migrationSql(LINK)) === linkSql, "Campaign-link SQL differs from reviewed additive operations");
}

export function verifyLedger(rows, stage) {
  const expected = stage === "before" ? INITIAL : stage === "resolved" ? [...INITIAL, COST] : [...INITIAL, COST, LINK];
  requireGate(rows.length === expected.length, `Ledger count differs: expected ${expected.length}, actual ${rows.length}`);
  requireGate(JSON.stringify(rows.map(row => row.migration_name).sort()) === JSON.stringify([...expected].sort()),
    "Unexpected, duplicate or missing migration record");
  for (const row of rows) {
    requireGate(row.finished_at && !row.rolled_back_at, `Incomplete/rolled-back migration: ${row.migration_name}`);
    const stepCount = Number(row.applied_steps_count);
    requireGate(row.migration_name === COST && stage !== "before" ? [0, 1].includes(stepCount) : stepCount === 1,
      `Unexpected step count: ${row.migration_name}`);
    const sql = migrationSql(row.migration_name);
    const lf = sql.replace(/\r\n/g, "\n");
    const hashes = [sql, lf, lf.replace(/\n/g, "\r\n")]
      .map(value => createHash("sha256").update(value).digest("hex"));
    requireGate(hashes.includes(row.checksum), `Migration checksum differs: ${row.migration_name}`);
  }
}

export function verifyCounts(counts, baseline = COUNTS) {
  requireGate(JSON.stringify(Object.keys(counts).sort()) === JSON.stringify(Object.keys(COUNTS).sort()),
    "Unexpected count inventory");
  for (const [table, expected] of Object.entries(COUNTS)) {
    requireGate(counts[table] === expected && counts[table] === baseline[table],
      `Count mismatch: ${table}; expected/before=${expected}/${baseline[table]}, actual=${counts[table]}`);
  }
}

const COLUMN_SPEC = [
  ["id", "uuid", false, null], ["plan_id", "uuid", false, null], ["notes", "text", true, null],
  ["total_amount", "bigint", false, "0"], ["splits", "jsonb", false, "'[]'::jsonb"],
  ["created_at", "timestamp(3) without time zone", false, "CURRENT_TIMESTAMP"],
  ["updated_at", "timestamp(3) without time zone", false, null],
];

export function verifyCost(table) {
  requireGate(table.kind === "r" && !table.rls && !table.force_rls, "Unexpected cost-table kind/RLS");
  requireGate(table.columns.length === COLUMN_SPEC.length, "Unexpected cost-table columns");
  for (const [index, [name, type, nullable, defaultValue]] of COLUMN_SPEC.entries()) {
    const column = table.columns[index];
    requireGate(column.name === name && column.type === type && column.nullable === nullable
      && column.default_value === defaultValue && !column.generated && !column.identity,
    `Cost column differs: ${name}`);
  }
  requireGate(table.constraints.length === 2 && table.indexes.length === 2, "Unexpected cost constraints/indexes");
  verifyConstraint(table.constraints, "contribution_production_costs_pkey", "p", "PRIMARY KEY (id)");
  verifyConstraint(table.constraints, "contribution_production_costs_plan_id_fkey", "f",
    "FOREIGN KEY (plan_id) REFERENCES contribution_plans(id) ON UPDATE CASCADE ON DELETE CASCADE",
    "contribution_plans", "c", "c");
  verifyIndex(table.indexes, "contribution_production_costs_pkey", "id", true, true);
  verifyIndex(table.indexes, "contribution_production_costs_plan_id_idx", "plan_id", false, false);
}

function verifyConstraint(rows, name, type, definition, parent, onDelete, onUpdate) {
  const row = rows.find(item => item.name === name);
  requireGate(row && row.type === type && row.definition === definition && row.validated
    && !row.deferrable && !row.deferred, `Constraint differs: ${name}`);
  if (parent) requireGate(row.parent_schema === "public" && row.parent_table === parent
    && row.on_delete === onDelete && row.on_update === onUpdate && row.match_type === "s",
  `Foreign-key target/actions differ: ${name}`);
}

function verifyIndex(rows, name, column, unique, primary) {
  const row = rows.find(item => item.name === name);
  const table = name.startsWith("contribution_production_costs") ? "contribution_production_costs" : "contribution_plans";
  const expected = `CREATE ${unique ? "UNIQUE " : ""}INDEX ${name} ON public.${table} USING btree (${column})`;
  requireGate(row && row.definition === expected && row.unique === unique && row.primary === primary
    && row.valid && row.ready && row.method === "btree" && row.key_columns === 1
    && row.total_columns === 1 && !row.predicate && !row.expressions && !row.nulls_not_distinct,
  `Index differs: ${name}`);
}

export function verifyLink(table, campaigns, applied) {
  const column = table.columns.find(row => row.name === "campaign_id");
  const index = table.indexes.find(row => row.name === "contribution_plans_campaign_id_key");
  const fk = table.constraints.find(row => row.name === "contribution_plans_campaign_id_fkey");
  const parent = campaigns.columns.find(row => row.name === "id");
  requireGate(parent?.type === "uuid" && !parent.nullable, "Campaign parent ID differs");
  verifyConstraint(campaigns.constraints, "campaigns_pkey", "p", "PRIMARY KEY (id)");
  if (!applied) {
    requireGate(!column && !index && !fk && !table.link_index_name_exists,
      "Campaign link already/partially present or index name conflicts");
  } else {
    requireGate(column?.type === "uuid" && column.nullable && column.default_value === null
      && !column.generated && !column.identity, "Campaign link column differs");
    verifyIndex(table.indexes, "contribution_plans_campaign_id_key", "campaign_id", true, false);
    verifyConstraint(table.constraints, "contribution_plans_campaign_id_fkey", "f",
      "FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON UPDATE CASCADE ON DELETE SET NULL",
      "campaigns", "n", "c");
  }
}

// Only approved catalog queries and COUNT(*) are issued, in a read-only transaction.
async function tableMetadata(tx, table) {
  const [base] = await tx.$queryRawUnsafe(`SELECT c.relkind::text AS kind, c.relrowsecurity AS rls,
    c.relforcerowsecurity AS force_rls FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=$1`, table);
  requireGate(base, `Missing table: ${table}`);
  const columns = await tx.$queryRawUnsafe(`SELECT a.attname::text AS name,
    format_type(a.atttypid,a.atttypmod) AS type, NOT a.attnotnull AS nullable,
    pg_get_expr(d.adbin,d.adrelid) AS default_value, a.attgenerated::text AS generated, a.attidentity::text AS identity
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`, table);
  const constraints = await tx.$queryRawUnsafe(`SELECT con.conname::text AS name, con.contype::text AS type,
    pg_get_constraintdef(con.oid,true) AS definition, con.convalidated AS validated,
    con.condeferrable AS deferrable, con.condeferred AS deferred,
    con.confdeltype::text AS on_delete, con.confupdtype::text AS on_update, con.confmatchtype::text AS match_type,
    pn.nspname::text AS parent_schema, pc.relname::text AS parent_table FROM pg_constraint con
    JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_class pc ON pc.oid=con.confrelid LEFT JOIN pg_namespace pn ON pn.oid=pc.relnamespace
    WHERE n.nspname='public' AND c.relname=$1 ORDER BY con.conname`, table);
  const indexes = await tx.$queryRawUnsafe(`SELECT i.relname::text AS name, pg_get_indexdef(idx.indexrelid) AS definition,
    am.amname::text AS method, idx.indisunique AS unique, idx.indisprimary AS primary, idx.indisvalid AS valid,
    idx.indisready AS ready, idx.indnkeyatts AS key_columns, idx.indnatts AS total_columns,
    idx.indnullsnotdistinct AS nulls_not_distinct, pg_get_expr(idx.indpred,idx.indrelid) AS predicate,
    pg_get_expr(idx.indexprs,idx.indrelid) AS expressions FROM pg_index idx
    JOIN pg_class c ON c.oid=idx.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_class i ON i.oid=idx.indexrelid JOIN pg_am am ON am.oid=i.relam
    WHERE n.nspname='public' AND c.relname=$1 ORDER BY i.relname`, table);
  const [conflict] = await tx.$queryRawUnsafe(`SELECT EXISTS(SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relname='contribution_plans_campaign_id_key') AS present`);
  return { ...base, columns, constraints, indexes, link_index_name_exists: conflict.present };
}

export function verifyStatusOutput(stage, result) {
  const pending = stage === "before" ? [COST, LINK] : stage === "resolved" ? [LINK] : [];
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  requireGate(!result.error && result.status === (pending.length ? 1 : 0),
    "Prisma status failed or returned an unexpected exit code (raw output suppressed)");
  requireGate(!/\bP\d{4}\b|Error:|failed migrations|diverge|modified after/i.test(text),
    "Prisma status reported an error or history conflict (raw output suppressed)");
  const names = text.match(/\b\d{14}_[a-z0-9_]+\b/g) ?? [];
  requireGate(JSON.stringify(names) === JSON.stringify(pending), "Prisma pending migrations differ from allowlist");
  requireGate(pending.length ? /Following migration.*not yet been applied/s.test(text)
    : /Database schema is up to date/.test(text), "Prisma status did not confirm expected state");
  console.log(`PRISMA STATUS: PASS; pending=${pending.join(", ") || "none"}`);
}

export function verifyDeployOutput(result) {
  const text = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const summary = text.match(/The following migration\(s\) have been applied:\s*([\s\S]*?)All migrations have been successfully applied\./);
  const applied = summary?.[1].match(/\b\d{14}_[a-z0-9_]+\b/g) ?? [];
  const attempted = [...text.matchAll(/Applying migration `([^`]+)`/g)].map(match => match[1]);
  requireGate(!result.error && result.status === 0 && applied.length === 1 && applied[0] === LINK
    && attempted.every(name => name === LINK),
  "Deploy failed or reported an unexpected migration; inspect partial state (raw output suppressed)");
}

function verifyStatus(stage) {
  const result = spawnSync("timeout", ["--signal=TERM", "--kill-after=15s", "90s",
    "pnpm", "exec", "prisma", "migrate", "status"], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  verifyStatusOutput(stage, result);
}

async function main() {
  const stage = process.argv[2];
  requireGate(["identity", "before", "resolved", "final"].includes(stage), "Explicit verification stage required");
  verifyIdentity(process.env);
  console.log("PRODUCTION DB IDENTITY: PASS");
  if (stage === "identity") return;
  verifyRepository();
  verifyStatus(stage);
  const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL, log: [] });
  try {
    const snapshot = await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const [mode] = await tx.$queryRawUnsafe("SELECT current_setting('transaction_read_only') AS mode");
      requireGate(mode.mode === "on", "Read-only transaction guard failed");
      const ledger = await tx.$queryRawUnsafe(`SELECT migration_name,checksum,finished_at,
        applied_steps_count,rolled_back_at FROM public._prisma_migrations ORDER BY started_at`);
      const counts = {};
      for (const table of Object.keys(COUNTS)) {
        const [row] = await tx.$queryRawUnsafe(`SELECT count(*)::text AS count FROM public."${table}"`);
        counts[table] = Number(row.count);
      }
      return { ledger, counts, cost: await tableMetadata(tx, "contribution_production_costs"),
        plans: await tableMetadata(tx, "contribution_plans"), campaigns: await tableMetadata(tx, "campaigns") };
    }, { isolationLevel: "RepeatableRead", maxWait: 10000, timeout: 60000 });
    verifyLedger(snapshot.ledger, stage);
    verifyCost(snapshot.cost);
    verifyConstraint(snapshot.plans.constraints, "contribution_plans_pkey", "p", "PRIMARY KEY (id)");
    requireGate(snapshot.plans.columns.some(row => row.name === "id" && row.type === "uuid" && !row.nullable),
      "Contribution Plan parent ID differs");
    verifyLink(snapshot.plans, snapshot.campaigns, stage === "final");
    const baselinePath = join(process.env.RUNNER_TEMP, "production-migration-counts.json");
    const baseline = stage === "before" ? COUNTS : JSON.parse(readFileSync(baselinePath, "utf8"));
    verifyCounts(snapshot.counts, baseline);
    if (stage === "before") writeFileSync(baselinePath, JSON.stringify(snapshot.counts), { mode: 0o600 });
    console.log(`SCHEMA, LEDGER AND COUNTS: PASS (${stage})`);
    for (const [table, count] of Object.entries(snapshot.counts)) console.log(`${table}: ${count}`);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `\n### Database verification: ${stage} — PASS\n\nLedger records: ${snapshot.ledger.length}. Cost rows: ${snapshot.counts.contribution_production_costs}.\n`);
  } finally { await prisma.$disconnect(); }
}

// Importing the pure checks for offline audit never connects to a database.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Never log a Prisma/native error object: it can contain SQL or credentials.
    const safe = error instanceof GateError ? error.message : "Database verification failed; raw diagnostics suppressed";
    console.error(`FAIL: ${safe}`);
    process.exitCode = 1;
  });
}
