import asyncio
from google import genai
client = genai.Client()
async def test():
    print(dir(client.aio))
    print(dir(client.aio.files))
asyncio.run(test())
