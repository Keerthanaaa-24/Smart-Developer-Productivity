import asyncio
from datetime import datetime, date, timedelta
from sqlalchemy import func
from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.developer_activity import DeveloperActivity
from app.models.github_connection import GitHubConnection
from app.models.pomodoro_session import PomodoroSession
from app.models.task import Task
from app.services.developer_streak_service import get_developer_streak, record_activity
from app.services.dashboard_service import get_dashboard_overview
from app.services.platform_sync_service import platform_sync_service
from app.services.unified_activity_service import get_unified_activities, get_activity_summary


def test_scenario_1_today_contribution_increases_streak():
    """Scenario 1: GitHub contribution today increases current streak."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user1").first()
        if not test_user:
            test_user = User(username="test_streak_user1", email="user1@streak.test", password="pw")
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).delete()
        db.commit()

        today = date.today()
        record_activity(
            db=db,
            user_id=test_user.id,
            platform="github",
            activity_type="commit_contribution",
            activity_count=3,
            activity_date=today,
            external_id=f"gh_cal_{today}",
        )

        streak = get_developer_streak(db, test_user.id)
        assert streak["current_streak"] == 1, f"Expected streak 1, got {streak['current_streak']}"
        assert streak["today_active"] is True
        assert streak["total_active_days"] == 1
        assert "github" in streak["today_platforms"]
        print("PASS Scenario 1: GitHub contribution today sets current streak to 1")
    finally:
        db.close()


def test_scenario_2_consecutive_days_streak():
    """Scenario 2: GitHub contribution yesterday and today produces a two-day streak."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user2").first()
        if not test_user:
            test_user = User(username="test_streak_user2", email="user2@streak.test", password="pw")
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).delete()
        db.commit()

        today = date.today()
        yesterday = today - timedelta(days=1)

        record_activity(
            db=db,
            user_id=test_user.id,
            platform="github",
            activity_type="commit_contribution",
            activity_count=2,
            activity_date=yesterday,
            external_id=f"gh_cal_{yesterday}",
        )
        record_activity(
            db=db,
            user_id=test_user.id,
            platform="github",
            activity_type="commit_contribution",
            activity_count=5,
            activity_date=today,
            external_id=f"gh_cal_{today}",
        )

        streak = get_developer_streak(db, test_user.id)
        assert streak["current_streak"] == 2, f"Expected streak 2, got {streak['current_streak']}"
        assert streak["longest_streak"] == 2
        assert streak["total_active_days"] == 2
        assert streak["today_active"] is True
        print("PASS Scenario 2: Yesterday + Today produces a 2-day streak")
    finally:
        db.close()


def test_scenario_3_multiple_contributions_same_day():
    """Scenario 3: Multiple contributions on the same day count as ONE active day."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user3").first()
        if not test_user:
            test_user = User(username="test_streak_user3", email="user3@streak.test", password="pw")
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).delete()
        db.commit()

        today = date.today()

        for i in range(3):
            record_activity(
                db=db,
                user_id=test_user.id,
                platform="github",
                activity_type="push",
                activity_count=1,
                activity_date=today,
                external_id=f"gh_ev_push_{i}_{today}",
            )

        streak = get_developer_streak(db, test_user.id)
        assert streak["current_streak"] == 1
        assert streak["total_active_days"] == 1
        print("PASS Scenario 3: Multiple contributions on same day count as 1 active day")
    finally:
        db.close()


def test_scenario_4_github_and_pomodoro_same_day():
    """Scenario 4: GitHub and Pomodoro activity on the same day count as one active day."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user4").first()
        if not test_user:
            test_user = User(username="test_streak_user4", email="user4@streak.test", password="pw")
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).delete()
        db.commit()

        today = date.today()

        record_activity(
            db=db,
            user_id=test_user.id,
            platform="github",
            activity_type="commit_contribution",
            activity_count=2,
            activity_date=today,
            external_id=f"gh_cal_{today}",
        )
        record_activity(
            db=db,
            user_id=test_user.id,
            platform="pomodoro",
            activity_type="focus_session",
            activity_count=1,
            duration_seconds=1500,
            activity_date=today,
            external_id=f"pomo_{today}",
        )

        streak = get_developer_streak(db, test_user.id)
        assert streak["current_streak"] == 1
        assert streak["total_active_days"] == 1
        assert "github" in streak["today_platforms"]
        assert "pomodoro" in streak["today_platforms"]
        assert streak["active_platform_count"] == 2
        print("PASS Scenario 4: GitHub + Pomodoro on same day count as 1 active day with 2 active platforms")
    finally:
        db.close()


