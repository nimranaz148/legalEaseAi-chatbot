#!/usr/bin/env python3
"""
Legal Assistant RAG — Ingestion and Corpus Management CLI.
Law-agnostic entry point for extracting, cleaning, chunking, and indexing statutory PDFs.
"""
import argparse
import sys
from pathlib import Path
from core.config import get_settings, load_laws


def get_indexed_chunk_count(law_id: str) -> int:
    """Check Qdrant local collection for existing chunks of a law, safely handling absence."""
    settings = get_settings()
    qdrant_path = Path(settings.QDRANT_PATH)
    if not qdrant_path.is_dir():
        return 0

    try:
        from qdrant_client import QdrantClient
        from qdrant_client.http import models

        client = QdrantClient(path=str(qdrant_path))
        collections = client.get_collections().collections
        exists = any(c.name == settings.COLLECTION_NAME for c in collections)
        if not exists:
            client.close()
            return 0

        res = client.count(
            collection_name=settings.COLLECTION_NAME,
            count_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="law_id",
                        match=models.MatchValue(value=law_id)
                    )
                ]
            ),
            exact=True
        )
        client.close()
        return res.count
    except Exception:
        return 0


def cmd_list(args: argparse.Namespace) -> int:
    """List all laws registered in laws.yaml with enabled flag and index status."""
    try:
        laws = load_laws()
    except Exception as e:
        print(f"Error loading laws registry: {e}", file=sys.stderr)
        return 1

    print("\nRegistered Statutory Codes:")
    print(f"{'LAW ID':<18} {'YEAR':<6} {'ENABLED':<9} {'CHUNKS':<8} {'TITLE':<35} {'PDF PATH'}")
    print("-" * 105)

    for law_id, cfg in laws.items():
        count = get_indexed_chunk_count(law_id)
        enabled_str = "YES" if cfg.enabled else "NO"
        chunk_str = str(count) if count > 0 else "0 (unindexed)"
        pdf_exists = " [file found]" if Path(cfg.pdf).is_file() else " [missing PDF]"
        print(f"{law_id:<18} {cfg.year:<6} {enabled_str:<9} {chunk_str:<14} {cfg.name:<30} {cfg.pdf}{pdf_exists}")

    print("-" * 105)
    print(f"Total registered laws: {len(laws)}\n")
    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    """Print per-law chunk counts and collection status."""
    settings = get_settings()
    laws = load_laws()
    print(f"\nQdrant Collection Status: '{settings.COLLECTION_NAME}' (Local Path: {settings.QDRANT_PATH})")
    print(f"Embedding Dimensions: {settings.EMBED_DIM}")
    print("-" * 60)
    total_chunks = 0
    for law_id, cfg in laws.items():
        count = get_indexed_chunk_count(law_id)
        total_chunks += count
        print(f" - {cfg.name} ({law_id}): {count} chunks indexed")
    print("-" * 60)
    print(f"Total Indexed Chunks: {total_chunks}\n")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    print(f"Ingestion pipeline execution for law '{args.law}' will be configured in Phase 1.")
    return 0


def cmd_inspect(args: argparse.Namespace) -> int:
    print(f"Inspection tool for law '{args.law}' will be configured in Phase 1.")
    return 0


def cmd_delete(args: argparse.Namespace) -> int:
    print(f"Deletion tool for law '{args.law}' will be configured in Phase 1.")
    return 0


def cmd_eval(args: argparse.Namespace) -> int:
    print(f"Evaluation runner for law '{args.law}' will be configured in Phase 3.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Legal Assistant RAG — Ingestion Pipeline CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # list
    p_list = subparsers.add_parser("list", help="List registered laws and index status")
    p_list.set_defaults(func=cmd_list)

    # stats
    p_stats = subparsers.add_parser("stats", help="Display vector store and corpus statistics")
    p_stats.set_defaults(func=cmd_stats)

    # run
    p_run = subparsers.add_parser("run", help="Run ingestion stages for a law")
    p_run.add_argument("--law", required=True, help="Target law_id")
    p_run.add_argument("--stages", help="Comma-separated stages: extract,clean,chunk,index")
    p_run.add_argument("--force", action="store_true", help="Ignore disk cache and recompute")
    p_run.add_argument("--pages", help="Override page range (e.g. 1-30)")
    p_run.set_defaults(func=cmd_run)

    # inspect
    p_inspect = subparsers.add_parser("inspect", help="Dry run inspection of chunking and detection")
    p_inspect.add_argument("--law", required=True, help="Target law_id")
    p_inspect.set_defaults(func=cmd_inspect)

    # delete
    p_delete = subparsers.add_parser("delete", help="Delete a law's points from Qdrant")
    p_delete.add_argument("--law", required=True, help="Target law_id")
    p_delete.set_defaults(func=cmd_delete)

    # eval
    p_eval = subparsers.add_parser("eval", help="Run evaluation benchmark cases")
    p_eval.add_argument("--law", required=True, help="Target law_id")
    p_eval.set_defaults(func=cmd_eval)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
