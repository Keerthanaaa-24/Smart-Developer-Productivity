"""
Developer Productivity Dataset Generator
Creates a realistic synthetic dataset for training the supervised ML productivity model.
Clearly differentiates synthetic baseline data from live user production database data.
"""

import os
import random
import numpy as np
import pandas as pd


def generate_synthetic_dataset(num_samples: int = 5000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic synthetic developer productivity dataset.
    
    Features:
      - coding_minutes: Verified active coding time in minutes [0, 480]
      - tasks_completed: Completed developer tasks count [0, 15]
      - tasks_planned: Planned tasks count for the day [1, 20]
      - pomodoro_sessions: Number of completed 25m focus blocks [0, 12]
      - pomodoro_minutes: Total focus session duration in minutes [0, 300]
      - github_commits: Daily git commits pushed [0, 25]
      - goal_completion_rate: Daily goal achievement percentage [0.0, 100.0]
      - focus_score: Concentration / uninterrupted focus index [0.0, 100.0]
      - hour_of_day: Primary hour of activity snapshot [0, 23]
      - day_of_week: Day index (0=Monday ... 6=Sunday)
      
    Target:
      - productivity_score: Multi-factor ground truth score [0.0, 100.0]
    """
    np.random.seed(random_seed)
    random.seed(random_seed)

    records = []

    for _ in range(num_samples):
        # 1. Day & Time distribution
        day_of_week = int(np.random.choice([0, 1, 2, 3, 4, 5, 6], p=[0.18, 0.18, 0.18, 0.18, 0.16, 0.06, 0.06]))
        is_weekend = 1 if day_of_week >= 5 else 0

        # Hour of day (peaks around 10-11 AM and 2-4 PM)
        hour_probs = np.array([
            0.01, 0.01, 0.005, 0.005, 0.005, 0.01, 0.02, 0.04,
            0.07, 0.10, 0.11, 0.10, 0.06, 0.06, 0.09, 0.10,
            0.08, 0.05, 0.03, 0.02, 0.015, 0.01, 0.005, 0.005
        ])
        hour_probs = hour_probs / hour_probs.sum()
        hour_of_day = int(np.random.choice(range(24), p=hour_probs))

        # 2. Activity archetype (high performer, balanced, struggling, light/idle)
        archetype = np.random.choice(["high", "balanced", "struggling", "light"], p=[0.30, 0.45, 0.15, 0.10])

        if archetype == "high":
            coding_minutes = float(np.clip(np.random.normal(210, 50), 60, 480))
            tasks_planned = int(np.random.randint(4, 10))
            tasks_completed = int(np.clip(tasks_planned - np.random.poisson(0.8), 1, tasks_planned))
            pomodoro_sessions = int(np.clip(np.random.poisson(6), 2, 12))
            pomodoro_minutes = float(pomodoro_sessions * 25 + np.random.uniform(-5, 10))
            github_commits = int(np.clip(np.random.poisson(7), 2, 25))
            focus_score = float(np.clip(np.random.normal(86, 8), 65, 100))
        elif archetype == "balanced":
            coding_minutes = float(np.clip(np.random.normal(120, 40), 30, 300))
            tasks_planned = int(np.random.randint(3, 8))
            tasks_completed = int(np.clip(np.random.binomial(tasks_planned, 0.75), 0, tasks_planned))
            pomodoro_sessions = int(np.clip(np.random.poisson(3.5), 0, 8))
            pomodoro_minutes = float(pomodoro_sessions * 25 + np.random.uniform(-5, 5))
            github_commits = int(np.clip(np.random.poisson(3.5), 0, 12))
            focus_score = float(np.clip(np.random.normal(70, 12), 40, 95))
        elif archetype == "struggling":
            coding_minutes = float(np.clip(np.random.normal(60, 30), 0, 180))
            tasks_planned = int(np.random.randint(5, 12))
            tasks_completed = int(np.clip(np.random.binomial(tasks_planned, 0.3), 0, tasks_planned))
            pomodoro_sessions = int(np.clip(np.random.poisson(1), 0, 4))
            pomodoro_minutes = float(pomodoro_sessions * 20)
            github_commits = int(np.clip(np.random.poisson(1), 0, 4))
            focus_score = float(np.clip(np.random.normal(45, 14), 10, 70))
        else:  # light / off-day
            coding_minutes = float(np.clip(np.random.exponential(25), 0, 90))
            tasks_planned = int(np.random.randint(1, 4))
            tasks_completed = int(np.clip(np.random.binomial(tasks_planned, 0.5), 0, tasks_planned))
            pomodoro_sessions = int(np.clip(np.random.poisson(0.5), 0, 2))
            pomodoro_minutes = float(pomodoro_sessions * 25)
            github_commits = int(np.clip(np.random.poisson(0.5), 0, 2))
            focus_score = float(np.clip(np.random.normal(35, 15), 5, 60))

        # Weekend adjustment
        if is_weekend:
            coding_minutes *= 0.65
            pomodoro_minutes *= 0.65
            pomodoro_sessions = int(pomodoro_sessions * 0.65)

        # Derived goal completion rate
        task_ratio = (tasks_completed / max(1, tasks_planned)) * 100.0
        coding_ratio = min(100.0, (coding_minutes / 120.0) * 100.0)
        goal_completion_rate = float(np.clip(0.6 * task_ratio + 0.4 * coding_ratio + np.random.normal(0, 4), 0.0, 100.0))

        # Ground Truth Productivity Score Calculation (0 - 100)
        # Factor 1: Active Development Time (0 - 35 pts)
        c_score = min(35.0, (coding_minutes / 180.0) * 35.0)
        if coding_minutes > 360 and pomodoro_sessions < 2:
            # Burnout/fatigue penalty without rest breaks
            c_score -= 5.0

        # Factor 2: Task Execution & Delivery (0 - 25 pts)
        t_score = (tasks_completed / max(1, tasks_planned)) * 20.0 + min(5.0, tasks_completed * 1.0)

        # Factor 3: Deep Work & Pomodoro Focus (0 - 25 pts)
        f_score = min(15.0, (pomodoro_minutes / 120.0) * 15.0) + (focus_score / 100.0) * 10.0

        # Factor 4: Shipping Velocity / GitHub Output (0 - 15 pts)
        g_score = min(15.0, github_commits * 2.5)

        # Peak hour bonus (+/- 2 pts)
        time_bonus = 2.0 if (9 <= hour_of_day <= 12 or 14 <= hour_of_day <= 17) else -1.0

        # Base score + realistic non-linear noise
        noise = float(np.random.normal(0, 2.8))
        raw_score = c_score + t_score + f_score + g_score + time_bonus + noise
        productivity_score = float(np.clip(round(raw_score, 1), 0.0, 100.0))

        records.append({
            "coding_minutes": round(coding_minutes, 1),
            "tasks_completed": int(tasks_completed),
            "tasks_planned": int(tasks_planned),
            "pomodoro_sessions": int(pomodoro_sessions),
            "pomodoro_minutes": round(pomodoro_minutes, 1),
            "github_commits": int(github_commits),
            "goal_completion_rate": round(goal_completion_rate, 1),
            "focus_score": round(focus_score, 1),
            "hour_of_day": int(hour_of_day),
            "day_of_week": int(day_of_week),
            "productivity_score": productivity_score,
        })

    df = pd.DataFrame(records)
    return df


def save_dataset(df: pd.DataFrame, output_path: str = None) -> str:
    if output_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(base_dir, "synthetic_developer_productivity.csv")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[DATASET GENERATOR] Successfully generated {len(df)} samples saved to: {output_path}")
    return output_path


if __name__ == "__main__":
    dataset = generate_synthetic_dataset(num_samples=5000)
    save_dataset(dataset)
    print(dataset.describe())
