# Machine Learning Module — Smart Developer Productivity 🚀

## 1. Executive Summary & Why ML is Used
Traditional developer dashboards rely exclusively on rigid static heuristics (e.g. fixed additive formulas) that fail to capture:
- **Non-linear interactions** between deep Pomodoro focus and active development time.
- **Burnout and fatigue patterns** when coding exceeds healthy limits without focus breaks.
- **Dynamic task delivery velocity** based on planned versus executed tasks.
- **Circadian flow states** (peak morning and afternoon performance windows).

The Machine Learning Module equips the Smart Developer Productivity Dashboard with an empirical **Supervised Regression Engine** (`RandomForestRegressor`). It continuously ingests real-time developer telemetries (coding minutes, task executions, Pomodoro deep focus intervals, and GitHub commits) to produce:
1. Continuous **Predicted Productivity Score** (0–100).
2. **Productivity Level Categorization** (`High`, `Moderate`, `Needs Attention`).
3. **Key Driver Attribution** (Top positive and bottleneck factors).
4. **Circadian Peak Window Detection** (e.g., Morning Peak vs Afternoon Flow).
5. **Data-Driven Personalized Action Guidance**.

---

## 2. Dataset Architecture

### A. Raw Feature Schema
The ML model ingests 10 core activity features extracted from user activity tables:

| Feature Name | Type | Physical Range | Description |
| :--- | :--- | :--- | :--- |
| `coding_minutes` | Float | `[0.0, 1440.0]` | Verified active coding time across IDEs / git |
| `tasks_completed` | Integer | `[0, 100]` | Total completed tasks for the day |
| `tasks_planned` | Integer | `[1, 100]` | Total planned tasks in user queue |
| `pomodoro_sessions`| Integer | `[0, 50]` | Number of completed 25m Pomodoro cycles |
| `pomodoro_minutes` | Float | `[0.0, 1440.0]` | Total deep focus duration in minutes |
| `github_commits` | Integer | `[0, 200]` | Verified git commit events pushed |
| `goal_completion_rate`| Float | `[0.0, 100.0]` | Normalized composite target progress |
| `focus_score` | Float | `[0.0, 100.0]` | Uninterrupted concentration index |
| `hour_of_day` | Integer | `[0, 23]` | Activity timestamp hour (circadian index) |
| `day_of_week` | Integer | `[0, 6]` | Day index (0 = Monday ... 6 = Sunday) |

### B. Synthetic Baseline vs Production User Data
- **Synthetic Baseline:** Located at `backend/ml/dataset/synthetic_developer_productivity.csv` (5,000 samples). Generated using realistic multivariate distributions, archetype distributions (High Performer, Balanced, Struggling, Light), weekend dampening, and Gaussian noise.
- **Production Data Isolation:** Live user activities reside in MySQL tables (`developer_activity`, `tasks`, `pomodoro_sessions`). When retraining is triggered, real database records can be exported and merged seamlessly.

---

## 3. Data Preprocessing & Feature Engineering Pipeline

The preprocessing module (`backend/ml/preprocessing/preprocessor.py`) applies:
1. **Missing Value Imputation:** Numerical columns filled with sensible domain defaults; invalid negative inputs clipped to valid bounds.
2. **Feature Engineering (17 Final Feature Vectors):**
   - **Task Completion Ratio:** `tasks_completed / max(1, tasks_planned)`
   - **Coding-to-Pomodoro Ratio:** `coding_minutes / max(1.0, pomodoro_minutes)`
   - **Commit Intensity:** `github_commits / (coding_minutes / 60.0)`
   - **Weekend Indicator:** `1` if `day_of_week >= 5` else `0`
   - **Peak Hours Indicator:** `1` if `(9 <= hour <= 12 or 14 <= hour <= 18)` else `0`
3. **Cyclical Continuous Time Encodings:**
   - $\text{hour\_sin} = \sin(2\pi \times \text{hour} / 24)$, $\text{hour\_cos} = \cos(2\pi \times \text{hour} / 24)$
   - $\text{day\_sin} = \sin(2\pi \times \text{day} / 7)$, $\text{day\_cos} = \cos(2\pi \times \text{day} / 7)$

---

## 4. Model Selection & Why Random Forest Regressor

We selected **`RandomForestRegressor`** as the primary supervised regression model because:
1. **Non-Linear Thresholds:** Developer productivity contains non-linear thresholds (e.g. fatigue penalties beyond 6 hours without breaks, saturation curves on commit counts).
2. **Feature Interaction Handling:** Seamlessly models synergistic effects between deep focus and coding duration without requiring polynomial expansions.
3. **Robustness to Outliers & Scale Invariance:** Tree ensemble splits are invariant to monotonic transformations, preventing extreme days from distorting the model.
4. **Direct Feature Importance Extraction:** Enables the frontend to show developers exactly which factors contributed most to their predicted score.

