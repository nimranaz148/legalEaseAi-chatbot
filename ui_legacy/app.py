"""
Streamlit Web Frontend for Legal Assistant RAG.
Interacts exclusively via HTTP REST with FastAPI backend.
Zero direct core imports; 100% Law-agnostic.
"""
import os
import requests
import streamlit as st

API_URL = os.getenv("API_URL", "http://127.0.0.1:8000")

st.set_page_config(
    page_title="Legal Assistant RAG",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling for Legal Assistant and RTL Urdu support
st.markdown("""
<style>
    .disclaimer-banner {
        background-color: #FFF3E0;
        border-left: 5px solid #FF9800;
        padding: 12px 16px;
        margin-bottom: 20px;
        border-radius: 4px;
        color: #E65100;
        font-weight: 500;
        font-size: 0.95rem;
    }
    .citation-card {
        background-color: #F1F8E9;
        border: 1px solid #C8E6C9;
        border-left: 4px solid #2E7D32;
        border-radius: 6px;
        padding: 12px;
        margin-top: 10px;
        margin-bottom: 8px;
    }
    .citation-title {
        color: #1B5E20;
        font-weight: 600;
        font-size: 0.95rem;
        margin-bottom: 4px;
    }
    .citation-quote {
        font-style: italic;
        color: #2E7D32;
        font-size: 0.9rem;
    }
    .rtl-text {
        direction: auto;
        text-align: start;
        font-size: 1.05rem;
        line-height: 1.6;
    }
</style>
""", unsafe_allow_html=True)


def check_backend_health():
    try:
        r = requests.get(f"{API_URL}/health", timeout=2)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


def fetch_laws_catalog():
    try:
        r = requests.get(f"{API_URL}/laws", timeout=3)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return []


def fetch_chunk_detail(law_id: str, section: str):
    try:
        r = requests.get(f"{API_URL}/chunks/{law_id}/{section}", timeout=3)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None


# Top Disclaimer Banner (Permanent)
st.markdown(
    '<div class="disclaimer-banner">'
    '⚠️ <b>Qanooni Disclaimer:</b> Yeh sirf maloomati hai, qanooni mashwara nahi. '
    'This system provides statutory informational references, not formal legal advice.'
    '</div>',
    unsafe_allow_html=True
)

st.title("⚖️ Legal Assistant RAG")
st.caption("AI-powered statutory search and grounding for Pakistani legal codes")

# Sidebar Configuration
backend_status = check_backend_health()
laws_catalog = fetch_laws_catalog()

with st.sidebar:
    st.header("Statute Filters")
    if backend_status:
        st.success(f"Backend: ONLINE ({backend_status.get('total_chunks', 0)} chunks)")
    else:
        st.error("Backend: OFFLINE. Please run `uvicorn api.main:app`")

    selected_law_ids = []
    sample_questions = []

    if laws_catalog:
        law_options = {item["law_id"]: f"{item['name']} ({item['year']}) [{item['chunk_count']} chunks]" for item in laws_catalog}
        selected = st.multiselect(
            "Select Statutes to Search",
            options=list(law_options.keys()),
            default=list(law_options.keys()),
            format_func=lambda x: law_options.get(x, x)
        )
        selected_law_ids = selected

        # Aggregate sample questions
        for item in laws_catalog:
            sample_questions.extend(item.get("examples", []))
    else:
        st.info("No indexed statutes available. Ingest a law via CLI first.")

    show_debug = st.toggle("Show Pipeline Debug Info", value=False)

    st.markdown("---")
    if sample_questions:
        st.subheader("💡 Sample Inquiries")
        for q in sample_questions[:5]:
            if st.button(q, key=f"btn_{q}"):
                st.session_state["prompt_input"] = q

    st.markdown("---")
    st.caption("Law-agnostic RAG engine powered by Qdrant & Gemini.")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

# Primary navigation tabs
tab_chat, tab_analytics = st.tabs(["💬 Legal Inquiry Chat", "📊 Corpus & Retrieval Analytics (D-001)"])

with tab_chat:
    # Display conversation history
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(f'<div class="rtl-text">{msg["content"]}</div>', unsafe_allow_html=True)
            # Render citations
            if msg.get("citations"):
                st.markdown("##### 📌 Statutory Citations:")
                for cit in msg["citations"]:
                    unit = cit.get("unit_label", "Section")
                    st.markdown(
                        f'<div class="citation-card">'
                        f'<div class="citation-title">{cit["law_name"]} {unit} {cit["section"]}: {cit["title"]} (Page {cit.get("page_start", "N/A")})</div>'
                        f'<div class="citation-quote">"{cit["quote"]}"</div>'
                        f'</div>',
                        unsafe_allow_html=True
                    )
                    with st.expander(f"View Full {unit} {cit['section']} Text"):
                        detail = fetch_chunk_detail(cit["id"].split(":")[0], cit["section"])
                        if detail:
                            st.text(detail.get("text", "No text body available."))
                        else:
                            st.info("Full section body could not be loaded from backend.")

            if msg.get("debug") and show_debug:
                with st.expander("🛠️ Pipeline Debug Trace"):
                    st.json(msg["debug"])

    # Chat input
    prompt = st.chat_input("Ask a legal question (English, Roman Urdu, or Urdu script)...")
    if "prompt_input" in st.session_state and st.session_state["prompt_input"]:
        prompt = st.session_state.pop("prompt_input")

    if prompt:
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt})
        with st.chat_message("user"):
            st.markdown(f'<div class="rtl-text">{prompt}</div>', unsafe_allow_html=True)

        with st.chat_message("assistant"):
            if not backend_status:
                error_response = "Backend server is currently offline. Please launch `uvicorn api.main:app`."
                st.error(error_response)
                st.session_state.messages.append({"role": "assistant", "content": error_response})
            else:
                with st.spinner("Searching Pakistani statutes and verifying citations..."):
                    try:
                        payload = {
                            "question": prompt,
                            "law_ids": selected_law_ids if selected_law_ids else None,
                            "debug": show_debug
                        }
                        r = requests.post(f"{API_URL}/ask", json=payload, timeout=30)
                        if r.status_code == 200:
                            data = r.json()
                            ans = data.get("answer", "")
                            cits = data.get("citations", [])
                            dbg = data.get("debug")

                            st.markdown(f'<div class="rtl-text">{ans}</div>', unsafe_allow_html=True)

                            if cits:
                                st.markdown("##### 📌 Statutory Citations:")
                                for cit in cits:
                                    st.markdown(
                                        f'<div class="citation-card">'
                                        f'<div class="citation-title">{cit["law_name"]} Section {cit["section"]}: {cit["title"]} (Page {cit.get("page_start", "N/A")})</div>'
                                        f'<div class="citation-quote">"{cit["quote"]}"</div>'
                                        f'</div>',
                                        unsafe_allow_html=True
                                    )
                                    with st.expander(f"View Full Section {cit['section']} Text"):
                                        detail = fetch_chunk_detail(cit["id"].split(":")[0], cit["section"])
                                        if detail:
                                            st.text(detail.get("text", "No text body available."))

                            if dbg and show_debug:
                                with st.expander("🛠️ Pipeline Debug Trace"):
                                    st.json(dbg)

                            st.session_state.messages.append({
                                "role": "assistant",
                                "content": ans,
                                "citations": cits,
                                "debug": dbg
                            })
                        else:
                            err_text = r.json().get("detail", r.text)
                            st.error(f"Error ({r.status_code}): {err_text}")
                    except Exception as e:
                        st.error(f"Request failed: {e}")

