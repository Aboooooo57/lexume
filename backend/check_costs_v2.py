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
        
        # Find last real processing session
        last_real_sid = None
        for tx in txs:
            if tx.session_id:
                last_real_sid = tx.session_id
                break
        
        if last_real_sid:
            print(f"\nLast processed Session ID: {last_real_sid}")
            s_res = await session.execute(select(database.Session).where(database.Session.id == last_real_sid))
            s_obj = s_res.scalar_one_or_none()
            if s_obj:
                print(f"Session Name: {s_obj.name}")
                print(f"Session User ID in DB: {s_obj.user_id}")
            
            # Sum costs for this session
            res_all = await session.execute(
                select(database.CreditTransaction).where(database.CreditTransaction.session_id == last_real_sid)
            )
            s_txs = res_all.scalars().all()
            total_usd = 0.0
            print("\nBreakdown:")
            for tx in s_txs:
                usd = tx.usd_cost if tx.usd_cost is not None else 0.0
                total_usd += usd
                print(f"  - {tx.date} | {tx.reason}: {tx.amount} credits | Cost: ${usd:.6f} USD")
            print(f"\nTOTAL REAL COST: ${total_usd:.6f} USD")
        else:
            print("No session-linked transactions found.")

if __name__ == "__main__":
    asyncio.run(run())
