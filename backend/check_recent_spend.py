import asyncio
from api import database
from sqlalchemy import select, desc

async def run():
    user_id = "a8065988-a2da-4dad-87e9-acd1373e0ecc"
    async with database.AsyncSessionLocal() as session:
        res = await session.execute(
            select(database.CreditTransaction).where(database.CreditTransaction.user_id == user_id).order_by(desc(database.CreditTransaction.date)).limit(5)
        )
        txs = res.scalars().all()
        
        print(f"Recent spend for user {user_id}:")
        if not txs:
            print("No recent transactions found.")
            return

        for tx in txs:
            print(f"- {tx.date} | {tx.reason}: {tx.amount} credits | Cost: ${tx.usd_cost or 0.0:.6f} USD | Session: {tx.session_id}")

if __name__ == "__main__":
    asyncio.run(run())
