"""Entry point: python server.py  or  uvicorn server:app"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

from api.app import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