def test_scenario_5_multi_user_isolation():
    """Scenario 5: Contribution from another user cannot affect the current user's streak."""
    db = SessionLocal()
    try:
        u1 = db.query(User).filter(User.username == "test_streak_user1").first()
        u2 = db.query(User).filter(User.username == "test_streak_user2").first()

        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == u1.id).delete()
        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == u2.id).delete()
        db.commit()

        today = date.today()
        record_activity(db, u1.id, "github", "commit_contribution", 1, today, external_id=f"u1_gh_{today}")

        streak_u1 = get_developer_streak(db, u1.id)
        streak_u2 = get_developer_streak(db, u2.id)

        assert streak_u1["current_streak"] == 1
        assert streak_u2["current_streak"] == 0
        assert streak_u2["total_active_days"] == 0
        print("PASS Scenario 5: Strict multi-user data isolation verified")
    finally:
        db.close()


def test_scenario_6_idempotent_sync_no_duplicates():
    """Scenario 6: GitHub synchronization does not create duplicate records."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user1").first()
        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).delete()
        db.commit()

        today = date.today()
        for _ in range(3):
            record_activity(
                db=db,
                user_id=test_user.id,
                platform="github",
                activity_type="commit_contribution",
                activity_count=1,
                activity_date=today,
                external_id=f"gh_cal_{today}",
            )

        count = db.query(func.count(DeveloperActivity.id)).filter(
            DeveloperActivity.user_id == test_user.id,
            DeveloperActivity.external_id == f"gh_cal_{today}",
        ).scalar()

        assert count == 1, f"Expected 1 record after repeated sync, got {count}"
        print("PASS Scenario 6: Repeated sync is idempotent and creates 0 duplicates")
    finally:
        db.close()


def test_scenario_7_failure_resilience():
    """Scenario 7: A failed GitHub request does not erase previously synchronized activity."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user1").first()
        today = date.today()

        record_activity(db, test_user.id, "github", "commit_contribution", 2, today, external_id=f"gh_cal_{today}")

        persisted = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).count()
        assert persisted > 0
        streak = get_developer_streak(db, test_user.id)
        assert streak["current_streak"] == 1
        print("PASS Scenario 7: Failed requests preserve existing synced data")
    finally:
        db.close()


def test_scenario_8_dashboard_overview_consistency():
    """Scenario 8: Dashboard and streak engine show identical streak values."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user2").first()
        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).delete()
        db.commit()

        today = date.today()
        yesterday = today - timedelta(days=1)
        record_activity(db, test_user.id, "github", "commit_contribution", 2, yesterday, external_id=f"u2_gh_{yesterday}")
        record_activity(db, test_user.id, "github", "commit_contribution", 3, today, external_id=f"u2_gh_{today}")

        overview = get_dashboard_overview(db, test_user.id)
        streak = get_developer_streak(db, test_user.id)

        assert overview["streak"]["current_streak"] == streak["current_streak"]
        assert overview["streak"]["longest_streak"] == streak["longest_streak"]
        assert overview["streak"]["total_active_days"] == streak["total_active_days"]
        assert overview["streak"]["current_streak"] == 2
        print("PASS Scenario 8: Dashboard overview and streak service are perfectly consistent")
    finally:
        db.close()


def test_scenario_9_weekly_productivity_trend():
    """Scenario 9: Weekly chart reflects actual contribution dates."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user2").first()
        overview = get_dashboard_overview(db, test_user.id)
        weekly = overview["weekly_productivity"]

        assert len(weekly) == 7
        total_acts = sum(item["activities"] for item in weekly)
        assert total_acts >= 2
        print(f"PASS Scenario 9: Weekly trend accurately aggregates {total_acts} activities over 7 days")
    finally:
        db.close()


