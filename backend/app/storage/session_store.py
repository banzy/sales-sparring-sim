"""SQLite-backed session and performance memory using SQLAlchemy."""
from __future__ import annotations
import json
from datetime import datetime
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Float,
    Text,
    DateTime,
)
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import get_settings


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    scenario_id = Column(String)
    transcript_json = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class SessionScore(Base):
    __tablename__ = "session_scores"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, index=True)
    user_id = Column(String, index=True)
    overall_score = Column(Integer)
    objection_handling = Column(Integer)
    communication_clarity = Column(Integer)
    weaknesses_json = Column(Text)  # JSON list of weakness tags
    created_at = Column(DateTime, default=datetime.utcnow)


class SparringProfile(Base):
    __tablename__ = "sparring_profiles"
    user_id = Column(String, primary_key=True)
    current_level = Column(String, default="intermediate")
    priority_weaknesses_json = Column(Text, default="[]")
    sessions_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)


def _engine():
    settings = get_settings()
    return create_engine(settings.database_url, connect_args={"check_same_thread": False})


def init_db() -> None:
    Base.metadata.create_all(bind=_engine())


def _make_session():
    return sessionmaker(autocommit=False, autoflush=False, bind=_engine())()


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def save_session(session_id: str, user_id: str, scenario_id: str, transcript: list[dict]) -> None:
    db = _make_session()
    try:
        record = Session(
            id=session_id,
            user_id=user_id,
            scenario_id=scenario_id,
            transcript_json=json.dumps(transcript),
        )
        db.merge(record)
        db.commit()
    finally:
        db.close()


def save_score(session_id: str, user_id: str, score_data: dict) -> None:
    db = _make_session()
    try:
        record = SessionScore(
            session_id=session_id,
            user_id=user_id,
            overall_score=score_data.get("overall_score", 0),
            objection_handling=score_data.get("objection_handling", 0),
            communication_clarity=score_data.get("communication_clarity", 0),
            weaknesses_json=json.dumps(score_data.get("weaknesses", [])),
        )
        db.add(record)
        db.commit()
    finally:
        db.close()


def get_user_profile(user_id: str) -> dict:
    db = _make_session()
    try:
        profile = db.query(SparringProfile).filter_by(user_id=user_id).first()
        if not profile:
            return {
                "user_id": user_id,
                "current_level": "intermediate",
                "priority_weaknesses": [],
                "sessions_count": 0,
            }
        return {
            "user_id": profile.user_id,
            "current_level": profile.current_level,
            "priority_weaknesses": json.loads(profile.priority_weaknesses_json),
            "sessions_count": profile.sessions_count,
        }
    finally:
        db.close()


def update_user_profile(user_id: str, score_data: dict) -> dict:
    """Escalate difficulty and track weaknesses after each session."""
    db = _make_session()
    try:
        profile = db.query(SparringProfile).filter_by(user_id=user_id).first()
        if not profile:
            profile = SparringProfile(user_id=user_id)
            db.add(profile)

        # Escalate difficulty if overall score is good
        overall = score_data.get("overall_score", 50)
        level_map = ["beginner", "intermediate", "advanced", "adversarial"]
        current_idx = level_map.index(profile.current_level) if profile.current_level in level_map else 1
        if overall >= 75 and current_idx < len(level_map) - 1:
            profile.current_level = level_map[current_idx + 1]
        elif overall < 50 and current_idx > 0:
            profile.current_level = level_map[current_idx - 1]

        # Update weaknesses
        profile.priority_weaknesses_json = json.dumps(score_data.get("weaknesses", [])[:3])
        profile.sessions_count = (profile.sessions_count or 0) + 1
        profile.updated_at = datetime.utcnow()
        db.commit()

        return get_user_profile(user_id)
    finally:
        db.close()
