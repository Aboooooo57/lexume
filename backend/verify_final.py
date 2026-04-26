import asyncio
from api import database
from sqlalchemy import select

async def run():
    user_id = "a8065988-a2da-4dad-87e9-acd1373e0ecc"
    try:
        async with database.AsyncSessionLocal() as session:
            # Check sessions for this user
            res = await session.execute(select(database.Session).where(database.Session.user_id == user_id))
            sessions = res.scalars().all()
            print(f"Found {len(sessions)} sessions for your account.")
            for s in sessions[:3]: # show first 3
                print(f" - {s.name}")
            
            # Check if any still have '1'
            res = await session.execute(select(database.Session).where(database.Session.user_id == '1'))
            orphans = res.scalars().all()
            print(f"Orphaned sessions (ID '1'): {len(orphans)}")
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    asyncio.run(run())
