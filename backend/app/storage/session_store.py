"""SQLite-backed session and performance memory using SQLAlchemy."""
from __future__ import annotations

import json
from functools import lru_cache
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True)
    project_id = Column(String, index=True)
    scenario_id = Column(String, index=True)
    transcript_json = Column(Text)
    # JSON-encoded list of objection IDs that were explicitly triggered/completed
    completed_objections_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)


class SessionScore(Base):
    __tablename__ = "session_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    project_id = Column(String, index=True)
    overall_score = Column(Integer)
    objection_handling = Column(Integer)
    communication_clarity = Column(Integer)
    relevance = Column(Integer)
    groundedness = Column(Integer)
    strengths_json = Column(Text)
    weaknesses_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class SparringProfile(Base):
    __tablename__ = "sparring_profiles"

    project_id = Column(String, primary_key=True)
    current_level = Column(String, default="intermediate")
    priority_weaknesses_json = Column(Text, default="[]")
    sessions_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id = Column(String, primary_key=True)
    scenario_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, index=True, nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String)
    file_size = Column(Integer)
    qdrant_doc_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


@lru_cache
def _engine() -> Engine:
    settings = get_settings()
    is_sqlite = settings.database_url.startswith("sqlite")
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False} if is_sqlite else {},
    )

    if is_sqlite:
        @event.listens_for(engine, "connect")
        def _set_sqlite_pragmas(dbapi_connection, connection_record) -> None:
            cursor = dbapi_connection.cursor()
            # Keep writes in the main .db file to avoid missing WAL sidecar data in Git sync.
            cursor.execute("PRAGMA journal_mode=DELETE")
            cursor.close()

    return engine


def _table_columns(conn, table_name: str) -> set[str]:
    rows = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    return {row[1] for row in rows}


SEED_SESSION_STRENGTHS = {
    "seed-session-sw-001": [
        "Showed willingness to escalate to the technical team — a good instinct",
        "Maintained a professional, polite tone throughout the conversation",
        "Attempted to close with a next-step (demo request)",
    ],
    "seed-session-sw-002": [
        "Strong opening with a concrete ROI figure (40% handling time / 22-pt CSAT) — immediately established credibility",
        "Excellent handling of integration risk: pre-built Sabre connector, middleware layer, parallel pilot — structured and reassuring",
        "Union / headcount objection addressed with nuance and a credible productivity argument",
        "Solid ROI business case with real numbers that the CFO can validate",
    ],
}

MIN_EVALUATION_TOTAL_TURNS = 4
MIN_EVALUATION_SELLER_TURNS = 2


def _decode_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []

    if not isinstance(data, list):
        return []

    return [str(item) for item in data if isinstance(item, str)]


def _normalize_transcript(transcript_json: str | None) -> list[dict]:
    if not transcript_json:
        return []

    try:
        data = json.loads(transcript_json)
    except json.JSONDecodeError:
        return []

    return data if isinstance(data, list) else []


def _build_evaluation_status(transcript: list[dict]) -> dict:
    total_turns = 0
    seller_turns = 0

    for turn in transcript:
        if not isinstance(turn, dict):
            continue

        role = str(turn.get("role", "")).strip().lower()
        content = str(turn.get("content", "")).strip()
        if role not in {"buyer", "seller"} or not content:
            continue

        total_turns += 1
        if role == "seller":
            seller_turns += 1

    evaluation_insufficient = (
        seller_turns < MIN_EVALUATION_SELLER_TURNS
        or total_turns < MIN_EVALUATION_TOTAL_TURNS
    )
    evaluation_notice = None
    if evaluation_insufficient:
        evaluation_notice = (
            "Insufficient data to evaluate reliably. "
            f"This session has {seller_turns} seller turn"
            f"{'' if seller_turns == 1 else 's'} and {total_turns} total turn"
            f"{'' if total_turns == 1 else 's'}. "
            f"Continue the conversation for at least {MIN_EVALUATION_SELLER_TURNS} seller turns "
            f"and {MIN_EVALUATION_TOTAL_TURNS} total turns."
        )

    return {
        "evaluation_insufficient": evaluation_insufficient,
        "evaluation_notice": evaluation_notice,
    }


