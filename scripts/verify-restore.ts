/**
 * verify-restore.ts — read-only diff of two Neon databases.
 *
 * Compares row count + a deterministic checksum (MD5 of all rows, ordered by
 * primary key) for each application table. Intended use:
 *
 *   1. Set `DATABASE_URL_A` to the live/source-of-truth Neon connection string.
 *   2. Set `DATABASE_URL_B` to a freshly-restored PITR / snapshot branch.
 *   3. Run `bun run db:verify-restore`.
 *
 * Exit 0 = every table matches on count AND checksum.
 * Exit 1 = at least one mismatch (or a connection / query failure).
 *
 * No writes. No schema changes. No migrations. Pure SELECTs.
 *
 * See docs/runbooks/neon-backup-restore.md for the full procedure.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *   TEMPLATE — populate the `TABLES` array below to match your schema.
 *   See the "Template setup" section at the top of TABLES for guidance.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { neon } from '@neondatabase/serverless';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

type TableSpec = {
	name: string;
	/**
	 * Comma-separated, deterministic column list for the checksum.
	 * MUST include the primary key first so ORDER BY is stable.
	 * Cast every column to text so MD5 input is unambiguous.
	 *
	 * Example for a `users` table with id (uuid), email (text),
	 * display_name (text), role (enum), created_at (timestamptz):
	 *
	 *   checksumExpr:
	 *     "id::text || '|' || email || '|' || display_name || '|' || " +
	 *     "role::text || '|' || created_at::text",
	 *   orderBy: 'id'
	 *
	 * NULLable columns must be wrapped in `COALESCE(col, '')` so a NULL
	 * doesn't poison the string_agg input.
	 */
	checksumExpr: string;
	orderBy: string;
};

/**
 * Template setup:
 *
 *   1. Add one entry per table you want to verify.
 *   2. Include EVERY column in `checksumExpr` (so any drift is caught).
 *   3. Wrap NULLable columns in `COALESCE(col, '')`.
 *   4. `orderBy` is the primary key; the checksum is unstable without it.
 *
 * Leave the array empty until you have at least one table; the script will
 * print a clear message and exit 1 in that case.
 */
const TABLES: TableSpec[] = [
	// {
	// 	name: 'users',
	// 	checksumExpr:
	// 		"id::text || '|' || email || '|' || display_name || '|' || created_at::text",
	// 	orderBy: 'id'
	// }
];

type TableResult = {
	table: string;
	countA: number | null;
	countB: number | null;
	md5A: string | null;
	md5B: string | null;
	error?: string;
};

async function probeTable(
	sql: ReturnType<typeof neon>,
	spec: TableSpec
): Promise<{ count: number; md5: string }> {
	// One round-trip per side: COUNT(*) + the row-aggregate checksum.
	// `string_agg(... ORDER BY <pk>)` makes the input to MD5 deterministic.
	const query = `
		SELECT
			COUNT(*)::bigint AS row_count,
			COALESCE(
				MD5(string_agg(${spec.checksumExpr}, '\n' ORDER BY ${spec.orderBy})),
				'0'
			) AS row_md5
		FROM ${spec.name}
	`;
	const rows = (await sql.query(query)) as Array<{ row_count: string | number; row_md5: string }>;
	const row = rows[0];
	return {
		count: Number(row.row_count),
		md5: String(row.row_md5)
	};
}

function pad(s: string, width: number): string {
	if (s.length >= width) return s;
	return s + ' '.repeat(width - s.length);
}

function truncate(s: string, width: number): string {
	if (s.length <= width) return s;
	return s.slice(0, width - 3) + '...';
}

function renderReport(results: TableResult[]): void {
	const cols = {
		table: 20,
		count: 8,
		md5: 16,
		match: 6
	};

	const header =
		pad('Table', cols.table) +
		pad('A_count', cols.count) +
		pad('B_count', cols.count) +
		pad('A_md5', cols.md5) +
		pad('B_md5', cols.md5) +
		pad('Match', cols.match);
	const rule = '─'.repeat(header.length);

	console.log('');
	console.log(header);
	console.log(rule);

	for (const r of results) {
		if (r.error) {
			console.log(pad(r.table, cols.table) + 'ERROR: ' + r.error);
			continue;
		}
		const countA = r.countA === null ? '?' : String(r.countA);
		const countB = r.countB === null ? '?' : String(r.countB);
		const md5A = r.md5A ? truncate(r.md5A, cols.md5 - 1) : '?';
		const md5B = r.md5B ? truncate(r.md5B, cols.md5 - 1) : '?';
		const matched = r.countA === r.countB && r.md5A === r.md5B && r.md5A !== null;
		const mark = matched ? 'OK' : 'FAIL';
		console.log(
			pad(r.table, cols.table) +
				pad(countA, cols.count) +
				pad(countB, cols.count) +
				pad(md5A, cols.md5) +
				pad(md5B, cols.md5) +
				pad(mark, cols.match)
		);
	}
	console.log('');
}

async function main(): Promise<void> {
	if (TABLES.length === 0) {
		console.error('verify-restore: no tables configured.');
		console.error('');
		console.error('Edit scripts/verify-restore.ts and populate the TABLES array');
		console.error('with one entry per table you want to verify.');
		process.exit(1);
	}

	const urlA = process.env.DATABASE_URL_A;
	const urlB = process.env.DATABASE_URL_B;

	if (!urlA || !urlB) {
		console.error('verify-restore: missing connection string(s).');
		console.error('');
		console.error('  DATABASE_URL_A — source of truth (e.g. live primary)');
		console.error('  DATABASE_URL_B — candidate (e.g. restored PITR branch)');
		console.error('');
		console.error('Pull both from Neon → Branches → your branch → Connection string, then re-run.');
		process.exit(1);
	}

	if (urlA === urlB) {
		console.warn(
			'verify-restore: DATABASE_URL_A and DATABASE_URL_B are identical — ' +
				'this only proves the script works, not that a restore succeeded.'
		);
	}

	const sqlA = neon(urlA);
	const sqlB = neon(urlB);

	const results: TableResult[] = [];
	let anyMismatch = false;

	for (const spec of TABLES) {
		const result: TableResult = {
			table: spec.name,
			countA: null,
			countB: null,
			md5A: null,
			md5B: null
		};

		try {
			const [a, b] = await Promise.all([probeTable(sqlA, spec), probeTable(sqlB, spec)]);
			result.countA = a.count;
			result.countB = b.count;
			result.md5A = a.md5;
			result.md5B = b.md5;
			if (a.count !== b.count || a.md5 !== b.md5) anyMismatch = true;
		} catch (err) {
			result.error = (err as Error).message;
			anyMismatch = true;
		}

		results.push(result);
	}

	renderReport(results);

	if (anyMismatch) {
		console.error('verify-restore: at least one table differs between A and B.');
		process.exit(1);
	}

	console.log(`verify-restore: all ${TABLES.length} table(s) match on row count and checksum.`);
}

main().catch((err) => {
	console.error('verify-restore: failed:', err);
	process.exit(1);
});
