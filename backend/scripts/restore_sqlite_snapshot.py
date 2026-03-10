"""
Restore the backend SQLite database from a SQL snapshot.

Run from the backend/ directory:
    ./.venv/bin/python scripts/restore_sqlite_snapshot.py --replace
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
import tempfile
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = BACKEND_DIR / "sparring.db"
DEFAULT_INPUT_PATH = BACKEND_DIR / "snapshots" / "sparring.sql"
TABLES = ("sessions", "session_scores", "sparring_profiles", "scenarios")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="SQLite database path")
    parser.add_argument("--in", dest="input_path", type=Path, default=DEFAULT_INPUT_PATH, help="Input SQL snapshot path")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace an existing database file. Without this flag, the restore aborts if the target exists.",
    )
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
    input_path = args.input_path.resolve()

    if not input_path.exists():
        print(f"Snapshot not found: {input_path}", file=sys.stderr)
        return 1

    if db_path.exists() and not args.replace:
        print(f"Database already exists: {db_path}", file=sys.stderr)
        print("Re-run with --replace to overwrite it.", file=sys.stderr)
        return 1

    db_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(prefix="sparring-restore-", suffix=".db", delete=False) as tmp_file:
        temp_db_path = Path(tmp_file.name)

    try:
        conn = sqlite3.connect(temp_db_path)
        try:
            conn.executescript(input_path.read_text(encoding="utf-8"))
            conn.commit()
            counts = table_counts(conn)
        finally:
            conn.close()

        os.replace(temp_db_path, db_path)
    except Exception:
        if temp_db_path.exists():
            temp_db_path.unlink()
        raise

    print(f"Restored database: {db_path}")
    for table in TABLES:
        print(f"{table}: {counts[table]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
