"""
Generic section-level statutory chunker.
Detects section headers, preserves illustrations/explanations, and splits oversized sections.
Zero hardcoded statute names.
"""
import re
from core.chunkers.base import BaseChunker
from core.schema import Chunk, LawConfig, PageResult


class SectionChunker(BaseChunker):
    def chunk(self, pages: list[PageResult], law_cfg: LawConfig, law_id: str) -> list[Chunk]:
        if not pages:
            return []

        # 1. Build concatenated text and page boundary map
        full_text = ""
        page_offsets: list[tuple[int, int, int]] = []  # (start_idx, end_idx, page_number)
        current_idx = 0

        for p in pages:
            ptxt = p.text + "\n\n"
            start = current_idx
            end = current_idx + len(ptxt)
            page_offsets.append((start, end, p.page))
            full_text += ptxt
            current_idx = end

        def get_page_for_offset(offset: int) -> int:
            for s, e, pno in page_offsets:
                if s <= offset < e:
                    return pno
            return page_offsets[-1][2] if page_offsets else 1

        # 2. Extract section pattern from options
        opts = law_cfg.chunker_options or {}
        pattern_str = opts.get(
            "section_pattern",
            r"^\s*(\d+[A-Z]{0,2})\.\s+((?:[^\n\.\?\:\u2014]+\n)?[^\n\.\?\:\u2014]+?)(?:\.\s*[\u2014\-]|[\.\?\:\u2014\-]{1,3})\s+"
        )
        max_tokens = int(opts.get("max_chunk_tokens", 600))
        max_chars = max_tokens * 4

        pattern = re.compile(pattern_str, re.MULTILINE)
        matches = list(pattern.finditer(full_text))

        chunks: list[Chunk] = []

        for idx, match in enumerate(matches):
            sec_num = match.group(1).strip()
            sec_title = match.group(2).strip().rstrip(".?:—–- ")

            start_char = match.start()
            end_char = matches[idx + 1].start() if idx + 1 < len(matches) else len(full_text)

            body_text = full_text[start_char:end_char].strip()

            p_start = get_page_for_offset(start_char)
            p_end = get_page_for_offset(max(start_char, end_char - 1))

            # Detect status (omitted / repealed)
            status = "active"
            lower_body = body_text.lower()
            if "omitted" in lower_body or "repealed" in lower_body:
                if len(body_text) < 300:  # Short text with repealed note
                    status = "omitted"

            # Check if chunk exceeds size and needs sub-section split
            if len(body_text) > max_chars:
                # Attempt to split on subsection markers like (1), (2), (a), (b)
                sub_pattern = re.compile(r"\n(?=\s*\(\d+\)\s+|\s*\([a-z]\)\s+)")
                parts = sub_pattern.split(body_text)
                if len(parts) > 1:
                    heading_prefix = f"{sec_num}. {sec_title}—\n"
                    for part_idx, part in enumerate(parts, 1):
                        part_content = part.strip()
                        if not part_content:
                            continue
                        if not part_content.startswith(sec_num):
                            part_content = heading_prefix + part_content

                        chunks.append(
                            Chunk(
                                id=f"{law_id}:{sec_num}#{part_idx}",
                                law_id=law_id,
                                law_name=law_cfg.name,
                                law_short=law_cfg.short,
                                year=law_cfg.year,
                                section=sec_num,
                                title=sec_title,
                                text=part_content,
                                page_start=p_start,
                                page_end=p_end,
                                source="text",
                                status=status,
                                version_date=law_cfg.version_date,
                                source_url=law_cfg.source_url
                            )
                        )
                    continue

            # Standard chunk
            chunks.append(
                Chunk(
                    id=f"{law_id}:{sec_num}",
                    law_id=law_id,
                    law_name=law_cfg.name,
                    law_short=law_cfg.short,
                    year=law_cfg.year,
                    section=sec_num,
                    title=sec_title,
                    text=body_text,
                    page_start=p_start,
                    page_end=p_end,
                    source="text",
                    status=status,
                    version_date=law_cfg.version_date,
                    source_url=law_cfg.source_url
                )
            )

        return chunks