with tab_analytics:
    st.subheader("Corpus & Vector Index Analytics")
    st.caption("Live metrics reflecting vector storage, indexed statutes, and ingestion caches.")

    col1, col2, col3, col4 = st.columns(4)
    total_chunks = backend_status.get("total_chunks", 0) if backend_status else 0
    total_laws = len(laws_catalog) if laws_catalog else 0

    with col1:
        st.metric("Total Indexed Laws", f"{total_laws}")
    with col2:
        st.metric("Total Active Chunks", f"{total_chunks}")
    with col3:
        st.metric("Vector Dimension", "768-dim (Cosine)")
    with col4:
        health_status = "ONLINE" if backend_status else "OFFLINE"
        st.metric("Backend Status", health_status)

    st.markdown("---")
    st.markdown("#### Registered Statutes in Corpus")
    if laws_catalog:
        statutes_table = []
        for law in laws_catalog:
            statutes_table.append({
                "Law ID": law.get("law_id"),
                "Statute Title": law.get("name"),
                "Year": law.get("year"),
                "Indexed Chunks": law.get("chunk_count", 0),
                "Status": "ACTIVE (Indexed)" if law.get("chunk_count", 0) > 0 else "UNINDEXED"
            })
        st.table(statutes_table)
    else:
        st.info("No registered laws available. Check backend connection.")

    st.markdown("---")
    st.markdown("#### Architecture Guardrails & Verification")
    st.markdown("""
    - **Law-Agnostic Core**: Zero hardcoded statutes in codebase; all metadata dynamically loaded via `laws.yaml`.
    - **Citation Verification**: Every generated quote verified character-for-character before response rendering.
    - **Deterministic Hashing**: Point IDs generated via `uuid.uuid5(uuid.NAMESPACE_DNS, chunk.id)`.
    - **No-Data Threshold Gate**: Similarity cutoff (`score >= 0.45`) prevents hallucinations on out-of-scope inquiries.
    """)
