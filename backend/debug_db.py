import asyncio
from api import database
from sqlalchemy import select

async def run():
    async with database.AsyncSessionLocal() as session:
        # Check users
        print("--- USERS ---")
        res = await session.execute(select(database.User))
        for u in res.scalars().all():
            print(f"ID: {u.id} | Email: {u.email}")
            
        # Check sessions
        print("\n--- SESSIONS ---")
        res = await session.execute(select(database.Session))
        for s in res.scalars().all():
            print(f"ID: {s.id} | Name: {s.name} | UserID: {s.user_id}")

if __name__ == "__main__":
    asyncio.run(run())
