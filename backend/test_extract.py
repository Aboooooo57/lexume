import asyncio
import httpx
from api.auth import GoogleAuth
token = GoogleAuth.create_access_token("100892129697352888045")
async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post("http://localhost:8000/api/extract", data={"text": "Hello World"}, headers={"Cookie": f"access_token={token}"})
        print(r.status_code)
        print(r.text)
asyncio.run(test())