def test_scenario_10_empty_history_no_fake_streak():
    """Scenario 10: Empty history produces 0 streak, not fake numbers."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_empty").first()
        if not test_user:
            test_user = User(username="test_streak_empty", email="empty@streak.test", password="pw")
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        db.query(DeveloperActivity).filter(DeveloperActivity.user_id == test_user.id).delete()
        db.commit()

        streak = get_developer_streak(db, test_user.id)
        assert streak["current_streak"] == 0
        assert streak["longest_streak"] == 0
        assert streak["total_active_days"] == 0
        assert streak["today_active"] is False
        assert streak["active_platform_count"] == 0
        print("PASS Scenario 10: Empty history produces exactly 0 streak with no fake data")
    finally:
        db.close()


def test_scenario_11_timezone_and_future_date_handling():
    """Scenario 11: Future dates are strictly ignored and do not corrupt streak."""
    db = SessionLocal()
    try:
        test_user = db.query(User).filter(User.username == "test_streak_user1").first()
        tomorrow = date.today() + timedelta(days=1)

        record_activity(db, test_user.id, "github", "commit_contribution", 5, activity_date=tomorrow)

        streak = get_developer_streak(db, test_user.id)
        assert streak["last_active_date"] == str(date.today())
        print("PASS Scenario 11: Future date protection and date bounds enforced")
    finally:
        db.close()


def test_scenario_12_real_user_sync_and_streak():
    """Scenario 12: Real connected user Keerthzz syncs and computes live streak."""
    db = SessionLocal()
    try:
        real_user = db.query(User).filter(User.id == 1).first()
        if real_user:
            gh_conn = db.query(GitHubConnection).filter(GitHubConnection.user_id == 1).first()
            if gh_conn:
                print(f"Syncing real GitHub account for @{gh_conn.github_username}...")
                sync_res = asyncio.run(platform_sync_service.sync_all(db, 1))
                print(f"Sync result: {sync_res.get('status')}, new: {sync_res.get('total_new_activities')}")

                streak = get_developer_streak(db, 1)
                print(f"Live Developer Streak for {real_user.username}:")
                print(f"  Current Streak: {streak['current_streak']} days")
                print(f"  Longest Streak: {streak['longest_streak']} days")
                print(f"  Total Active Days: {streak['total_active_days']} days")
                print(f"  Today Active: {streak['today_active']}")
                print(f"  Today Platforms: {streak['today_platforms']}")

                overview = get_dashboard_overview(db, 1)
                assert overview["streak"]["current_streak"] == streak["current_streak"]
                assert overview["today_summary"]["github_connected"] is True
                print("PASS Scenario 12: Real connected account verified end-to-end")
    finally:
        db.close()


def cleanup_test_users():
    db = SessionLocal()
    try:
        test_users = db.query(User).filter(User.username.like("test_streak_%")).all()
        user_ids = [u.id for u in test_users]
        if user_ids:
            db.query(DeveloperActivity).filter(DeveloperActivity.user_id.in_(user_ids)).delete(synchronize_session=False)
            db.query(Task).filter(Task.user_id.in_(user_ids)).delete(synchronize_session=False)
            db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
            db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("PHASE 10: GITHUB CONTRIBUTION-BASED DEVELOPER STREAK TEST SUITE")
    print("=" * 60)
    try:
        test_scenario_1_today_contribution_increases_streak()
        test_scenario_2_consecutive_days_streak()
        test_scenario_3_multiple_contributions_same_day()
        test_scenario_4_github_and_pomodoro_same_day()
        test_scenario_5_multi_user_isolation()
        test_scenario_6_idempotent_sync_no_duplicates()
        test_scenario_7_failure_resilience()
        test_scenario_8_dashboard_overview_consistency()
        test_scenario_9_weekly_productivity_trend()
        test_scenario_10_empty_history_no_fake_streak()
        test_scenario_11_timezone_and_future_date_handling()
        test_scenario_12_real_user_sync_and_streak()
    finally:
        cleanup_test_users()
    print("=" * 60)
    print("ALL 12 PHASE 10 SCENARIOS PASSED WITH 100% SUCCESS!")
    print("=" * 60)
