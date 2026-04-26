import asyncio
from api import database
from sqlalchemy import select

async def run():
    try:
        async with database.AsyncSessionLocal() as session:
            # Check users
            print("--- USERS ---")
            res = await session.execute(select(database.User))
            users = res.scalars().all()
            for u in users:
                print(f"ID: {u.id} | Email: {u.email}")
                
            # Check sessions
            print("\n--- SESSIONS ---")
            res = await session.execute(select(database.Session))
            sessions = res.scalars().all()
            if not sessions:
                print("No sessions found in the recovered database.")
            for s in sessions:
                print(f"ID: {s.id} | Name: {s.name} | UserID: {s.user_id}")
    except Exception as e:
        print(f"Error reading database: {e}")

if __name__ == "__main__":
    asyncio.run(run())
