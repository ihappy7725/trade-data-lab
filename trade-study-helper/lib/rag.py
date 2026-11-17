"""
Muma 의 답변 흐름 (lib/rag.py) — 무역 전문 챗봇

흐름 (LangGraph):
  찾기 → 관련 조각이 충분하면 → 답하기 (노트 근거로 답)
       → 부족하고 다시 찾기 2회 미만이면 → 다시 쓰기(무역 용어 짝말) → 찾기
       → 그래도 부족하면 → 일반 답하기 (무역 전문가 관점으로 답)

화면에는 답만 보여 줍니다 (출처·검색 과정은 표시하지 않음).
비용: 질문마다 임베딩 1회 + 답변 1회가 기본. 인사말은 AI를 부르지 않습니다.
"""

import json
import os
import unicodedata
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

BASE_DIR = Path(__file__).resolve().parent.parent
TERMS_PATH = BASE_DIR / "lib" / "terms.json"
CHUNKS_PATH = BASE_DIR / "store" / "chunks.json"   # ingest.py 가 만든 조각 글·숫자 목록 (배포용)
COLLECTION = "muma_notes"

TOP_K = 4               # 찾을 조각 개수
MIN_SCORE = 0.30        # 이 점수 이상이면 노트 근거로 답함
MAX_REWRITES = 2        # 다시 찾기 최대 횟수

_저장소_캐시 = None

인사말 = {"ㅎㅇ", "ㅎㅎ", "안녕", "안녕하세요", "안녕하세요!", "하이", "hi", "hello", "헬로", "반가워", "반갑습니다"}
인사_답 = ("안녕하세요! 저는 무역 전문 챗봇 Muma예요.\n"
          "무역 용어, 서류, 결제 조건 등 무엇이든 물어보세요.")


class 상태(TypedDict):
    """흐름 안에서 함께 들고 다니는 정보입니다."""
    question: str
    query: str
    rewrites: int
    바뀜: bool
    hits: list
    answer: str


def 저장소_열기():
    """store/chunks.json 을 읽어 메모리 안의 Chroma 저장소를 한 번만 만듭니다 (디스크 쓰기 없음, 시작 시 API 호출 없음)."""
    global _저장소_캐시
    if _저장소_캐시 is not None:
        return _저장소_캐시
    if not CHUNKS_PATH.exists():
        raise RuntimeError("문서 저장 파일(store/chunks.json)이 없어요. 먼저 ingest.py --run 으로 만들어 주세요.")

    os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")  # 사용 통계 전송 끔
    import chromadb
    from langchain_chroma import Chroma
    from langchain_openai import OpenAIEmbeddings

    자료 = json.loads(CHUNKS_PATH.read_text(encoding="utf-8"))
    임베더 = OpenAIEmbeddings(model=자료.get("model", "text-embedding-3-small"))
    저장소 = Chroma(
        collection_name=COLLECTION,
        embedding_function=임베더,
        client=chromadb.EphemeralClient(),
        collection_metadata={"hnsw:space": "cosine"},
    )
    조각들 = 자료["chunks"]
    저장소._collection.add(
        ids=[c["id"] for c in 조각들],
        embeddings=[c["embedding"] for c in 조각들],
        documents=[c["text"] for c in 조각들],
        metadatas=[{"source": c["source"], "hash": c["hash"], "chunk": c["chunk"]} for c in 조각들],
    )
    _저장소_캐시 = 저장소
    return 저장소


def 용어_사전_읽기() -> dict:
    """lib/terms.json 의 무역 용어 동의어 사전을 읽습니다."""
    사전 = json.loads(TERMS_PATH.read_text(encoding="utf-8"))
    return {k: v for k, v in 사전.items() if not k.startswith("_")}


