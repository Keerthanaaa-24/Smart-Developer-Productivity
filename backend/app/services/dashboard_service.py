from sqlalchemy.orm import Session

from app.models.task import Task

from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.nptel_connection import NPTELConnection
from app.models.coursera_connection import CourseraConnection

from app.models.developer_activity import DeveloperActivity


def clamp_score(value):
    return round(
        max(0, min(float(value), 100)),
        2,
    )


def get_dashboard_stats(
    db: Session,
    user_id: int,
):
    # =====================================================
    # TASKS
    # =====================================================

    total_tasks = db.query(Task).filter(
        Task.user_id == user_id
    ).count()

    completed_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == "Completed",
    ).count()

    pending_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == "Pending",
    ).count()

    high_priority_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.priority == "High",
    ).count()

    completion_rate = 0

    if total_tasks:
        completion_rate = (
            completed_tasks /
            total_tasks
        ) * 100

    completion_rate = clamp_score(
        completion_rate
    )

    # =====================================================
    # PLATFORM CONNECTIONS
    # =====================================================

    github = db.query(
        GitHubConnection
    ).filter(
        GitHubConnection.user_id == user_id
    ).first()

    leetcode = db.query(
        LeetCodeConnection
    ).filter(
        LeetCodeConnection.user_id == user_id
    ).first()

    freecodecamp = db.query(
        FreeCodeCampConnection
    ).filter(
        FreeCodeCampConnection.user_id == user_id
    ).first()

    geeksforgeeks = db.query(
        GeeksForGeeksConnection
    ).filter(
        GeeksForGeeksConnection.user_id == user_id
    ).first()

    nptel = db.query(
        NPTELConnection
    ).filter(
        NPTELConnection.user_id == user_id
    ).first()

    coursera = db.query(
        CourseraConnection
    ).filter(
        CourseraConnection.user_id == user_id
    ).first()

    # =====================================================
    # LEETCODE
    # =====================================================

    leetcode_score = 0

    if leetcode:

        problems = leetcode.problems_solved or 0
        rating = leetcode.contest_rating or 0

        problem_score = min(
            problems / 2,
            50,
        )

        rating_score = min(
            rating / 40,
            25,
        )

        difficulty_score = min(
            (
                (leetcode.easy_solved or 0)
                + (leetcode.medium_solved or 0) * 2
                + (leetcode.hard_solved or 0) * 3
            ) / 20,
            25,
        )

        leetcode_score = (
            problem_score
            + rating_score
            + difficulty_score
        )

    leetcode_score = clamp_score(
        leetcode_score
    )

    # =====================================================
    # GEEKSFORGEEKS
    # =====================================================

    gfg_score = 0

    if geeksforgeeks:

        problems = (
            geeksforgeeks.problems_solved or 0
        )

        coding = (
            geeksforgeeks.coding_score or 0
        )

        articles = (
            geeksforgeeks.articles_published or 0
        )

        courses = (
            geeksforgeeks.courses_completed or 0
        )

        gfg_score = (
            min(problems / 2, 40)
            + min(coding / 2, 30)
            + min(articles * 2, 10)
            + min(courses * 5, 20)
        )

    gfg_score = clamp_score(
        gfg_score
    )

    # =====================================================
    # GITHUB
    # =====================================================

    github_score = 0

    if github:
        github_score = 25

    # =====================================================
    # FREECODECAMP
    # =====================================================

    freecodecamp_score = 0

    if freecodecamp:

        certifications = (
            freecodecamp.certifications_count or 0
        )

        freecodecamp_score = min(
            certifications * 10,
            100,
        )

    freecodecamp_score = clamp_score(
        freecodecamp_score
    )

    # =====================================================
    # NPTEL
    # =====================================================

    nptel_score = 0

    if nptel:

        completed = (
            nptel.courses_completed or 0
        )

        certificates = (
            nptel.certificates_count or 0
        )

        nptel_score = (
            min(completed * 10, 60)
            + min(certificates * 20, 40)
        )

    nptel_score = clamp_score(
        nptel_score
    )

    # =====================================================
    # COURSERA
    # =====================================================

    coursera_score = 0

    if coursera:

        completed = (
            coursera.courses_completed or 0
        )

        certificates = (
            coursera.certificates_count or 0
        )

        progress = (
            coursera.courses_in_progress or 0
        )

        coursera_score = (
            min(completed * 10, 50)
            + min(certificates * 15, 30)
            + min(progress * 5, 20)
        )

    coursera_score = clamp_score(
        coursera_score
    )

    # =====================================================
    # CODING SCORE
    # 60% OF OVERALL
    # =====================================================

    coding_scores = []

    if github:
        coding_scores.append(
            github_score
        )

    if leetcode:
        coding_scores.append(
            leetcode_score
        )

    if geeksforgeeks:
        coding_scores.append(
            gfg_score
        )

    if coding_scores:

        coding_score = (
            sum(coding_scores) /
            len(coding_scores)
        )

    else:
        coding_score = 0

    coding_score = clamp_score(
        coding_score
    )

    # =====================================================
    # LEARNING SCORE
    # 20% OF OVERALL
    # =====================================================

    learning_scores = []

    if freecodecamp:
        learning_scores.append(
            freecodecamp_score
        )

    if nptel:
        learning_scores.append(
            nptel_score
        )

    if coursera:
        learning_scores.append(
            coursera_score
        )

    if learning_scores:

        learning_score = (
            sum(learning_scores) /
            len(learning_scores)
        )

    else:
        learning_score = 0

    learning_score = clamp_score(
        learning_score
    )

    # =====================================================
    # ACTIVITY DATA
    # =====================================================

    activities = db.query(
        DeveloperActivity
    ).filter(
        DeveloperActivity.user_id == user_id,
        DeveloperActivity.ended_at.is_not(None),
    ).order_by(
        DeveloperActivity.ended_at.desc()
    ).all()

    total_activity_seconds = sum(
        activity.duration_seconds or 0
        for activity in activities
    )

    # =====================================================
    # CONSISTENCY SCORE
    # 20% OF OVERALL
    #
    # 2 hours total activity = 100
    # This is a simple baseline and can be improved later.
    # =====================================================

    consistency_score = min(
        (
            total_activity_seconds /
            3600
        ) * 50,
        100,
    )

    # Task completion contributes to consistency
    consistency_score = (
        consistency_score * 0.80
        + completion_rate * 0.20
    )

    consistency_score = clamp_score(
        consistency_score
    )

    # =====================================================
    # OVERALL SCORE
    #
    # 60% CODING
    # 20% LEARNING
    # 20% CONSISTENCY
    # =====================================================

    overall_score = (
        coding_score * 0.60
        + learning_score * 0.20
        + consistency_score * 0.20
    )

    overall_score = clamp_score(
        overall_score
    )

    # =====================================================
    # PLATFORM STATUS
    # =====================================================

    platforms = {
        "github": github is not None,
        "leetcode": leetcode is not None,
        "freecodecamp": freecodecamp is not None,
        "geeksforgeeks": geeksforgeeks is not None,
        "nptel": nptel is not None,
        "coursera": coursera is not None,
    }

    # =====================================================
    # RECENT ACTIVITY
    # =====================================================

    recent_activity = []

    for activity in activities[:10]:

        seconds = activity.duration_seconds or 0

        hours = seconds // 3600
        minutes = (seconds % 3600) // 60

        if hours > 0:
            duration = f"{hours}h {minutes}m"
        else:
            duration = f"{minutes}m"

        recent_activity.append({
            "id": activity.id,
            "platform": activity.platform,
            "activity_type": activity.activity_type,
            "duration_seconds": seconds,
            "duration": duration,
            "started_at": activity.started_at,
            "ended_at": activity.ended_at,
        })

    # =====================================================
    # RETURN
    # =====================================================

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "high_priority_tasks": high_priority_tasks,
        "completion_rate": completion_rate,

        "overall_score": overall_score,
        "coding_score": coding_score,
        "learning_score": learning_score,
        "consistency_score": consistency_score,

        "platform_scores": {
            "github": github_score,
            "leetcode": leetcode_score,
            "freecodecamp": freecodecamp_score,
            "geeksforgeeks": gfg_score,
            "nptel": nptel_score,
            "coursera": coursera_score,
        },

        "platform_connections": platforms,

        "connected_platforms": sum(
            platforms.values()
        ),

        "total_platforms": 6,

        "total_activity_seconds":
            total_activity_seconds,

        "recent_activity":
            recent_activity,
    }