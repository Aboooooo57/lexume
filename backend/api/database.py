from __future__ import annotations

import os
import uuid
import json
import datetime
import asyncio
import pathlib
from typing import List, Dict, Any, Optional

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Text, LargeBinary, select, update, delete, ForeignKey, Float, UniqueConstraint

from api import config

# --- Database Setup ---
DATABASE_URL = "sqlite+aiosqlite:///./lexis.db"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[Optional[str]] = mapped_column(String)
    picture: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String)

class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[Optional[str]] = mapped_column(String)
    type: Mapped[Optional[str]] = mapped_column(String)
    date: Mapped[str] = mapped_column(String)
    total_pages: Mapped[Optional[int]] = mapped_column(Integer)

    extracted_text: Mapped[str] = mapped_column(Text)
    paragraphs: Mapped[str] = mapped_column(Text) # JSON string
    audio_bytes: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    word_timings: Mapped[str] = mapped_column(Text) # JSON string
    original_bytes: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    original_filename: Mapped[Optional[str]] = mapped_column(String)
    selected_pages: Mapped[Optional[str]] = mapped_column(Text) # JSON string of indices
    gemini_file_uri: Mapped[Optional[str]] = mapped_column(String)

    bookmarks = relationship("Bookmark", back_populates="session", cascade="all, delete-orphan")
    lookups = relationship("VocabularyLookup", back_populates="session", cascade="all, delete-orphan")
    pages = relationship("SessionPage", back_populates="session", cascade="all, delete-orphan")

class SessionPage(Base):
    __tablename__ = "session_pages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"))
    page_number: Mapped[int] = mapped_column(Integer)
    extracted_text: Mapped[str] = mapped_column(Text)
    paragraphs: Mapped[str] = mapped_column(Text) # JSON string
    audio_bytes: Mapped[Optional[bytes]] = mapped_column(LargeBinary)
    word_timings: Mapped[str] = mapped_column(Text) # JSON string
    
    session = relationship("Session", back_populates="pages")
    __table_args__ = (UniqueConstraint("session_id", "page_number", name="uq_session_page"),)

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    
    session = relationship("Session", back_populates="bookmarks")

class VocabularyLookup(Base):
    __tablename__ = "vocabulary_lookups"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("sessions.id"), index=True)
    word: Mapped[str] = mapped_column(String)
    definition: Mapped[Optional[str]] = mapped_column(Text)
    date: Mapped[str] = mapped_column(String)
    
    session = relationship("Session", back_populates="lookups")

class UserPreference(Base):
    __tablename__ = "user_preferences"
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    theme: Mapped[str] = mapped_column(String, default="dark")
    voice_id: Mapped[str] = mapped_column(String, default=config.ELEVENLABS_VOICE_ID)
    eleven_key: Mapped[str] = mapped_column(String, default="")
    gemini_key: Mapped[str] = mapped_column(String, default="")
    speed: Mapped[float] = mapped_column(Float, default=1.0)
    stability: Mapped[float] = mapped_column(Float, default=0.5)
    similarity_boost: Mapped[float] = mapped_column(Float, default=0.75)
    font_size: Mapped[str] = mapped_column(String, default="base")
    font_family: Mapped[str] = mapped_column(String, default="sans")
    target_language: Mapped[str] = mapped_column(String, default="Persian")

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# --- CRUD Functions ---

async def create_session(data: Dict[str, Any]) -> str:
    sid = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    
    original_filename = data.get('original_filename')
    if original_filename:
        name = original_filename
        stype = 'upload'
    else:
        paras = data.get('paragraphs', [])
        if paras and len(paras) > 0 and len(paras[0]) > 0:
            name = paras[0][:50] + ('...' if len(paras[0]) > 50 else '')
        else:
            name = 'Untitled Session'
        stype = 'paste'

    new_session = Session(
        id=sid,
        name=name,
        type=stype,
        date=now,
        extracted_text=data.get('extracted', ''),
        paragraphs=json.dumps(data.get('paragraphs', [])),
        audio_bytes=data.get('audio_bytes'),
        word_timings=json.dumps(data.get('word_timings', [])),
        original_bytes=data.get('original_bytes'),
        original_filename=data.get('original_filename'),
        total_pages=data.get('total_pages', 1),
        selected_pages=data.get('selected_pages'),
        gemini_file_uri=data.get('gemini_file_uri')
    )

    async with AsyncSessionLocal() as session:
        async with session.begin():
            session.add(new_session)
            return sid

