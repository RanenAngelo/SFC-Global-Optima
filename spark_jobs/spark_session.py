"""Spark session factory (SRS Steps 3/6/12, FR xii/xvi/xvii).

Resolves Java 17 via jdk4py when no system Java exists (sandbox-friendly),
otherwise honours JAVA_HOME. Single entry point so every Spark job, test, and
monitoring hook shares one configuration.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config.settings import SPARK_DRIVER_MEMORY, SPARK_MASTER  # noqa: E402


def resolve_java_home() -> str:
    if os.environ.get("JAVA_HOME"):
        return os.environ["JAVA_HOME"]
    try:
        import jdk4py
        os.environ["JAVA_HOME"] = str(jdk4py.JAVA_HOME)
        return str(jdk4py.JAVA_HOME)
    except ImportError:
        raise RuntimeError("No JAVA_HOME and jdk4py not installed; install Java 17+")


def get_spark(app_name: str = "dineiq", master: str | None = None,
              shuffle_partitions: int = 8):
    from pyspark.sql import SparkSession
    resolve_java_home()
    return (SparkSession.builder
            .master(master or SPARK_MASTER)
            .appName(app_name)
            .config("spark.driver.memory", SPARK_DRIVER_MEMORY)
            .config("spark.sql.shuffle.partitions", str(shuffle_partitions))
            .config("spark.ui.enabled", "false")
            .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
            .getOrCreate())
