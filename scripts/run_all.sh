#!/usr/bin/env bash
# DineIQ full refresh: Python pipeline (Steps 4b-41) + serving reload.
# Usage: bash scripts/run_all.sh [--spark]   (--spark also re-runs Spark Steps 3-8,12)
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "${1:-}" = "--spark" ]; then
  export JAVA_HOME="${JAVA_HOME:-$(python3 -c 'import jdk4py; print(jdk4py.JAVA_HOME)' 2>/dev/null || echo '')}"
  python3 -m spark_jobs.ingest
  python3 -m spark_jobs.data_quality
  python3 -m spark_jobs.cleaning
  python3 -m spark_jobs.integrate
  python3 -m spark_jobs.features
  python3 -m spark_jobs.eda
fi

python3 -m python_pipeline.cleaning
python3 -m python_pipeline.integrate
python3 -m python_pipeline.features
python3 -m python_pipeline.profitability
python3 -m python_pipeline.classify_menu
python3 -m python_pipeline.segmentation
python3 -m python_pipeline.basket
python3 -m python_pipeline.peaks
python3 -m python_pipeline.forecast --horizon 28
python3 -m python_pipeline.wastage
python3 -m python_pipeline.pricing
python3 -m python_pipeline.promotions
python3 -m python_pipeline.ratings
python3 -m python_pipeline.anomalies
python3 -m python_pipeline.slow_movers
python3 -m python_pipeline.locations
python3 -m python_pipeline.channels
python3 -m python_pipeline.churn
python3 -m python_pipeline.recommend
python3 -m python_pipeline.whatif
python3 -m python_pipeline.load_serving

if [ "${1:-}" = "--spark" ]; then
  python3 -m spark_jobs.mllib_models
  python3 -m python_pipeline.models
  python3 -m python_pipeline.dual_compare
fi
echo "REFRESH_COMPLETE"
