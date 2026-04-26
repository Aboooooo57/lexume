import asyncio
from api import database
from sqlalchemy import select, desc

async def run():
    user_id = "a8065988-a2da-4dad-87e9-acd1373e0ecc"
    async with database.AsyncSessionLocal() as session:
        # 1. Find the absolute latest session
        res = await session.execute(
            select(database.Session).where(database.Session.user_id == user_id).order_by(desc(database.Session.date)).limit(1)
        )
        last_session = res.scalar_one_or_none()
        
        if not last_session:
            print("No sessions found for this user.")
            return

        print(f"Latest Session: {last_session.id}")
        print(f"Name: {last_session.name}")
        print(f"Date: {last_session.date}")
        
        # 2. Check main session table (legacy/global audio)
        has_main_audio = last_session.audio_bytes is not None and len(last_session.audio_bytes) > 0
        print(f"Has main audio (legacy field): {has_main_audio}")

        # 3. Check session_pages table (per-page audio)
        res_pages = await session.execute(
            select(database.SessionPage).where(database.SessionPage.session_id == last_session.id)
        )
        pages = res_pages.scalars().all()
        print(f"Total processed pages: {len(pages)}")
        
        for p in pages:
            has_page_audio = p.audio_bytes is not None and len(p.audio_bytes) > 0
            print(f" - Page {p.page_number}: {'HAS AUDIO' if has_page_audio else 'NO AUDIO'} ({len(p.audio_bytes) if p.audio_bytes else 0} bytes)")

if __name__ == "__main__":
    asyncio.run(run())
