import asyncio
from api import database
from sqlalchemy import update

async def run():
    target_user_id = "a8065988-a2da-4dad-87e9-acd1373e0ecc"
    async with database.AsyncSessionLocal() as session:
        async with session.begin():
            # Update all sessions that have user_id '1' to the real user_id
            stmt = update(database.Session).where(database.Session.user_id == '1').values(user_id=target_user_id)
            result = await session.execute(stmt)
            print(f"Updated {result.rowcount} sessions.")

if __name__ == "__main__":
    asyncio.run(run())
