import os
import pathlib
from dotenv import load_dotenv

# Load .env file
load_dotenv()

BASE_DIR = pathlib.Path(__file__).parent.parent

# --- Google OAuth2 & JWT ---
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")

JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-key-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# --- Database ---
DB_URL = f"sqlite+aiosqlite:///{BASE_DIR}/lexis.db"

# --- Gemini API ---
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"

# --- ElevenLabs API ---
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2"
