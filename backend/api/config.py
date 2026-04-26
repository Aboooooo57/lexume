import os
import pathlib
from dotenv import load_dotenv

# Load .env file
load_dotenv()

BASE_DIR = pathlib.Path(__file__).parent.parent

# --- Google OAuth2 & JWT ---
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
GOOGLE_DRIVE_REDIRECT_URI = os.environ.get("GOOGLE_DRIVE_REDIRECT_URI", "http://localhost:8000/api/auth/drive/callback")

# --- Security & OWASP ---
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-key-change-me")
# Encryption secret for sensitive tokens (Must be 32 bytes for Fernet)
ENCRYPTION_SECRET = os.environ.get("ENCRYPTION_SECRET", "8jU6eE8vD5mN2pX1qW9zY0rV3bB7nN4m1lK2jH3gG4f=")
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

# --- Credits ---
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "lexis-admin-secret")
CREDIT_STARTER_BALANCE = float(os.environ.get("CREDIT_STARTER_BALANCE", "20.0"))
CREDIT_COST_EXTRACTION = float(os.environ.get("CREDIT_COST_EXTRACTION", "1.0"))       # per page (Gemini)
CREDIT_COST_AUDIO_PER_K_CHARS = float(os.environ.get("CREDIT_COST_AUDIO_PER_K_CHARS", "4.0"))  # credits per 1 000 ElevenLabs chars
CREDIT_COST_AUDIO_MIN = float(os.environ.get("CREDIT_COST_AUDIO_MIN", "2.0"))       # floor — any audio costs at least this
CREDIT_COST_TRANSLATION = float(os.environ.get("CREDIT_COST_TRANSLATION", "0.1"))   # per translation call

# --- Actual API Pricing (USD) — used to record real spend per transaction ---
# Gemini 2.0/2.5 Flash (≤128K tokens, standard tier)
GEMINI_INPUT_PRICE_PER_M_TOKENS = float(os.environ.get("GEMINI_INPUT_PRICE_PER_M_TOKENS", "0.30"))
GEMINI_OUTPUT_PRICE_PER_M_TOKENS = float(os.environ.get("GEMINI_OUTPUT_PRICE_PER_M_TOKENS", "2.50"))
# ElevenLabs Multilingual v2 = $0.12/1K chars; Flash/Turbo = $0.06/1K chars
ELEVENLABS_PRICE_PER_K_CHARS = float(os.environ.get("ELEVENLABS_PRICE_PER_K_CHARS", "0.12"))
