"""
문서 색인 만들기 (ingest.py) — 저장소: Chroma (chroma_db/ 폴더)

data/ 폴더의 .md, .txt 파일을 읽어 작은 조각으로 나누고,
각 조각을 숫자 목록(임베딩)으로 바꿔 Chroma 저장소(chroma_db/)에 넣습니다.

- 기본 실행(확인만): OpenAI를 부르지 않고 조각 수와 대략 토큰 수만 보여 줍니다.
- --run : 바뀐 파일만 골라 OpenAI 임베딩을 "한 번의 요청"으로 부릅니다.
- 바뀌지 않은 파일은 다시 임베딩하지 않고, 지워진 파일의 조각은 저장소에서 뺍니다.
"""

import argparse
import hashlib
import os
import sys
from pathlib import Path

# Chroma 가 사용 통계를 밖으로 보내지 않도록 끕니다 (개인 자료 보호)
os.environ.setdefault("ANONYMIZED_TELEMETRY", "False")

from dotenv import load_dotenv  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = BASE_DIR / "chroma_db"
COLLECTION = "muma_notes"

CHUNK_SIZE = 400       # 한 조각의 글자 수
CHUNK_OVERLAP = 50     # 앞 조각과 겹치는 글자 수

MAX_CHUNKS_PER_RUN = 300      # 비용 안전장치
MAX_TOKENS_PER_RUN = 20_000


def 읽을_파일_찾기() -> list[Path]:
    """data 폴더에서 .md, .txt 파일을 이름순으로 돌려줍니다."""
    return sorted(p for p in DATA_DIR.iterdir() if p.is_file() and p.suffix in {".md", ".txt"})


def 파일_지문(글: str) -> str:
    """파일 내용이 바뀌었는지 알아볼 수 있도록 짧은 지문(해시)을 만듭니다."""
    return hashlib.sha256(글.encode("utf-8")).hexdigest()[:16]


def 조각_나누기(글: str) -> list[str]:
    """긴 글을 CHUNK_SIZE 글자씩 자르되, 앞뒤가 CHUNK_OVERLAP 글자만큼 겹치게 합니다."""
    조각들 = []
    시작 = 0
    while 시작 < len(글):
        끝 = min(시작 + CHUNK_SIZE, len(글))
        내용 = 글[시작:끝].strip()
        if 내용:
            조각들.append(내용)
        if 끝 == len(글):
            break
        시작 = 끝 - CHUNK_OVERLAP
    return 조각들


