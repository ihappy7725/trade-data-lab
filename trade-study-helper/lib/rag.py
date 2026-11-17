"""
Muma 의 답변 흐름 (lib/rag.py)

흐름 (LangGraph):
  retrieve → (충분하면) generate → 답 + 출처
           → (부족하고 재검색 2회 미만) rewrite → retrieve 다시
           → (재검색 2회 후에도 부족) refuse → "문서에서 찾지 못했어요"

비용 아끼기:
- 질문마다 임베딩 1회 (질문 문장만), 답변 호출 1회가 기본입니다.
- 문서는 ingest.py 가 만든 store/chunks.json 을 읽어 메모리 Chroma 에서 찾기만 합니다 (다시 임베딩하지 않음).
- 관련 조각이 없으면 답변 호출 없이 거절합니다.
- 프롬프트와 답변 길이를 짧게 제한합니다.
"""

import json
import os
import unicodedata
from pathlib import Path
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

BASE_DIR = Path(__file__).resolve().parent.parent
COLLECTION = "muma_notes"
TERMS_PATH = BASE_DIR / "lib" / "terms.json"

TOP_K = 4               # 찾을 조각 개수
MIN_SCORE = 0.30        # 이 점수 이상이면 "관련 있음" (실제 질문으로 조정 예정)
MAX_REWRITES = 2        # 다시 찾기 최대 횟수
REFUSAL = "문서에서 찾지 못했어요."


class 상태(TypedDict):
    """흐름 안에서 함께 들고 다니는 정보입니다."""
    question: str
    query: str
    rewrites: int
    바뀜: bool
    hits: list
    answer: str
    sources: list


CHUNKS_PATH = BASE_DIR / "store" / "chunks.json"   # ingest.py 가 만든 조각 글·숫자 목록 (배포용)
_저장소_캐시 = None


def 저장소_열기():
    """store/chunks.json 을 읽어 메모리 안의 Chroma 저장소를 한 번만 만듭니다.

    디스크에 쓰지 않고(EphemeralClient), 숫자 목록은 이미 있으므로 OpenAI를 부르지 않습니다.
    Vercel 같은 서버에서도 그대로 동작하도록 한 방식입니다.
    """
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
        embeddings=[c["embedding"] for c in 조각들],   # 숫자 목록은 저장된 것을 그대로 씀
        documents=[c["text"] for c in 조각들],
        metadatas=[{"source": c["source"], "hash": c["hash"], "chunk": c["chunk"]} for c in 조각들],
    )
    _저장소_캐시 = 저장소
    return 저장소


def 용어_사전_읽기() -> dict:
    """lib/terms.json 의 무역 용어 동의어 사전을 읽습니다."""
    사전 = json.loads(TERMS_PATH.read_text(encoding="utf-8"))
    return {k: v for k, v in 사전.items() if not k.startswith("_")}


def 코사인_유사도(a: list, b: list) -> float:
    """두 숫자 목록이 얼마나 같은 방향인지 0~1 사이 점수로 계산합니다."""
    내적 = sum(x * y for x, y in zip(a, b))
    길이a = math.sqrt(sum(x * x for x in a))
    길이b = math.sqrt(sum(y * y for y in b))
    if 길이a == 0 or 길이b == 0:
        return 0.0
    return 내적 / (길이a * 길이b)


def 답변_만들기(질문: str, 조각들: list) -> str:
    """찾은 조각만 근거로 짧게 답하도록 AI에게 부탁합니다 (답변 호출 1회)."""
    from langchain_openai import ChatOpenAI

    근거 = "\n\n".join(f"[{c['source']}]\n{c['text']}" for c in 조각들)
    지시 = (
        "너는 무역 공부 도우미 Muma야. 아래 [근거]만 보고 한국어로 3문장 이내로 답해. "
        "근거에 질문과 관련된 내용이 조금이라도 있으면 그 내용으로 답해. "
        "근거에 아예 없을 때만 추측하지 말고 '문서에서 찾지 못했어요.'라고만 답해."
    )
    모델 = ChatOpenAI(
        model=os.environ.get("OPENAI_MODEL", "gpt-6-luna"),
        # 이 모델은 temperature(답변 흔들림 조절) 값을 바꾸지 못해서 기본값을 씁니다
        max_tokens=300,  # 답변 길이 상한 (비용 절약)
    )
    응답 = 모델.invoke([
        ("system", 지시),
        ("human", f"[근거]\n{근거}\n\n[질문]\n{질문}"),
    ])
    return str(응답.content).strip()


