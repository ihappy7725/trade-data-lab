"""
검증 실행 (eval/run_eval.py)

eval/questions.json 의 질문 25개를 실제 흐름(lib/rag.py)으로 한 번씩 실행하고,
결과를 eval/results.json 에 저장합니다.
- 답 가능 질문: 정답 출처 파일이 출처 목록에 들어 있는지 확인
- 거절 질문: "문서에서 찾지 못했어요." 로 답했는지 확인
"""

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE))
load_dotenv(BASE / ".env")

from lib.rag import REFUSAL, 질문에_답하기  # noqa: E402


def 채점(항목, 결과):
    """한 질문의 결과가 기대와 맞는지 True/False 로 돌려줍니다."""
    기대 = 항목["expect"]
    if 기대 == "거절":
        return 결과["answer"] == REFUSAL
    return all(출처 in 결과["sources"] for 출처 in 기대) and 결과["answer"] != REFUSAL


def main():
    """전체 질문을 순서대로 실행하고 요약을 출력합니다."""
    질문들 = json.loads((BASE / "eval/questions.json").read_text(encoding="utf-8"))["questions"]
    기록 = []
    통과 = 0
    for 항목 in 질문들:
        try:
            결과 = 질문에_답하기(항목["q"])
            맞음 = 채점(항목, 결과)
            기록.append({"id": 항목["id"], "q": 항목["q"], "expect": 항목["expect"],
                         "answer": 결과["answer"], "sources": 결과["sources"],
                         "rewrites": 결과["rewrites"], "pass": 맞음})
        except Exception as 오류:
            맞음 = False
            기록.append({"id": 항목["id"], "q": 항목["q"], "expect": 항목["expect"],
                         "error": type(오류).__name__, "pass": False})
        통과 += int(맞음)
        print(f"{항목['id']:>2} {'통과' if 맞음 else '실패'}  {항목['q']}")

    (BASE / "eval/results.json").write_text(json.dumps(기록, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n합계: {통과} / {len(질문들)} 통과")


if __name__ == "__main__":
    main()
