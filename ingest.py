#!/usr/bin/env python3
"""
Legal Assistant RAG — Ingestion and Corpus Management CLI.
Law-agnostic entry point for extracting, cleaning, chunking, and indexing statutory PDFs.
"""
import argparse
import json
import logging
from pathlib import Path
import sys
import numpy as np
from core.config import get_settings, load_laws
from core.schema import PageResult
from core.extract import extract_pdf
from core.clean import clean_corpus
from core.chunkers import get_chunker
from core.llm import embed_texts
from core.store import VectorStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ingest")


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
                must=[models.FieldCondition(key="law_id", match=models.MatchValue(value=law_id))]
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
    print(f"{'LAW ID':<18} {'YEAR':<6} {'ENABLED':<9} {'CHUNKS':<14} {'TITLE':<30} {'PDF PATH'}")
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


def cmd_inspect(args: argparse.Namespace) -> int:
    """Dry run: extraction, cleaning, and chunking without Qdrant writes. Analyzes section gaps."""
    law_id = args.law
    laws = load_laws()
    if law_id not in laws:
        print(f"Error: Law '{law_id}' not found in laws.yaml", file=sys.stderr)
        return 1

    cfg = laws[law_id]
    pages = extract_pdf(cfg.pdf, law_id, page_range=cfg.page_range)
    cleaned = clean_corpus(pages, law_id, use_llm=False)
    chunker = get_chunker(cfg.chunker)
    chunks = chunker.chunk(cleaned, cfg, law_id)

    ocr_pages = sum(1 for p in pages if p.ocr_used)
    print(f"\nInspection Report for '{cfg.name}' ({law_id}):")
    print(f" - Total pages extracted: {len(pages)} (OCR used: {ocr_pages})")
    print(f" - Total chunks produced: {len(chunks)}")

    if chunks:
        print("\nFirst 3 Chunks:")
        for c in chunks[:3]:
            print(f"   [{c.id}] Section {c.section}: {c.title} ({len(c.text)} chars, pages {c.page_start}-{c.page_end})")

        print("\nLast 3 Chunks:")
        for c in chunks[-3:]:
            print(f"   [{c.id}] Section {c.section}: {c.title} ({len(c.text)} chars, pages {c.page_start}-{c.page_end})")

        # Sequence gap check
        section_nums = []
        for c in chunks:
            try:
                num = int("".join(filter(str.isdigit, c.section)))
                section_nums.append(num)
            except ValueError:
                pass

        if section_nums:
            section_set = set(section_nums)
            min_sec = min(section_nums)
            max_sec = max(section_nums)
            missing = [s for s in range(min_sec, max_sec + 1) if s not in section_set]
            if missing:
                print(f"\nMissing section numbers in sequence: {missing[:15]}{'...' if len(missing) > 15 else ''}")
            else:
                print("\nSection sequence check: Complete continuous sequence.")

    print("\nDry run completed successfully. No changes made to Qdrant.\n")
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    """Execute full ingestion pipeline for a law."""
    law_id = args.law
    laws = load_laws()
    if law_id not in laws:
        print(f"Error: Law '{law_id}' not found in laws.yaml", file=sys.stderr)
        return 1

    cfg = laws[law_id]
    stages = [s.strip() for s in (args.stages or "extract,clean,chunk,index").split(",")]
    force = bool(args.force)

    page_range = cfg.page_range
    if args.pages:
        parts = [int(p.strip()) for p in args.pages.split("-") if p.strip()]
        if len(parts) == 2:
            page_range = parts

    # 1. Extract
    pages = []
    if "extract" in stages or not Path(f"data/extracted/{law_id}.json").is_file():
        pages = extract_pdf(cfg.pdf, law_id, page_range=page_range, force=force)
    else:
        with open(f"data/extracted/{law_id}.json", "r", encoding="utf-8") as f:
            pages = [PageResult(**item) for item in json.load(f)]

    # 2. Clean
    cleaned = []
    if "clean" in stages or not Path(f"data/clean/{law_id}.json").is_file():
        cleaned = clean_corpus(pages, law_id, force=force)
    else:
        with open(f"data/clean/{law_id}.json", "r", encoding="utf-8") as f:
            cleaned = [PageResult(**item) for item in json.load(f)]

    # 3. Chunk
    chunker = get_chunker(cfg.chunker)
    chunks = chunker.chunk(cleaned, cfg, law_id)

    # Save chunks.jsonl
    chunks_path = Path("data/chunks") / f"{law_id}.jsonl"
    chunks_path.parent.mkdir(parents=True, exist_ok=True)
    with chunks_path.open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c.model_dump(), ensure_ascii=False) + "\n")
    print(f"Chunk stage: Saved {len(chunks)} chunks to {chunks_path}")

    # 4. Index
    if "index" in stages:
        embed_cache_path = Path("data/chunks") / f"{law_id}.embeddings.npy"
        if embed_cache_path.is_file() and not force:
            print(f"Loading cached embeddings from {embed_cache_path}...")
            embeddings = np.load(str(embed_cache_path))
        else:
            print(f"Generating embeddings for {len(chunks)} chunks...")
            chunk_texts = [f"{c.law_name} Section {c.section}: {c.title}\n{c.text}" for c in chunks]
            embeddings = embed_texts(chunk_texts, task_type="RETRIEVAL_DOCUMENT")
            np.save(str(embed_cache_path), embeddings)
            print(f"Cached embeddings to {embed_cache_path}")

        print("Upserting vectors and payloads into Qdrant...")
        with VectorStore() as store:
            store.upsert_chunks(chunks, embeddings)

    print(f"\nPipeline successfully completed for law '{law_id}'.\n")
    return 0


