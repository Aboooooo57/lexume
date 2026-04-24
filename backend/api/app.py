from __future__ import annotations

import pathlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.extract import router as extract_router
from api.routes.generate import router as generate_router
from api.routes.dictionary import router as dict_router
from api.routes.library import router as library_router
from api.routes.users import router as users_router
from api.routes.audio import router as audio_router
from api.routes.session import router as session_router
from api.routes.auth import router as auth_router
from api.routes.pages import router as pages_router

from contextlib import asynccontextmanager
from api.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB
    await init_db()
    yield

app = FastAPI(title="English Reader & Translator", lifespan=lifespan)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(extract_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(dict_router, prefix="/api")
app.include_router(library_router, prefix="/api/library")
app.include_router(users_router, prefix="/api/users")
app.include_router(audio_router, prefix="/api")
app.include_router(session_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(pages_router, prefix="/api")

