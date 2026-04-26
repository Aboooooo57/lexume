import asyncio
from api import database
from sqlalchemy import select, desc

async def run():
    user_id = "a8065988-a2da-4dad-87e9-acd1373e0ecc"
    async with database.AsyncSessionLocal() as session:
        # Find latest transactions for this user
        res = await session.execute(
            select(database.CreditTransaction).where(database.CreditTransaction.user_id == user_id).order_by(desc(database.CreditTransaction.date)).limit(10)
        )
        txs = res.scalars().all()
        
        if not txs:
            print("No transactions found.")
            return

        print(f"Latest Transactions for user: {user_id}")
        
        total_usd = 0.0
        # Group by session_id if possible
        sessions = {}
        for tx in txs:
            sid = tx.session_id or "No Session"
            if sid not in sessions:
                sessions[sid] = []
            sessions[sid].append(tx)
            
        for sid, s_txs in sessions.items():
            print(f"\nSession: {sid}")
            s_total = 0.0
            for tx in s_txs:
                usd = tx.usd_cost if tx.usd_cost is not None else 0.0
                s_total += usd
                print(f"  - {tx.date} | {tx.reason}: {tx.amount} credits | Cost: ${usd:.6f} USD")
            print(f"  Total for this session: ${s_total:.6f} USD")
            if sid != "No Session": # Use the first real session's total as the "last session" result
                total_usd = s_total

if __name__ == "__main__":
    asyncio.run(run())
