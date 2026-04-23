from __future__ import annotations

import pathlib

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from fastapi.middleware.cors import CORSMiddleware

from api.routes.dictionary import router as dict_router
from api.routes.extract import router as extract_router
from api.routes.generate import router as generate_router

BASE_DIR = pathlib.Path(__file__).parent.parent

app = FastAPI(title="English Reader & Translator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

app.include_router(extract_router)
app.include_router(generate_router)
app.include_router(dict_router)

# Pages router imported last (depends on templates)
from api.routes import pages  # noqa: E402

app.include_router(pages.router)