def 답변_만들기(질문: str, 조각들: list) -> str:
    """노트 조각이 있으면 그 내용을 근거로, 없으면 무역 전문가 관점으로 짧게 답합니다 (AI 호출 1회)."""
    from langchain_openai import ChatOpenAI

    if 조각들:
        근거 = "\n\n".join(c["text"] for c in 조각들)
        지시 = (
            "너는 무역 전문 챗봇 Muma야. 아래 [근거]를 바탕으로 한국어로 3문장 이내로 간결하게 답해. "
            "근거에 없는 부분은 무역 지식으로 보충해도 돼. "
            "출처, 파일 이름, '노트', '일반 지식' 같은 말은 쓰지 마. 답만 써."
        )
        메시지 = [("system", 지시), ("human", f"[근거]\n{근거}\n\n[질문]\n{질문}")]
    else:
        지시 = (
            "너는 무역 전문 챗봇 Muma야. 한국어로 3문장 이내로 간결하게 답해. "
            "무역과 관련된 질문이면 무역 관점에서 설명하고, 무역과 무관한 질문도 답할 수 있으면 답해. "
            "출처, 파일 이름, '일반 지식' 같은 말은 쓰지 마. 답만 써."
        )
        메시지 = [("system", 지시), ("human", 질문)]

    모델 = ChatOpenAI(
        model=os.environ.get("OPENAI_MODEL", "gpt-6-luna"),
        # 이 모델은 temperature 값을 바꾸지 못해서 기본값을 씁니다
        max_tokens=300,  # 답변 길이 상한 (비용 절약)
    )
    응답 = 모델.invoke(메시지)
    return str(응답.content).strip()


# ---- LangGraph 노드들 ----

def 노드_찾기(state: 상태) -> dict:
    """질문(또는 바꾼 질문)으로 저장소에서 관련 조각 TOP_K 개를 찾습니다."""
    저장소 = 저장소_열기()
    결과 = 저장소.similarity_search_with_relevance_scores(state["query"], k=TOP_K)
    hits = []
    for 조각, 점수 in 결과:
        hits.append({
            "source": unicodedata.normalize("NFC", 조각.metadata["source"]),
            "text": 조각.page_content,
            "score": round(float(점수), 4),
        })
    return {"hits": hits}


def 노드_다시_쓰기(state: 상태) -> dict:
    """무역 용어 사전으로 질문에 짝말을 덧붙입니다 (AI 호출 없음)."""
    사전 = 용어_사전_읽기()
    덧붙임 = []
    for 용어, 짝말들 in 사전.items():
        if 용어.lower() in state["question"].lower():
            덧붙임.extend(짝말들)
    새_질문 = state["query"] + " " + " ".join(덧붙임) if 덧붙임 else state["query"]
    return {"query": 새_질문, "rewrites": state["rewrites"] + 1, "바뀜": bool(덧붙임)}


def 노드_답하기(state: 상태) -> dict:
    """찾은 노트 조각을 근거로 답합니다."""
    return {"answer": 답변_만들기(state["question"], state["hits"])}


def 노드_일반_답하기(state: 상태) -> dict:
    """노트에 근거가 부족하면 무역 전문가 관점으로 답합니다."""
    return {"answer": 답변_만들기(state["question"], [])}


def 갈래_정하기(state: 상태) -> str:
    """찾은 조각이 충분한지 점수로 판단해서 다음 노드를 고릅니다 (AI 호출 없음)."""
    if state["hits"] and state["hits"][0]["score"] >= MIN_SCORE:
        return "답하기"
    if state["rewrites"] < MAX_REWRITES and state.get("바뀜", True):
        return "다시_쓰기"
    return "일반_답하기"


def 흐름_만들기():
    """노드와 갈래를 연결해 LangGraph 흐름을 만들고 컴파일합니다."""
    그래프 = StateGraph(상태)
    그래프.add_node("찾기", 노드_찾기)
    그래프.add_node("다시_쓰기", 노드_다시_쓰기)
    그래프.add_node("답하기", 노드_답하기)
    그래프.add_node("일반_답하기", 노드_일반_답하기)
    그래프.add_edge(START, "찾기")
    그래프.add_conditional_edges("찾기", 갈래_정하기, {
        "답하기": "답하기",
        "다시_쓰기": "다시_쓰기",
        "일반_답하기": "일반_답하기",
    })
    그래프.add_edge("다시_쓰기", "찾기")
    그래프.add_edge("답하기", END)
    그래프.add_edge("일반_답하기", END)
    return 그래프.compile()


_흐름 = None


def 질문에_답하기(질문: str) -> dict:
    """화면에서 받은 질문 한 개를 흐름에 넣고 답을 돌려줍니다 (출처·과정은 화면에 쓰지 않음)."""
    global _흐름
    if 질문.strip().lower() in 인사말:
        return {"answer": 인사_답, "sources": [], "rewrites": 0, "hits": []}
    if _흐름 is None:
        _흐름 = 흐름_만들기()
    결과 = _흐름.invoke({
        "question": 질문,
        "query": 질문,
        "rewrites": 0,
        "바뀜": True,
        "hits": [],
        "answer": "",
    })
    return {
        "answer": 결과["answer"],
        "sources": [],
        "rewrites": 결과["rewrites"],
        "hits": [],
    }