async def get_session(sid: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        result = await session.get(Session, sid)
        if not result:
            return None
        
        # Convert to dict and format as per original API
        data = {
            "id": result.id,
            "name": result.name,
            "type": result.type,
            "date": result.date,
            "extracted": result.extracted_text,
            "paragraphs": json.loads(result.paragraphs) if result.paragraphs else [],
            "audio_bytes": result.audio_bytes,
            "word_timings": json.loads(result.word_timings) if result.word_timings else [],
            "original_bytes": result.original_bytes,
            "original_filename": result.original_filename,
            "total_pages": result.total_pages or 1,
            "selected_pages": json.loads(result.selected_pages) if result.selected_pages else None,
            "gemini_file_uri": result.gemini_file_uri
        }
        return data

async def get_session_page(sid: str, page_number: int) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        stmt = select(SessionPage).where(SessionPage.session_id == sid, SessionPage.page_number == page_number).limit(1)
        result = await session.execute(stmt)
        page = result.scalars().first()
        if not page:
            return None
        return {
            "id": page.id,
            "session_id": page.session_id,
            "page_number": page.page_number,
            "extracted": page.extracted_text,
            "paragraphs": json.loads(page.paragraphs) if page.paragraphs else [],
            "audio_bytes": page.audio_bytes,
            "word_timings": json.loads(page.word_timings) if page.word_timings else []
        }

async def save_session_page(sid: str, page_number: int, data: Dict[str, Any]) -> int:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Check for existing to avoid duplicates if UniqueConstraint isn't enough/triggering
            stmt = select(SessionPage).where(SessionPage.session_id == sid, SessionPage.page_number == page_number)
            existing = (await session.execute(stmt)).scalars().first()
            if existing:
                existing.extracted_text = data.get('extracted', '')
                existing.paragraphs = json.dumps(data.get('paragraphs', []))
                existing.audio_bytes = data.get('audio_bytes')
                existing.word_timings = json.dumps(data.get('word_timings', []))
                await session.flush()
                return existing.id
            
            new_page = SessionPage(
                session_id=sid,
                page_number=page_number,
                extracted_text=data.get('extracted', ''),
                paragraphs=json.dumps(data.get('paragraphs', [])),
                audio_bytes=data.get('audio_bytes'),
                word_timings=json.dumps(data.get('word_timings', []))
            )
            session.add(new_page)
            await session.flush()
            return new_page.id

async def update_session(sid: str, updates: Dict[str, Any]) -> bool:
    valid_keys = {
        'name', 'audio_bytes', 'word_timings', 'original_bytes', 
        'original_filename', 'total_pages', 'selected_pages', 'extracted_text', 'paragraphs'
    }
    mapped_updates = {}
    for k, v in updates.items():
        if k in valid_keys:
            if k in ['word_timings', 'paragraphs', 'selected_pages'] and not isinstance(v, str):
                v = json.dumps(v)
            mapped_updates[k] = v
            
    if not mapped_updates:
        return False

    async with AsyncSessionLocal() as session:
        async with session.begin():
            stmt = update(Session).where(Session.id == sid).values(**mapped_updates)
            result = await session.execute(stmt)
            return result.rowcount > 0

async def delete_session(sid: str) -> bool:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            stmt = delete(Session).where(Session.id == sid)
            result = await session.execute(stmt)
            return result.rowcount > 0

async def get_all_sessions_summary() -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        stmt = select(Session).order_by(Session.date.desc())
        result = await session.execute(stmt)
        sessions = result.scalars().all()
        
        output = []
        for s in sessions:
            # Simple summary fetch
            b_stmt = select(Bookmark.text).where(Bookmark.session_id == s.id)
            l_stmt = select(VocabularyLookup.word).where(VocabularyLookup.session_id == s.id)
            
            bookmarks = (await session.execute(b_stmt)).scalars().all()
            lookups = (await session.execute(l_stmt)).scalars().all()
            
            output.append({
                "id": s.id,
                "name": s.name,
                "type": s.type,
                "date": s.date,
                "bookmarks": list(bookmarks),
                "lookups": [{"word": word} for word in lookups]
            })
        return output

async def create_user(email: str, name: Optional[str], picture: Optional[str]) -> str:
    uid = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    new_user = User(id=uid, email=email, name=name, picture=picture, created_at=now)
    async with AsyncSessionLocal() as session:
        async with session.begin():
            session.add(new_user)
            return uid

async def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        user = await session.get(User, user_id)
        if not user: return None
        return {"id": user.id, "email": user.email, "name": user.name, "picture": user.picture}

async def get_or_create_user(user_info: Dict[str, Any]) -> str:
    email = user_info.get("email")
    if not email:
        raise ValueError("User info must contain email")
    
    user = await get_user_by_email(email)
    if user:
        return user["id"]
    
    return await create_user(
        email=email,
        name=user_info.get("name"),
        picture=user_info.get("picture")
    )

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if not user: return None
        return {"id": user.id, "email": user.email, "name": user.name, "picture": user.picture}

async def get_preferences(user_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            result = await session.get(UserPreference, user_id)
            if not result:
                result = UserPreference(user_id=user_id)
                session.add(result)

        return {
            "theme": result.theme,
            "voice_id": result.voice_id,
            "eleven_key": result.eleven_key,
            "gemini_key": result.gemini_key,
            "speed": result.speed,
            "stability": result.stability,
            "similarity_boost": result.similarity_boost,
            "font_size": result.font_size,
            "font_family": result.font_family,
            "target_language": result.target_language
        }

async def update_preferences(user_id: str, updates: Dict[str, Any]) -> bool:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            stmt = update(UserPreference).where(UserPreference.user_id == user_id).values(**updates)
            result = await session.execute(stmt)
            return result.rowcount > 0

async def add_bookmark(session_id: str, text: str) -> int:
    async with AsyncSessionLocal() as session:
        async with session.begin():
            new_b = Bookmark(session_id=session_id, text=text)
            session.add(new_b)
            await session.flush()
            return new_b.id

async def add_lookup(session_id: str, word: str, definition: Optional[str] = None) -> int:
    now = datetime.datetime.now().isoformat()
    async with AsyncSessionLocal() as session:
        async with session.begin():
            new_l = VocabularyLookup(session_id=session_id, word=word, definition=definition, date=now)
            session.add(new_l)
            await session.flush()
            return new_l.id
