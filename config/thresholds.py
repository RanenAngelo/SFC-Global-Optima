"""DineIQ Analytics — documented analytical thresholds (SRS Steps 10/11, FR xxi).

All cut-offs are data-relative (percentiles / z-scores computed from the live
dataset at runtime) unless explicitly marked ABSOLUTE. Nothing here hard-codes
a per-item verdict: classifications always derive from computed metrics.
Tunable for the SRS §1.8.5 surprise-modification exercise.
"""
# -- Menu classification (Step 10): percentile bands over computed metrics ----
MENU_HIGH_DEMAND_PCT = 70.0      # units sold >= p70  -> "high demand"
MENU_LOW_DEMAND_PCT = 30.0       # units sold <= p30  -> "low demand"
MENU_HIGH_PROFIT_PCT = 70.0      # contribution margin >= p70 -> "high profitability"
MENU_LOW_PROFIT_PCT = 30.0
MENU_GOOD_RATING = 4.0           # ABSOLUTE (1-5 scale): rating >= 4.0 is "good"
MENU_POOR_RATING = 3.0           # ABSOLUTE: rating < 3.0 is "poor"
MENU_HIGH_WASTAGE_PCT = 75.0     # wastage % >= p75 -> "excessive wastage"
MENU_GOOD_REPEAT_PCT = 60.0      # repeat-purchase rate >= p60 -> "good repeat"
MENU_NEW_ITEM_DAYS = 30          # ABSOLUTE: introduced within N days -> "new item"

# -- Slow movers (Step 32) ----------------------------------------------------
SLOW_SALES_PCT = 25.0
SLOW_REPEAT_PCT = 25.0

# -- Anomalies (Steps 30/31): z-score / IQR bands ------------------------------
ANOMALY_ZSCORE = 3.0
ANOMALY_IQR_K = 1.5

# -- Price sensitivity (Step 26): |elasticity| bands ---------------------------
ELASTICITY_HIGH = 1.0            # |e| > 1  -> Highly Price Sensitive
ELASTICITY_MODERATE = 0.5        # 0.5 < |e| <= 1 -> Moderately Price Sensitive

# -- Churn risk (Step 36) -------------------------------------------------------
CHURN_RECENCY_DAYS = 60          # ABSOLUTE: no order in N days -> recency flag
