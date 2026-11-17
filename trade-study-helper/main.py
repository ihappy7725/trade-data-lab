"""
Muma 웹 서버 (main.py)

- 화면(public/ 폴더의 HTML·CSS·JS)을 보여 줍니다.
- POST /api/chat : 질문을 받아 답과 출처를 돌려줍니다.
- GET  /api/docs : 색인에 들어 있는 문서 이름 목록을 돌려줍니다.

실행: .venv/bin/uvicorn main:app --reload  → http://127.0.0.1:8000
"""

import os
import unicodedata
from datetime import date
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")  # .env 내용은 출력하지 않고 환경 변수로만 올립니다

MAX_QUESTION_LENGTH = 300                                    # 질문 글자 수 상한
DAILY_LIMIT = int(os.environ.get("DAILY_QUESTION_LIMIT", "50"))  # 하루 질문 상한 (비용 안전장치)

app = FastAPI(title="Muma")

_오늘 = {"날짜": None, "개수": 0}


class 질문본문(BaseModel):
    """화면에서 보내는 질문 한 개입니다."""
    question: str = Field(..., min_length=1, max_length=MAX_QUESTION_LENGTH)


def 하루_한도_확인():
    """오늘 질문 수가 상한을 넘었는지 확인하고, 넘었으면 쉬운 말로 멈춥니다."""
    오늘날짜 = date.today().isoformat()
    if _오늘["날짜"] != 오늘날짜:
        _오늘["날짜"] = 오늘날짜
        _오늘["개수"] = 0
    if _오늘["개수"] >= DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="오늘은 질문 한도에 도달했어요. 내일 다시 물어봐 주세요.")
    _오늘["개수"] += 1


@app.get("/api/docs")
def 문서_목록():
    """Chroma 저장소에 들어 있는 문서 이름 목록을 돌려줍니다 (화면 목록용)."""
    from lib.rag import 저장소_열기
    try:
        기록 = 저장소_열기()._collection.get(include=["metadatas"])
    except RuntimeError as 오류:
        return {"docs": [], "message": str(오류)}
    이름들 = sorted({unicodedata.normalize("NFC", m["source"]) for m in (기록["metadatas"] or [])})
    return {"docs": 이름들}


@app.post("/api/chat")
def 질문_받기(본문: 질문본문):
    """질문 한 개를 받아 Muma의 답과 출처를 돌려줍니다."""
    질문 = 본문.question.strip()
    if not 질문:
        raise HTTPException(status_code=400, detail="질문을 한 글자 이상 적어 주세요.")

    하루_한도_확인()

    try:
        from lib.rag import 질문에_답하기  # 실제 질문이 올 때만 불러옵니다
        결과 = 질문에_답하기(질문)
    except RuntimeError as 오류:
        # 우리가 쓴 쉬운 한국어 안내 메시지
        return JSONResponse(status_code=500, content={"error": str(오류)})
    except Exception:
        # 기술적인 내용은 숨기고 쉬운 말로만 안내합니다
        return JSONResponse(
            status_code=500,
            content={"error": "답을 만드는 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요."},
        )

    return {
        "answer": 결과["answer"],
        "sources": 결과["sources"],
        "rewrites": 결과["rewrites"],
        "hits": 결과["hits"],
    }


# 화면 파일은 맨 마지막에 붙입니다 (/api/ 주소가 먼저 처리되도록)
app.mount("/", StaticFiles(directory=BASE_DIR / "public", html=True), name="public")