---

## 5. Model Evaluation Metrics

Evaluated on holdout test data (80/20 train/test split):

| Metric | Result | Target Benchmark | Status |
| :--- | :--- | :--- | :--- |
| **$R^2$ Score (Variance Explained)** | **0.9782 (97.82%)** | $> 0.85$ | **PASSED** |
| **MAE (Mean Absolute Error)** | **2.91 pts** | $< 5.0$ pts | **PASSED** |
| **RMSE (Root Mean Squared Error)** | **3.70 pts** | $< 6.0$ pts | **PASSED** |
| **MSE (Mean Squared Error)** | **13.72** | $< 35.0$ | **PASSED** |
| **P50 Absolute Error (Median)** | **1.54 pts** | $< 3.0$ pts | **PASSED** |

### Top Predictive Feature Importance:
1. `goal_completion_rate`: **56.29%**
2. `coding_minutes`: **28.48%**
3. `pomodoro_minutes`: **8.35%**
4. `github_commits`: **3.51%**
5. `focus_score`: **1.16%**

---

## 6. Real-Time End-to-End Pipeline

```
┌────────────────────────────────────────────────────────┐
│                   Developer Activity                   │
│   (Git Commits, IDE Coding Time, Pomodoros, Tasks)     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                    MySQL Database                      │
│   (developer_activity, tasks, pomodoro_sessions)      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│        Feature Extraction & Cyclical Encoding          │
│            (MLProductivityService / Pandas)            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│          RandomForestRegressor Model Inference         │
│          (joblib package / Scikit-Learn 1.9.1)         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Predictions & History Storage              │
│               (productivity_predictions)               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                    FastAPI Endpoints                   │
│      (POST /ml/predict-productivity, GET /overview)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             React / Tailwind CSS Dashboard             │
│            (Interactive MLProductivityCard)            │
└────────────────────────────────────────────────────────┘
```

---

## 7. FastAPI Endpoints Reference

### 1. `POST /ml/predict-productivity`
Predicts score from arbitrary custom features.
- **Request:**
  ```json
  {
    "coding_minutes": 180,
    "tasks_completed": 5,
    "tasks_planned": 6,
    "pomodoro_sessions": 4,
    "pomodoro_minutes": 100,
    "github_commits": 6,
    "goal_completion_rate": 85,
    "focus_score": 90,
    "hour_of_day": 11,
    "day_of_week": 2
  }
  ```
- **Response:**
  ```json
  {
    "predicted_productivity_score": 92.4,
    "productivity_level": "High",
    "recommendation": "Outstanding momentum! You have an optimal balance of deep Pomodoro focus and active development time.",
    "top_factors": [
      {
        "factor": "Active Development Time",
        "impact": "High Positive",
        "value": "180 mins",
        "score_impact": "+25 to +35 pts",
        "type": "positive"
      },
      {
        "factor": "Task Execution Ratio",
        "impact": "High Positive",
        "value": "83% (5/6 tasks)",
        "score_impact": "+18 to +25 pts",
        "type": "positive"
      }
    ],
    "most_productive_time": "Morning Peak (09:00 AM - 12:00 PM)",
    "model_metadata": {
      "algorithm": "RandomForestRegressor",
      "version": "1.0.0",
      "r2_score": 0.9782,
      "mae": 2.91
    }
  }
  ```

### 2. `GET /ml/my-productivity`
Extracts live database telemetry for the authenticated user, runs prediction, stores result in `productivity_predictions`, and returns the payload.

### 3. `GET /ml/history`
Returns historical prediction records for the user (`limit=7` default).

### 4. `GET /ml/model-info`
Returns public metadata, algorithm details, and evaluation metrics.

### 5. `POST /ml/retrain`
Triggers automated retraining, refreshes the `.joblib` package, and hot-reloads the active predictor.

---

## 8. Retraining Workflow

To retrain the model on updated datasets:
```bash
# Direct CLI execution:
cd backend
python ml/train_model.py

# Or evaluate against dataset:
python ml/evaluate.py
```

---

## 9. Limitations of Synthetic Data & Future Enhancements

1. **Synthetic Cold-Start:** Initial model training utilizes synthetic profiles calibrated to developer behavioral archetypes. As users accumulate real-world telemetry in MySQL, the retraining pipeline adapts model weights to actual developer habits.
2. **Individual Variability:** Developers vary in their peak flow states (e.g. night owls vs early birds). Future iterations can support user-clustered fine-tuning or personal bias calibration.