# ---- LangGraph 노드들 ----

def 노드_찾기(state: 상태) -> dict:
    """질문(또는 바꾼 질문)으로 Chroma 저장소에서 관련 조각 TOP_K 개를 찾습니다."""
    저장소 = 저장소_열기()
    결과 = 저장소.similarity_search_with_relevance_scores(state["query"], k=TOP_K)
    hits = []
    for 조각, 점수 in 결과:
        # 맥의 한글 파일 이름(NFD)을 화면용 표준 형태(NFC)로 맞춤
        출처 = unicodedata.normalize("NFC", 조각.metadata["source"])
        hits.append({"source": 출처, "text": 조각.page_content, "score": round(float(점수), 4)})
    return {"hits": hits}


def 노드_다시_쓰기(state: 상태) -> dict:
    """무역 용어 사전으로 질문에 짝말을 덧붙입니다 (AI 호출 없음)."""
    사전 = 용어_사전_읽기()
    덧붙임 = []
    for 용어, 짝말들 in 사전.items():
        if 용어.lower() in state["question"].lower():
            덧붙임.extend(짝말들)
    새_질문 = state["query"] + " " + " ".join(덧붙임) if 덧붙임 else state["query"]
    # 짝말이 하나도 없었으면 다시 찾아도 같으므로 바뀜=False 로 표시
    return {"query": 새_질문, "rewrites": state["rewrites"] + 1, "바뀜": bool(덧붙임)}


def 노드_답하기(state: 상태) -> dict:
    """찾은 조각으로 답을 만들고, 실제로 쓴 출처 파일명만 적습니다."""
    답 = 답변_만들기(state["question"], state["hits"])
    # AI가 "찾지 못했어요"라고 답했다면 출처를 붙이지 않습니다 (근거를 쓰지 않았으므로)
    if "찾지 못했어요" in 답:
        return {"answer": REFUSAL, "sources": []}
    출처 = sorted({h["source"] for h in state["hits"]})
    return {"answer": 답, "sources": 출처}


def 노드_거절하기(state: 상태) -> dict:
    """관련 문서가 없으면 AI를 부르지 않고 정해진 말로 거절합니다."""
    return {"answer": REFUSAL, "sources": []}


def 갈래_정하기(state: 상태) -> str:
    """찾은 조각이 충분한지 점수로 판단해서 다음 노드를 고릅니다 (AI 호출 없음)."""
    충분 = bool(state["hits"]) and state["hits"][0]["score"] >= MIN_SCORE
    if 충분:
        return "답하기"
    if state["rewrites"] < MAX_REWRITES and state.get("바뀜", True):
        return "다시_쓰기"
    return "거절하기"


def 흐름_만들기():
    """노드와 갈래를 연결해 LangGraph 흐름을 만들고 컴파일합니다."""
    그래프 = StateGraph(상태)
    그래프.add_node("찾기", 노드_찾기)
    그래프.add_node("다시_쓰기", 노드_다시_쓰기)
    그래프.add_node("답하기", 노드_답하기)
    그래프.add_node("거절하기", 노드_거절하기)
    그래프.add_edge(START, "찾기")
    그래프.add_conditional_edges("찾기", 갈래_정하기, {
        "답하기": "답하기",
        "다시_쓰기": "다시_쓰기",
        "거절하기": "거절하기",
    })
    그래프.add_edge("다시_쓰기", "찾기")
    그래프.add_edge("답하기", END)
    그래프.add_edge("거절하기", END)
    return 그래프.compile()


_흐름 = None


def 질문에_답하기(질문: str) -> dict:
    """화면에서 받은 질문 한 개를 흐름에 넣고 답과 출처를 돌려줍니다."""
    global _흐름
    if _흐름 is None:
        _흐름 = 흐름_만들기()
    결과 = _흐름.invoke({
        "question": 질문,
        "query": 질문,
        "rewrites": 0,
        "바뀜": True,
        "hits": [],
        "answer": "",
        "sources": [],
    })
    return {
        "answer": 결과["answer"],
        "sources": 결과["sources"],
        "rewrites": 결과["rewrites"],
        "hits": [{"source": h["source"], "text": h["text"], "score": h["score"]} for h in 결과["hits"]],
    }
