"""
Explainable Career-Readiness Assessment Service (Phase 3)
Calculates a transparent, multi-pillar developer readiness index based on
verifiable project evidence, algorithmic achievements, learning milestones, and execution discipline.
"""

from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.models.developer_activity import DeveloperActivity
from app.models.project import Project
from app.models.task import Task
from app.models.pomodoro_session import PomodoroSession
from app.models.github_connection import GitHubConnection
from app.models.leetcode_connection import LeetCodeConnection
from app.models.coursera_connection import CourseraConnection
from app.models.nptel_connection import NPTELConnection
from app.models.geeksforgeeks_connection import GeeksForGeeksConnection
from app.models.freecodecamp_connection import FreeCodeCampConnection
from app.models.linkedin_connection import LinkedInConnection
from app.models.user_settings import UserSettings


class CareerReadinessService:
    """
    Evaluates verified evidence vs user claims across 5 technical pillars.
    """

    def evaluate_career_readiness(self, db: Session, user_id: int) -> Dict[str, Any]:
        """
        Computes the complete, explainable evidence-based readiness assessment.
        """
        now = datetime.utcnow()

        # 1. Fetch DB entities
        projects = db.query(Project).filter(Project.user_id == user_id).all()
        tasks = db.query(Task).filter(Task.user_id == user_id).all()
        pomodoros = db.query(PomodoroSession).filter(
            PomodoroSession.user_id == user_id,
            PomodoroSession.status == "completed"
        ).all()
        activities = db.query(DeveloperActivity).filter(DeveloperActivity.user_id == user_id).all()

        gh = db.query(GitHubConnection).filter(GitHubConnection.user_id == user_id).first()
        lc = db.query(LeetCodeConnection).filter(LeetCodeConnection.user_id == user_id).first()
        co = db.query(CourseraConnection).filter(CourseraConnection.user_id == user_id).first()
        nptel = db.query(NPTELConnection).filter(NPTELConnection.user_id == user_id).first()
        gfg = db.query(GeeksForGeeksConnection).filter(GeeksForGeeksConnection.user_id == user_id).first()
        fcc = db.query(FreeCodeCampConnection).filter(FreeCodeCampConnection.user_id == user_id).first()
        li = db.query(LinkedInConnection).filter(LinkedInConnection.user_id == user_id).first()
        settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()

        # 2. Extract Evidence Metrics

        # Pillar 1: Code & Version Control Evidence (Weight: 25%)
        gh_connected = gh is not None and not getattr(gh, "token_expired", False)
        repos_count = getattr(gh, "public_repos", None) or len(projects)
        commits_stored = sum(a.activity_count or 1 for a in activities if a.platform == "github")
        completed_projects = sum(1 for p in projects if p.status in ("completed", "Completed", "live"))
        total_projects = len(projects)

        p1_score = 0.0
        p1_evidence = []
        p1_missing = []

        if gh_connected:
            p1_score += 40.0
            p1_evidence.append(f"Connected GitHub account (@{gh.github_username})")
        else:
            p1_missing.append("Connect GitHub to verify authentic commit lineage and public repositories.")

        if repos_count >= 3 or completed_projects >= 2:
            p1_score += 35.0
            p1_evidence.append(f"Demonstrated project portfolio ({repos_count} repos, {completed_projects} completed projects)")
        elif total_projects > 0:
            p1_score += 20.0
            p1_evidence.append(f"{total_projects} project(s) in progress")
        else:
            p1_missing.append("Add at least 2 complete, documented projects with live demo links.")

        if commits_stored >= 15:
            p1_score += 25.0
            p1_evidence.append(f"Verified commit activity ({commits_stored} events stored)")
        elif commits_stored > 0:
            p1_score += 15.0
            p1_evidence.append(f"{commits_stored} commit events")
        else:
            p1_missing.append("Push regular git commits to show active development consistency.")

        p1_score = min(100.0, p1_score)

        # Pillar 2: Algorithmic Problem Solving (Weight: 25%)
        lc_connected = lc is not None and bool(lc.leetcode_username)
        gfg_connected = gfg is not None and bool(gfg.gfg_username)
        lc_solved = lc.problems_solved if lc and lc.problems_solved else 0
        gfg_solved = gfg.problems_solved if gfg and gfg.problems_solved else 0
        total_solved = lc_solved + gfg_solved

        p2_score = 0.0
        p2_evidence = []
        p2_missing = []

        if lc_connected or gfg_connected:
            p2_score += 30.0
            if lc_connected: p2_evidence.append(f"Connected LeetCode (@{lc.leetcode_username})")
            if gfg_connected: p2_evidence.append(f"Connected GeeksforGeeks (@{gfg.gfg_username})")
        else:
            p2_missing.append("Link LeetCode or GeeksforGeeks profile to verify algorithmic problem solving.")

        if total_solved >= 100:
            p2_score += 70.0
            p2_evidence.append(f"Solved {total_solved}+ algorithmic coding challenges")
        elif total_solved >= 30:
            p2_score += 50.0
            p2_evidence.append(f"Solved {total_solved} coding challenges")
        elif total_solved > 0:
            p2_score += 30.0
            p2_evidence.append(f"Solved {total_solved} challenges")
        else:
            p2_missing.append("Solve coding challenges across Data Structures, Algorithms, and SQL.")

        p2_score = min(100.0, p2_score)

        # Pillar 3: Domain Learning & Structured Curriculum (Weight: 20%)
        co_connected = co is not None and bool(co.coursera_username)
        nptel_connected = nptel is not None and bool(nptel.nptel_username)
        fcc_connected = fcc is not None and bool(fcc.freecodecamp_username)
        learning_acts = sum(1 for a in activities if a.category == "learning" or a.platform in ("coursera", "nptel", "freecodecamp"))

        p3_score = 0.0
        p3_evidence = []
        p3_missing = []

        connected_learning = sum(1 for c in [co_connected, nptel_connected, fcc_connected] if c)
        if connected_learning > 0:
            p3_score += 40.0
            if co_connected: p3_evidence.append(f"Coursera integration (@{co.coursera_username})")
            if nptel_connected: p3_evidence.append(f"NPTEL certification tracker (@{nptel.nptel_username})")
            if fcc_connected: p3_evidence.append(f"freeCodeCamp curriculum (@{fcc.freecodecamp_username})")
        else:
            p3_missing.append("Track completed certifications on Coursera, NPTEL, or freeCodeCamp.")

        if learning_acts >= 10:
            p3_score += 60.0
            p3_evidence.append(f"{learning_acts} verified curriculum milestones recorded")
        elif learning_acts > 0:
            p3_score += 35.0
            p3_evidence.append(f"{learning_acts} learning milestones")
        else:
            p3_missing.append("Log courses and certifications to demonstrate structured learning.")

        p3_score = min(100.0, p3_score)

        # Pillar 4: Task Execution & Focus Discipline (Weight: 15%)
        completed_tasks = sum(1 for t in tasks if t.status == "Completed")
        pomodoro_count = len(pomodoros)

        p4_score = 0.0
        p4_evidence = []
        p4_missing = []

        if completed_tasks >= 5:
            p4_score += 50.0
            p4_evidence.append(f"{completed_tasks} roadmap tasks delivered")
        elif completed_tasks > 0:
            p4_score += 30.0
            p4_evidence.append(f"{completed_tasks} completed tasks")
        else:
            p4_missing.append("Break down projects into deliverable tasks in the Tasks Center.")

        if pomodoro_count >= 5:
            p4_score += 50.0
            p4_evidence.append(f"{pomodoro_count} verified deep-work Pomodoro sprints")
        elif pomodoro_count > 0:
            p4_score += 30.0
            p4_evidence.append(f"{pomodoro_count} focus sessions completed")
        else:
            p4_missing.append("Use the Pomodoro timer for structured distraction-free sprints.")

        p4_score = min(100.0, p4_score)

        # Pillar 5: Career & Pipeline Engagement (Weight: 15%)
        li_connected = li is not None and bool(li.linkedin_username)
        career_acts = sum(1 for a in activities if a.category == "career" or a.platform in ("linkedin", "naukri"))

        p5_score = 0.0
        p5_evidence = []
        p5_missing = []

        if li_connected:
            p5_score += 50.0
            p5_evidence.append(f"Linked professional profile (@{li.linkedin_username})")
        else:
            p5_missing.append("Link LinkedIn or professional profile to build recruiter visibility.")

        if career_acts >= 3:
            p5_score += 50.0
            p5_evidence.append(f"{career_acts} career applications and milestone records tracked")
        elif career_acts > 0:
            p5_score += 30.0
            p5_evidence.append(f"{career_acts} career logs")
        else:
            p5_missing.append("Track job applications and technical interview preparation.")

        p5_score = min(100.0, p5_score)

        # 3. Overall Weighted Readiness Index (0 - 100)
        overall_index = round(
            0.25 * p1_score +
            0.25 * p2_score +
            0.20 * p3_score +
            0.15 * p4_score +
            0.15 * p5_score,
            1
        )

        if overall_index >= 75:
            tier_label = "Production Ready"
            tier_color = "emerald"
        elif overall_index >= 50:
            tier_label = "Strong Progress"
            tier_color = "blue"
        elif overall_index >= 30:
            tier_label = "Developing Foundations"
            tier_color = "amber"
        else:
            tier_label = "Early Stage"
            tier_color = "slate"

        # 4. Inferred Technical Signals
        inferred_signals = []
        if p1_score >= 60:
            inferred_signals.append({"signal": "Version Control & Project Delivery", "strength": "High", "evidence": "Verified repository commit history"})
        if p2_score >= 60:
            inferred_signals.append({"signal": "Algorithmic Problem Solving", "strength": "High", "evidence": "Coding platform challenge completions"})
        if p3_score >= 60:
            inferred_signals.append({"signal": "Continuous Learning & Upskilling", "strength": "High", "evidence": "Course and certification milestones"})
        if p4_score >= 60:
            inferred_signals.append({"signal": "Task Execution & Deep Work", "strength": "High", "evidence": "Pomodoro and sprint completions"})

        return {
            "overall_readiness_index": overall_index,
            "tier_label": tier_label,
            "tier_color": tier_color,
            "generated_at_utc": now.isoformat() + "Z",
            "pillars": {
                "code_and_version_control": {
                    "name": "Code & Version Control Evidence",
                    "score": p1_score,
                    "weight": "25%",
                    "observed_evidence": p1_evidence,
                    "missing_evidence": p1_missing,
                },
                "problem_solving": {
                    "name": "Algorithmic Problem Solving",
                    "score": p2_score,
                    "weight": "25%",
                    "observed_evidence": p2_evidence,
                    "missing_evidence": p2_missing,
                },
                "structured_learning": {
                    "name": "Domain Learning & Certifications",
                    "score": p3_score,
                    "weight": "20%",
                    "observed_evidence": p3_evidence,
                    "missing_evidence": p3_missing,
                },
                "execution_discipline": {
                    "name": "Execution & Focus Discipline",
                    "score": p4_score,
                    "weight": "15%",
                    "observed_evidence": p4_evidence,
                    "missing_evidence": p4_missing,
                },
                "career_engagement": {
                    "name": "Career & Pipeline Readiness",
                    "score": p5_score,
                    "weight": "15%",
                    "observed_evidence": p5_evidence,
                    "missing_evidence": p5_missing,
                },
            },
            "inferred_signals": inferred_signals,
            "provenance_breakdown": {
                "observed_evidence_count": len(p1_evidence) + len(p2_evidence) + len(p3_evidence) + len(p4_evidence) + len(p5_evidence),
                "missing_evidence_count": len(p1_missing) + len(p2_missing) + len(p3_missing) + len(p4_missing) + len(p5_missing),
            },
            "disclaimer": "This is a transparent, evidence-based readiness index derived from your connected portfolio and activity records. It does not claim to guarantee hiring outcomes.",
        }


career_readiness_service = CareerReadinessService()