def _ensure_project_id_columns(engine: Engine) -> None:
    with engine.begin() as conn:
        session_columns = _table_columns(conn, "sessions")
        if "project_id" not in session_columns and "user_id" in session_columns:
            conn.execute(text("ALTER TABLE sessions RENAME COLUMN user_id TO project_id"))
            session_columns = _table_columns(conn, "sessions")
        if "project_id" not in session_columns:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN project_id VARCHAR"))
            session_columns = _table_columns(conn, "sessions")
        if "completed_objections_json" not in session_columns:
            conn.execute(text("ALTER TABLE sessions ADD COLUMN completed_objections_json TEXT DEFAULT '[]'"))

        score_columns = _table_columns(conn, "session_scores")
        if "project_id" not in score_columns and "user_id" in score_columns:
            conn.execute(text("ALTER TABLE session_scores RENAME COLUMN user_id TO project_id"))
            score_columns = _table_columns(conn, "session_scores")
        if "project_id" not in score_columns:
            conn.execute(text("ALTER TABLE session_scores ADD COLUMN project_id VARCHAR"))
            score_columns = _table_columns(conn, "session_scores")
        if "strengths_json" not in score_columns:
            conn.execute(text("ALTER TABLE session_scores ADD COLUMN strengths_json TEXT DEFAULT '[]'"))
            score_columns = _table_columns(conn, "session_scores")
        if "relevance" not in score_columns:
            conn.execute(text("ALTER TABLE session_scores ADD COLUMN relevance INTEGER"))
            score_columns = _table_columns(conn, "session_scores")
        if "groundedness" not in score_columns:
            conn.execute(text("ALTER TABLE session_scores ADD COLUMN groundedness INTEGER"))
            score_columns = _table_columns(conn, "session_scores")

        profile_columns = _table_columns(conn, "sparring_profiles")
        if "project_id" not in profile_columns and "user_id" in profile_columns:
            conn.execute(text("ALTER TABLE sparring_profiles RENAME COLUMN user_id TO project_id"))
            profile_columns = _table_columns(conn, "sparring_profiles")
        if "project_id" not in profile_columns:
            conn.execute(text("ALTER TABLE sparring_profiles ADD COLUMN project_id VARCHAR"))
            profile_columns = _table_columns(conn, "sparring_profiles")

        conn.execute(
            text(
                """
                UPDATE sparring_profiles
                SET project_id = COALESCE(
                    (
                        SELECT NULLIF(s.scenario_id, '')
                        FROM sessions s
                        WHERE s.project_id = sparring_profiles.project_id
                        ORDER BY s.created_at DESC
                        LIMIT 1
                    ),
                    NULLIF(project_id, '')
                )
                WHERE project_id IS NULL OR project_id = '' OR project_id NOT LIKE 'scenario_%' AND project_id NOT LIKE 'demo-%'
                """
            )
        )

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_project_id ON sessions(project_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_scenario_id ON sessions(scenario_id)"))

        conn.execute(
            text(
                """
                UPDATE sessions
                SET project_id = COALESCE(NULLIF(scenario_id, ''), NULLIF(project_id, ''))
                WHERE scenario_id IS NOT NULL AND scenario_id != ''
                """
            )
        )

        conn.execute(
            text(
                """
                UPDATE session_scores
                SET project_id = COALESCE(
                    NULLIF((SELECT s.project_id FROM sessions s WHERE s.id = session_scores.session_id), ''),
                    NULLIF((SELECT s.scenario_id FROM sessions s WHERE s.id = session_scores.session_id), ''),
                    NULLIF(project_id, '')
                )
                WHERE project_id IS NULL OR project_id = '' OR project_id = 'demo'
                """
            )
        )
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_session_scores_project_id ON session_scores(project_id)"))
        conn.execute(
            text(
                """
                UPDATE session_scores
                SET strengths_json = '[]'
                WHERE strengths_json IS NULL OR strengths_json = ''
                """
            )
        )
        for session_id, strengths in SEED_SESSION_STRENGTHS.items():
            conn.execute(
                text(
                    """
                    UPDATE session_scores
                    SET strengths_json = :strengths_json
                    WHERE session_id = :session_id
                      AND (strengths_json IS NULL OR strengths_json = '' OR strengths_json = '[]')
                    """
                ),
                {
                    "session_id": session_id,
                    "strengths_json": json.dumps(strengths),
                },
            )

        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ux_sparring_profiles_project_id
                ON sparring_profiles(project_id)
                """
            )
        )

        session_columns = _table_columns(conn, "sessions")
        if "user_id" in session_columns and "project_id" in session_columns:
            conn.execute(
                text(
                    """
                    CREATE TABLE sessions__new (
                        id VARCHAR PRIMARY KEY,
                        project_id VARCHAR,
                        scenario_id VARCHAR,
                        transcript_json TEXT,
                        created_at DATETIME
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO sessions__new (id, project_id, scenario_id, transcript_json, created_at)
                    SELECT
                        id,
                        COALESCE(NULLIF(project_id, ''), NULLIF(scenario_id, ''), NULLIF(user_id, '')),
                        scenario_id,
                        transcript_json,
                        created_at
                    FROM sessions
                    """
                )
            )
            conn.execute(text("DROP TABLE sessions"))
            conn.execute(text("ALTER TABLE sessions__new RENAME TO sessions"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_project_id ON sessions(project_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_sessions_scenario_id ON sessions(scenario_id)"))

        score_columns = _table_columns(conn, "session_scores")
        if "user_id" in score_columns and "project_id" in score_columns:
            conn.execute(
                text(
                    """
                    CREATE TABLE session_scores__new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id VARCHAR,
                        project_id VARCHAR,
                        overall_score INTEGER,
                        objection_handling INTEGER,
                        communication_clarity INTEGER,
                        relevance INTEGER,
                        groundedness INTEGER,
                        strengths_json TEXT,
                        weaknesses_json TEXT,
                        created_at DATETIME
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO session_scores__new (
                        id,
                        session_id,
                        project_id,
                        overall_score,
                        objection_handling,
                        communication_clarity,
                        relevance,
                        groundedness,
                        strengths_json,
                        weaknesses_json,
                        created_at
                    )
                    SELECT
                        id,
                        session_id,
                        COALESCE(
                            NULLIF(project_id, ''),
                            NULLIF((SELECT s.project_id FROM sessions s WHERE s.id = session_scores.session_id), ''),
                            NULLIF(user_id, '')
                        ),
                        overall_score,
                        objection_handling,
                        communication_clarity,
                        NULL,
                        NULL,
                        COALESCE(strengths_json, '[]'),
                        weaknesses_json,
                        created_at
                    FROM session_scores
                    """
                )
            )
            conn.execute(text("DROP TABLE session_scores"))
            conn.execute(text("ALTER TABLE session_scores__new RENAME TO session_scores"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_session_scores_project_id ON session_scores(project_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_session_scores_session_id ON session_scores(session_id)"))

        profile_columns = _table_columns(conn, "sparring_profiles")
        if "user_id" in profile_columns and "project_id" in profile_columns:
            conn.execute(
                text(
                    """
                    CREATE TABLE sparring_profiles__new (
                        project_id VARCHAR PRIMARY KEY,
                        current_level VARCHAR,
                        priority_weaknesses_json TEXT,
                        sessions_count INTEGER,
                        updated_at DATETIME
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT OR REPLACE INTO sparring_profiles__new (
                        project_id,
                        current_level,
                        priority_weaknesses_json,
                        sessions_count,
                        updated_at
                    )
                    SELECT
                        COALESCE(NULLIF(project_id, ''), NULLIF(user_id, '')),
                        current_level,
                        priority_weaknesses_json,
                        sessions_count,
                        updated_at
                    FROM sparring_profiles
                    WHERE COALESCE(NULLIF(project_id, ''), NULLIF(user_id, '')) IS NOT NULL
                    """
                )
            )
            conn.execute(text("DROP TABLE sparring_profiles"))
            conn.execute(text("ALTER TABLE sparring_profiles__new RENAME TO sparring_profiles"))


def init_db() -> None:
    engine = _engine()
    Base.metadata.create_all(bind=engine)
    _ensure_project_id_columns(engine)


def _make_session():
    return sessionmaker(autocommit=False, autoflush=False, bind=_engine())()


def save_session(
    session_id: str,
    project_id: str,
    scenario_id: str,
    transcript: list[dict],
    completed_objections: list[str] | None = None,
) -> None:
    db = _make_session()
    try:
        ids = list(completed_objections) if completed_objections else []
        record = Session(
            id=session_id,
            project_id=project_id,
            scenario_id=scenario_id,
            transcript_json=json.dumps(transcript),
            completed_objections_json=json.dumps(sorted(ids)),
        )
        db.merge(record)
        db.commit()
    finally:
        db.close()


def save_score(session_id: str, project_id: str, score_data: dict) -> None:
    db = _make_session()
    try:
        breakdown = score_data.get("score_breakdown") or {}
        relevance = score_data.get("relevance")
        if relevance is None and breakdown.get("relevance"):
            relevance = int(breakdown["relevance"]) * 10
        groundedness = score_data.get("groundedness")
        if groundedness is None and breakdown.get("groundedness"):
            groundedness = int(breakdown["groundedness"]) * 10

        record = SessionScore(
            session_id=session_id,
            project_id=project_id,
            overall_score=score_data.get("overall_score", 0),
            objection_handling=score_data.get("objection_handling", 0),
            communication_clarity=score_data.get("communication_clarity", 0),
            relevance=relevance,
            groundedness=groundedness,
            strengths_json=json.dumps(score_data.get("strengths", [])),
            weaknesses_json=json.dumps(score_data.get("weaknesses", [])),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()


def get_project_profile(project_id: str) -> dict:
    db = _make_session()
    try:
        profile = db.query(SparringProfile).filter_by(project_id=project_id).first()
        if not profile:
            return {
                "project_id": project_id,
                "current_level": "intermediate",
                "priority_weaknesses": [],
                "sessions_count": 0,
            }
        return {
            "project_id": profile.project_id,
            "current_level": profile.current_level,
            "priority_weaknesses": json.loads(profile.priority_weaknesses_json),
            "sessions_count": profile.sessions_count,
        }
    finally:
        db.close()


def _extract_scenario_name(scenario_json: str | None) -> str | None:
    if not scenario_json:
        return None

    try:
        data = json.loads(scenario_json)
    except json.JSONDecodeError:
        return None

    client_profile = data.get("client_profile")
    if isinstance(client_profile, dict):
        name = client_profile.get("name")
        if isinstance(name, str) and name.strip():
            return name.strip()

    return None


def get_all_sessions(project_id: str | None = None) -> list[dict]:
    """Return sessions, optionally filtered to a single project, newest first."""
    db = _make_session()
    try:
        query = db.query(Session)
        if project_id:
            query = query.filter_by(project_id=project_id)

        sessions = query.order_by(Session.created_at.desc()).all()

        scenario_names = {
            scenario.scenario_id: _extract_scenario_name(scenario.scenario_json)
            for scenario in db.query(Scenario).all()
        }

        results = []
        for session in sessions:
            transcript = _normalize_transcript(session.transcript_json)
            evaluation_status = _build_evaluation_status(transcript)
            try:
                completed_objections: list[str] = json.loads(session.completed_objections_json or "[]")
            except json.JSONDecodeError:
                completed_objections = []
            score = (
                db.query(SessionScore)
                .filter_by(session_id=session.id)
                .order_by(SessionScore.created_at.desc())
                .first()
            )
            results.append(
                {
                    "id": session.id,
                    "project_id": session.project_id,
                        "scenario_id": session.scenario_id,
                    "scenario_name": scenario_names.get(session.scenario_id),
                    "created_at": session.created_at.isoformat() if session.created_at else None,
                    **evaluation_status,
                    "overall_score": score.overall_score if score else None,
                    "objection_handling": score.objection_handling if score else None,
                    "communication_clarity": score.communication_clarity if score else None,
                    "relevance": score.relevance if score else None,
                    "groundedness": score.groundedness if score else None,
                    "strengths": _decode_json_list(score.strengths_json) if score else [],
                    "weaknesses": _decode_json_list(score.weaknesses_json) if score else [],
                    "completed_objections": completed_objections,
                }
            )
        return results
    finally:
        db.close()


def get_session_detail(session_id: str) -> dict | None:
    """Return a single session with its transcript and score."""
    db = _make_session()
    try:
        session = db.query(Session).filter_by(id=session_id).first()
        if not session:
            return None

        transcript = _normalize_transcript(session.transcript_json)
        evaluation_status = _build_evaluation_status(transcript)
        try:
            completed_objections: list[str] = json.loads(session.completed_objections_json or "[]")
        except json.JSONDecodeError:
            completed_objections = []
        score = (
            db.query(SessionScore)
            .filter_by(session_id=session_id)
            .order_by(SessionScore.created_at.desc())
            .first()
        )
        scenario = db.query(Scenario).filter_by(scenario_id=session.scenario_id).first()
        return {
            "id": session.id,
            "project_id": session.project_id,
            "scenario_id": session.scenario_id,
            "scenario_name": _extract_scenario_name(scenario.scenario_json) if scenario else None,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "transcript": transcript,
            **evaluation_status,
            "overall_score": score.overall_score if score else None,
            "objection_handling": score.objection_handling if score else None,
            "communication_clarity": score.communication_clarity if score else None,
            "relevance": score.relevance if score else None,
            "groundedness": score.groundedness if score else None,
            "strengths": _decode_json_list(score.strengths_json) if score else [],
            "weaknesses": _decode_json_list(score.weaknesses_json) if score else [],
            "completed_objections": completed_objections,
        }
    finally:
        db.close()


def update_project_profile(project_id: str, score_data: dict) -> dict:
    """Escalate difficulty and track weaknesses after each session."""
    db = _make_session()
    try:
        profile = db.query(SparringProfile).filter_by(project_id=project_id).first()
        if not profile:
            profile = SparringProfile(project_id=project_id)
            db.add(profile)

        overall = score_data.get("overall_score", 50)
        level_map = ["beginner", "intermediate", "advanced", "adversarial"]
        current_idx = level_map.index(profile.current_level) if profile.current_level in level_map else 1
        if overall >= 75 and current_idx < len(level_map) - 1:
            profile.current_level = level_map[current_idx + 1]
        elif overall < 50 and current_idx > 0:
            profile.current_level = level_map[current_idx - 1]

        profile.priority_weaknesses_json = json.dumps(score_data.get("weaknesses", [])[:3])
        profile.sessions_count = (profile.sessions_count or 0) + 1
        profile.updated_at = datetime.utcnow()
        db.commit()

        return get_project_profile(project_id)
    finally:
        db.close()


def save_scenario(scenario_id: str, scenario_data: dict) -> None:
    """Persist a scenario to the database."""
    db = _make_session()
    try:
        record = Scenario(
            scenario_id=scenario_id,
            scenario_json=json.dumps(scenario_data),
        )
        db.merge(record)
        db.commit()
    finally:
        db.close()


def get_scenario(scenario_id: str) -> dict | None:
    """Retrieve a scenario from the database."""
    db = _make_session()
    try:
        scenario = db.query(Scenario).filter_by(scenario_id=scenario_id).first()
        if not scenario:
            return None
        return json.loads(scenario.scenario_json)
    finally:
        db.close()


def get_db_diagnostics() -> dict:
    """Return active DB URL/path and key table counts for debugging."""
    engine = _engine()
    diagnostics = {
        "database_url": str(engine.url),
        "database_path": engine.url.database if engine.url.drivername.startswith("sqlite") else None,
        "counts": {},
    }

    with engine.connect() as conn:
        for table in ("sessions", "session_scores", "sparring_profiles", "scenarios", "project_documents"):
            try:
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar_one()
            except Exception as exc:
                diagnostics["counts"][table] = f"error: {exc}"
            else:
                diagnostics["counts"][table] = count

    return diagnostics


def get_global_performance(project_id: str) -> dict | None:
    """
    Aggregate performance across all scored sessions for a project.

    Only sessions that have a persisted score are included, which naturally
    discards very short or unevaluated sessions.
    """
    db = _make_session()
    try:
        scores = (
            db.query(SessionScore)
            .filter_by(project_id=project_id)
            .order_by(SessionScore.created_at.asc())
            .all()
        )
        if not scores:
            return None

        count = 0
        overall_sum = 0
        objection_sum = 0
        clarity_sum = 0
        relevance_sum = 0
        groundedness_sum = 0
        strengths: list[str] = []
        weaknesses: list[str] = []

        for score in scores:
            if score.overall_score is None:
                continue
            count += 1
            overall_sum += score.overall_score or 0
            objection_sum += score.objection_handling or 0
            clarity_sum += score.communication_clarity or 0
            relevance_sum += score.relevance or 0
            groundedness_sum += score.groundedness or 0
            strengths.extend(_decode_json_list(score.strengths_json))
            weaknesses.extend(_decode_json_list(score.weaknesses_json))

        if count == 0:
            return None

        strengths = strengths[-10:]
        weaknesses = weaknesses[-10:]

        return {
            "sessions_count": count,
            "overall_score": overall_sum / count,
            "objection_handling": objection_sum / count,
            "communication_clarity": clarity_sum / count,
            "relevance": relevance_sum / count,
            "groundedness": groundedness_sum / count,
            "strengths": strengths,
            "weaknesses": weaknesses,
        }
    finally:
        db.close()


def delete_session(session_id: str) -> bool:
    """Delete a session and its scores. Returns True if the session existed."""
    db = _make_session()
    try:
        session = db.query(Session).filter_by(id=session_id).first()
        if not session:
            return False
        db.query(SessionScore).filter_by(session_id=session_id).delete()
        db.delete(session)
        db.commit()
        return True
    finally:
        db.close()


def save_project_documents(project_id: str, docs: list[dict]) -> list[dict]:
    """
    Persist uploaded document metadata for a project.

    Each item in `docs` should contain:
      - filename (str)
      - file_type (str | None)
      - file_size (int | None)
      - qdrant_doc_id (str | None)
    """
    db = _make_session()
    created: list[dict] = []
    try:
        for doc in docs:
            record = ProjectDocument(
                project_id=project_id,
                filename=doc["filename"],
                file_type=doc.get("file_type"),
                file_size=doc.get("file_size"),
                qdrant_doc_id=doc.get("qdrant_doc_id"),
            )
            db.add(record)
            db.flush()
            created.append(
                {
                    "id": record.id,
                    "project_id": record.project_id,
                    "filename": record.filename,
                    "file_type": record.file_type,
                    "file_size": record.file_size,
                    "qdrant_doc_id": record.qdrant_doc_id,
                    "created_at": record.created_at.isoformat() if record.created_at else None,
                }
            )
        db.commit()
        return created
    finally:
        db.close()