def 대략_토큰_수(글자_수: int) -> int:
    """한국어·영어가 섞인 글은 글자 2개를 토큰 1개로 잡아 넉넉하게 계산합니다."""
    return max(1, 글자_수 // 2)


def 저장소_열기():
    """chroma_db 폴더의 Chroma 저장소를 엽니다 (없으면 새로 만듭니다)."""
    from langchain_chroma import Chroma
    from langchain_openai import OpenAIEmbeddings

    임베더 = OpenAIEmbeddings(model=os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small"))
    return Chroma(
        collection_name=COLLECTION,
        embedding_function=임베더,
        persist_directory=str(CHROMA_DIR),
        collection_metadata={"hnsw:space": "cosine"},  # 비슷함을 코사인 방식으로 잼
    )


def 저장된_지문_읽기(저장소) -> dict:
    """저장소에 이미 들어 있는 파일 이름별 지문을 돌려줍니다."""
    기록 = 저장소._collection.get(include=["metadatas"])
    지문들 = {}
    for 메타 in 기록["metadatas"] or []:
        지문들[메타["source"]] = 메타["hash"]
    return 지문들


STORE_JSON = BASE_DIR / "store" / "chunks.json"   # 배포용: 조각 글과 숫자 목록 (API 키 없음)


def 배포용_파일_저장(저장소) -> None:
    """Chroma 에 들어 있는 조각 글·출처·숫자 목록을 store/chunks.json 으로 저장합니다 (API 호출 없음)."""
    import json
    import unicodedata

    기록 = 저장소._collection.get(include=["embeddings", "documents", "metadatas"])
    조각들 = []
    for 번호, 글, 메타, 숫자 in zip(기록["ids"], 기록["documents"], 기록["metadatas"], 기록["embeddings"]):
        조각들.append({
            "id": 번호,
            "text": 글,
            "source": unicodedata.normalize("NFC", 메타["source"]),
            "hash": 메타["hash"],
            "chunk": 메타["chunk"],
            "embedding": [float(x) for x in 숫자],
        })
    STORE_JSON.parent.mkdir(exist_ok=True)
    STORE_JSON.write_text(json.dumps({"model": os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
                                      "chunks": 조각들}, ensure_ascii=False), encoding="utf-8")
    print(f"📦 배포용 파일 저장: store/chunks.json (조각 {len(조각들)}개)")


def main() -> None:
    """전체 순서: 파일 읽기 → 바뀐 것 고르기 → 안전 확인 → 임베딩 한 번 → 저장소에 넣기."""
    parser = argparse.ArgumentParser(description="data 폴더 문서를 Chroma 저장소로 만듭니다.")
    parser.add_argument("--run", action="store_true", help="실제로 OpenAI 임베딩을 호출합니다 (없으면 확인만 합니다)")
    args = parser.parse_args()

    load_dotenv(BASE_DIR / ".env")  # .env 내용은 출력하지 않고 환경 변수로만 올립니다

    파일_목록 = 읽을_파일_찾기()
    if not 파일_목록:
        print("❌ data 폴더에 .md 또는 .txt 파일이 없어요.")
        sys.exit(1)

    # 저장소 열기는 OpenAI를 부르지 않습니다 (실제 호출은 --run 일 때 add_texts 에서만 일어남)
    저장소 = 저장소_열기()
    이전_지문 = 저장된_지문_읽기(저장소)

    현재_이름들 = set()
    바뀐_파일 = []       # (파일 이름, 지문, 조각 목록)
    그대로 = 0
    for 파일 in 파일_목록:
        이름 = 파일.name
        현재_이름들.add(이름)
        글 = 파일.read_text(encoding="utf-8")
        지문 = 파일_지문(글)
        if 이전_지문.get(이름) == 지문:
            그대로 += 1
            continue
        바뀐_파일.append((이름, 지문, 조각_나누기(글)))

    지워진_파일 = [이름 for 이름 in 이전_지문 if 이름 not in 현재_이름들]
    바뀐_조각 = sum(len(조각들) for _, _, 조각들 in 바뀐_파일)
    예상_토큰 = sum(대략_토큰_수(len(c)) for _, _, 조각들 in 바뀐_파일 for c in 조각들)

    print(f"📄 문서 {len(파일_목록)}개: 그대로 {그대로}개, 바뀜 {len(바뀐_파일)}개, 지워짐 {len(지워진_파일)}개")
    print(f"🧩 이번에 새로 임베딩할 조각: {바뀐_조각}개")
    print(f"🧮 대략 토큰 수: 약 {예상_토큰}개 (상한 {MAX_TOKENS_PER_RUN}개)")
    print(f"🗄️ 저장소: Chroma · 폴더 {CHROMA_DIR.name}/ · 임베딩 모델 {os.environ.get('OPENAI_EMBED_MODEL', 'text-embedding-3-small')}")

    if not 바뀐_파일 and not 지워진_파일:
        print("✅ 바뀐 문서가 없어서 OpenAI를 부르지 않았어요.")
        배포용_파일_저장(저장소)   # 배포용 파일이 없거나 옛날 것이어도 다시 만들어 둠 (API 호출 없음)
        return

    if 바뀐_조각 > MAX_CHUNKS_PER_RUN or 예상_토큰 > MAX_TOKENS_PER_RUN:
        print("⛔ 안전 상한을 넘어서 멈췄어요. 문서를 줄이거나 상한을 먼저 의논해요.")
        sys.exit(1)

    if not args.run:
        print("ℹ️ 확인만 했어요 (OpenAI 호출 없음). 실제로 만들려면 --run 을 붙여 실행해 주세요.")
        return

    # 지워진 파일과 바뀐 파일의 옛 조각은 먼저 뺍니다
    for 이름 in 지워진_파일:
        저장소._collection.delete(where={"source": 이름})
    for 이름, _, _ in 바뀐_파일:
        저장소._collection.delete(where={"source": 이름})

    # 새 조각 추가: 임베딩 요청은 한 번에 묶여서 나갑니다
    글들, 메타들, 번호들 = [], [], []
    for 이름, 지문, 조각들 in 바뀐_파일:
        for 순서, 조각 in enumerate(조각들):
            글들.append(조각)
            메타들.append({"source": 이름, "hash": 지문, "chunk": 순서})
            번호들.append(f"{이름}#{순서}")
    if 글들:
        저장소.add_texts(texts=글들, metadatas=메타들, ids=번호들)

    총 = len(저장소._collection.get()["ids"])
    print(f"💾 저장 완료: Chroma 저장소에 조각 {총}개 (chroma_db/ 폴더)")
    배포용_파일_저장(저장소)


if __name__ == "__main__":
    main()
