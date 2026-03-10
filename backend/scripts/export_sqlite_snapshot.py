"""
Export the backend SQLite database to a deterministic SQL snapshot.

Run from the backend/ directory:
    ./.venv/bin/python scripts/export_sqlite_snapshot.py
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BACKEND_DIR / "sparring.db"
DEFAULT_OUTPUT_PATH = BACKEND_DIR / "snapshots" / "sparring.sql"
TABLES = ("sessions", "session_scores", "sparring_profiles", "scenarios")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="SQLite database path")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUTPUT_PATH, help="Output SQL snapshot path")
    return parser.parse_args()


def table_counts(conn: sqlite3.Connection) -> dict[str, int]:
    counts: dict[str, int] = {}
    cursor = conn.cursor()
    for table in TABLES:
        counts[table] = int(cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])
    return counts


def main() -> int:
    args = parse_args()
    db_path = args.db.resolve()
    out_path = args.out.resolve()

    if not db_path.exists():
        print(f"Database not found: {db_path}", file=sys.stderr)
        return 1

    out_path.parent.mkdir(parents=True, exist_ok=True)

    source = sqlite3.connect(db_path)
    snapshot = sqlite3.connect(":memory:")
    try:
        # Work from a consistent backup so active writes do not corrupt the dump.
        source.backup(snapshot)
        snapshot.execute("PRAGMA foreign_keys=OFF")
        dump_sql = "\n".join(snapshot.iterdump()) + "\n"
        out_path.write_text(dump_sql, encoding="utf-8")
        counts = table_counts(snapshot)
    finally:
        snapshot.close()
        source.close()

    print(f"Wrote snapshot: {out_path}")
    for table in TABLES:
        print(f"{table}: {counts[table]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
