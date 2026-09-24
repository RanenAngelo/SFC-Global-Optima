"""Shared Spark I/O: load all 11 tables with explicit schemas, persist cleaned
and integrated outputs. Used by every spark_jobs stage so ingestion stays DRY.
"""
from pathlib import Path

from spark_jobs import schemas as S


def load_tables(spark, data_dir: Path) -> dict:
    dfs = {}
    for table, (fname, schema, _pk) in S.TABLES.items():
        dfs[table] = (spark.read.schema(schema)
                      .option("header", True)
                      .option("mode", "PERMISSIVE")
                      .option("timestampFormat", "yyyy-MM-dd HH:mm:ss")
                      .option("dateFormat", "yyyy-MM-dd")
                      .csv(str(data_dir / fname)))
    return dfs


def write_parquet(df, path: Path, partition_by=None):
    w = df.write.mode("overwrite")
    if partition_by:
        w = w.partitionBy(*partition_by)
    w.parquet(str(path))
