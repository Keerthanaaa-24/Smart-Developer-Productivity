import asyncio
from app.core.database import SessionLocal
from app.models.user import User
from app.models.github_connection import GitHubConnection
from app.services.github_service import (
    get_github_profile,
    get_github_repositories,
    get_github_activity,
    get_github_contribution_calendar,
)

async def check_gh():
    db = SessionLocal()
    u = db.query(User).filter(User.username == "Keerthzz").first()
    gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == u.id).first()
    print("User ID:", u.id, "Username:", u.username)
    print("GitHub Username:", gh.github_username, "Token prefix:", gh.access_token[:8] if gh.access_token else None)

    try:
        profile = await get_github_profile(gh.access_token)
        print("GitHub Profile:", profile.get("login"), profile.get("name"), "Public repos:", profile.get("public_repos"))
    except Exception as e:
        print("Profile error:", e)

    try:
        repos = await get_github_repositories(gh.access_token)
        print(f"Repositories fetched: {len(repos)}")
        for r in repos[:3]:
            print(f" - Repo: {r.get('name')} | Language: {r.get('language')} | Stars: {r.get('stargazers_count')}")
    except Exception as e:
        print("Repos error:", e)

    try:
        events = await get_github_activity(gh.access_token, gh.github_username)
        print(f"Recent Events fetched: {len(events)}")
        for ev in events[:5]:
            print(f" - Event: {ev.get('type')} | Repo: {ev.get('repository')} | Date: {ev.get('created_at')}")
    except Exception as e:
        print("Events error:", e)

    try:
        cal = await get_github_contribution_calendar(gh.access_token, gh.github_username)
        print(f"Contribution Calendar: Total={cal.get('total_contributions')} | Days tracked={len(cal.get('days', []))}")
        recent_contrib_days = [d for d in cal.get("days", []) if d.get("count", 0) > 0]
        print(f"Active contribution days in last year: {len(recent_contrib_days)}")
        for d in recent_contrib_days[-5:]:
            print(f" - Active Day: {d.get('date')} -> {d.get('count')} contributions")
    except Exception as e:
        print("Calendar error:", e)

    db.close()

if __name__ == "__main__":
    asyncio.run(check_gh())
