"""
Developer Productivity Preprocessing Pipeline
Handles validation, missing values, feature engineering, cyclical transformations,
and train/test dataset splitting for Random Forest Regression.
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


# Core base features expected from telemetry or input
RAW_FEATURE_COLUMNS = [
    "coding_minutes",
    "tasks_completed",
    "tasks_planned",
    "pomodoro_sessions",
    "pomodoro_minutes",
    "github_commits",
    "goal_completion_rate",
    "focus_score",
    "hour_of_day",
    "day_of_week",
]

# Engineered feature names produced by the preprocessing pipeline
FINAL_FEATURE_COLUMNS = [
    "coding_minutes",
    "tasks_completed",
    "tasks_planned",
    "task_completion_ratio",
    "pomodoro_sessions",
    "pomodoro_minutes",
    "coding_to_pomodoro_ratio",
    "github_commits",
    "commit_intensity",
    "goal_completion_rate",
    "focus_score",
    "is_weekend",
    "is_peak_hours",
    "hour_sin",
    "hour_cos",
    "day_sin",
    "day_cos",
]


class DeveloperProductivityPreprocessor:
    """
    Production Preprocessor for Developer Productivity ML Pipeline.
    Cleanly serializable with joblib for online API inferencing.
    """

    def __init__(self, apply_scaling: bool = False):
        self.apply_scaling = apply_scaling
        self.scaler = StandardScaler() if apply_scaling else None
        self.feature_names = FINAL_FEATURE_COLUMNS
        self.is_fitted = False
        self.imputation_values = {
            "coding_minutes": 0.0,
            "tasks_completed": 0,
            "tasks_planned": 1,
            "pomodoro_sessions": 0,
            "pomodoro_minutes": 0.0,
            "github_commits": 0,
            "goal_completion_rate": 0.0,
            "focus_score": 0.0,
            "hour_of_day": 12,
            "day_of_week": 2,
        }

    def clean_raw_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handles missing values, types, and clips invalid ranges."""
        df_clean = df.copy()

        for col, default_val in self.imputation_values.items():
            if col in df_clean.columns:
                df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce").fillna(default_val)
            else:
                df_clean[col] = default_val

        # Clip values to physically possible developer boundaries
        df_clean["coding_minutes"] = df_clean["coding_minutes"].clip(lower=0.0, upper=1440.0)
        df_clean["tasks_completed"] = df_clean["tasks_completed"].clip(lower=0, upper=100).astype(int)
        df_clean["tasks_planned"] = df_clean["tasks_planned"].clip(lower=0, upper=100).astype(int)
        df_clean["pomodoro_sessions"] = df_clean["pomodoro_sessions"].clip(lower=0, upper=50).astype(int)
        df_clean["pomodoro_minutes"] = df_clean["pomodoro_minutes"].clip(lower=0.0, upper=1440.0)
        df_clean["github_commits"] = df_clean["github_commits"].clip(lower=0, upper=200).astype(int)
        df_clean["goal_completion_rate"] = df_clean["goal_completion_rate"].clip(lower=0.0, upper=100.0)
        df_clean["focus_score"] = df_clean["focus_score"].clip(lower=0.0, upper=100.0)
        df_clean["hour_of_day"] = df_clean["hour_of_day"].clip(lower=0, upper=23).astype(int)
        df_clean["day_of_week"] = df_clean["day_of_week"].clip(lower=0, upper=6).astype(int)

        return df_clean

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Creates engineered signals and cyclical time encodings."""
        df_eng = df.copy()

        # 1. Task Completion Ratio (0.0 to 1.0+)
        safe_planned = df_eng["tasks_planned"].replace(0, 1)
        df_eng["task_completion_ratio"] = (df_eng["tasks_completed"] / safe_planned).clip(0.0, 3.0)

        # 2. Coding to Pomodoro Ratio
        safe_pom_mins = df_eng["pomodoro_minutes"].replace(0, 1.0)
        df_eng["coding_to_pomodoro_ratio"] = (df_eng["coding_minutes"] / safe_pom_mins).clip(0.0, 10.0)

        # 3. Commit Intensity (commits per coding hour)
        coding_hours = (df_eng["coding_minutes"] / 60.0).clip(lower=0.5)
        df_eng["commit_intensity"] = (df_eng["github_commits"] / coding_hours).clip(0.0, 50.0)

        # 4. Weekend and Peak Hours Flags
        df_eng["is_weekend"] = (df_eng["day_of_week"] >= 5).astype(int)
        df_eng["is_peak_hours"] = (
            ((df_eng["hour_of_day"] >= 9) & (df_eng["hour_of_day"] <= 12)) |
            ((df_eng["hour_of_day"] >= 14) & (df_eng["hour_of_day"] <= 18))
        ).astype(int)

        # 5. Cyclical Time Encodings (smooth 24-hour and 7-day cyclical continuity)
        df_eng["hour_sin"] = np.sin(2 * np.pi * df_eng["hour_of_day"] / 24.0)
        df_eng["hour_cos"] = np.cos(2 * np.pi * df_eng["hour_of_day"] / 24.0)
        df_eng["day_sin"] = np.sin(2 * np.pi * df_eng["day_of_week"] / 7.0)
        df_eng["day_cos"] = np.cos(2 * np.pi * df_eng["day_of_week"] / 7.0)

        # Reindex to strict finalized feature order
        return df_eng[FINAL_FEATURE_COLUMNS]

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Fits preprocessor and transforms dataset."""
        cleaned = self.clean_raw_data(df)
        engineered = self.engineer_features(cleaned)

        if self.apply_scaling and self.scaler is not None:
            scaled_array = self.scaler.fit_transform(engineered)
            transformed = pd.DataFrame(scaled_array, columns=FINAL_FEATURE_COLUMNS, index=df.index)
        else:
            transformed = engineered

        self.is_fitted = True
        return transformed

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transforms new unseen samples using fitted params."""
        cleaned = self.clean_raw_data(df)
        engineered = self.engineer_features(cleaned)

        if self.apply_scaling and self.scaler is not None and self.is_fitted:
            scaled_array = self.scaler.transform(engineered)
            transformed = pd.DataFrame(scaled_array, columns=FINAL_FEATURE_COLUMNS, index=df.index)
        else:
            transformed = engineered

        return transformed

    def transform_single(self, input_dict: Dict[str, Any]) -> pd.DataFrame:
        """Transforms a single dictionary of user features for realtime API prediction."""
        df = pd.DataFrame([input_dict])
        return self.transform(df)


def prepare_train_test_data(
    df: pd.DataFrame,
    test_size: float = 0.2,
    random_state: int = 42,
    apply_scaling: bool = False,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series, DeveloperProductivityPreprocessor]:
    """
    Cleans, engineers, splits, and prepares data for ML model training.
    """
    preprocessor = DeveloperProductivityPreprocessor(apply_scaling=apply_scaling)
    X = preprocessor.fit_transform(df)
    y = df["productivity_score"].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=True
    )

    return X_train, X_test, y_train, y_test, preprocessor