def cmd_delete(args: argparse.Namespace) -> int:
    """Deletes a law's vectors from Qdrant."""
    law_id = args.law
    with VectorStore() as store:
        store.delete_by_law(law_id)
    print(f"Successfully deleted all indexed chunks for law '{law_id}'.")
    return 0


def cmd_eval(args: argparse.Namespace) -> int:
    """Run evaluation benchmark queries against retrieved chunks and measure Hit@5, citation, and refusal metrics."""
    law_id = args.law
    eval_file = Path("evals") / f"{law_id}.jsonl"
    if not eval_file.is_file():
        print(f"Error: Evaluation dataset {eval_file} not found.", file=sys.stderr)
        return 1

    from core.retrieve import retrieve_relevant_chunks
    from core.answer import generate_answer

    with eval_file.open("r", encoding="utf-8") as f:
        cases = [json.loads(line) for line in f if line.strip()]

    print(f"\n===============================================================================")
    print(f" BENCHMARK EVALUATION SUITE: {law_id.upper()} ({len(cases)} cases)")
    print(f"===============================================================================")

    in_scope_cases = [c for c in cases if c.get("type") == "in_scope"]
    out_of_scope_cases = [c for c in cases if c.get("type") == "out_of_scope"]

    in_scope_hits = 0
    refusals_correct = 0

    for i, c in enumerate(cases, 1):
        q = c["q"]
        expected = c.get("expected_sections", [])
        is_in_scope = c.get("type") == "in_scope"

        chunks, debug_info, rewritten = retrieve_relevant_chunks(q, law_ids=[law_id])
        retrieved_sections = [ch.section for ch in chunks]

        if is_in_scope:
            hit = any(str(exp) in retrieved_sections for exp in expected)
            if hit:
                in_scope_hits += 1
            status = "HIT " if hit else "MISS"
            print(f"[{i:02d}] IN-SCOPE | {status} | Exp: {str(expected):<8} | Got: {str(retrieved_sections[:3]):<16} | {q[:40]}")
        else:
            if not chunks:
                refusals_correct += 1
                status = "GATE-REFUSAL"
            else:
                resp = generate_answer(q, chunks)
                if not resp.found:
                    refusals_correct += 1
                    status = "LLM-REFUSAL "
                else:
                    status = "FALSE-POSITIVE"
            print(f"[{i:02d}] OOS      | {status:<12} | Exp: []       | Got: {str(retrieved_sections[:3]):<16} | {q[:40]}")

    hit_rate = (in_scope_hits / len(in_scope_cases) * 100) if in_scope_cases else 100.0
    refusal_rate = (refusals_correct / len(out_of_scope_cases) * 100) if out_of_scope_cases else 100.0

    print("-------------------------------------------------------------------------------")
    print(f"Benchmark Summary for '{law_id}':")
    print(f" - In-scope Queries:   {len(in_scope_cases)}")
    print(f" - Hit@5 (Target >=85%): {in_scope_hits}/{len(in_scope_cases)} ({hit_rate:.1f}%)")
    print(f" - Out-of-scope Queries: {len(out_of_scope_cases)}")
    print(f" - Refusal Accuracy:   {refusals_correct}/{len(out_of_scope_cases)} ({refusal_rate:.1f}%)")
    print("-------------------------------------------------------------------------------")

    if hit_rate >= 85.0:
        print(" Evaluation benchmark PASSED.\n")
        return 0
    else:
        print(f" Evaluation benchmark WARNING: Hit@5 {hit_rate:.1f}% below 85% target.\n", file=sys.stderr)
        return 1


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
