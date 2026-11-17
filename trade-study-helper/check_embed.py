"""
임베딩 유사도 확인용 스크립트 (임베딩 API 는 한 번만 호출합니다).

- .env 에서 OPENAI_API_KEY 와 OPENAI_EMBED_MODEL 을 읽습니다.
- 질문 1개와 비교 문장 5개를 한 번에 임베딩합니다.
- 질문과의 코사인 유사도를 큰 순서로 표로 보여 줍니다.
- 키와 숫자 목록(벡터)은 출력하지 않습니다.
"""

import math
import os

from dotenv import load_dotenv
from openai import OpenAI

# .env 파일을 읽어서 환경변수로 등록합니다.
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
# 임베딩 모델 이름이 .env 에 없으면 프로젝트 기본값을 사용합니다.
embed_model = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")

if not api_key:
    raise SystemExit("오류: .env 에 OPENAI_API_KEY 가 없습니다.")

QUESTION = "배에 짐을 실은 증거 서류가 뭐야?"
SENTENCES = [
    "선하증권(B/L)은 화물을 선적했다는 증서다",
    "FOB 는 본선에 실으면 위험이 넘어간다",
    "오늘 점심은 김치찌개를 먹었다",
    "인보이스는 거래 금액을 적은 상업 송장이다",
    "고양이는 낮잠을 많이 잔다",
]


def cosine_similarity(a, b):
    """두 벡터가 얼마나 같은 방향인지 0~1 사이 값으로 계산합니다."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    return dot / (norm_a * norm_b)


client = OpenAI(api_key=api_key)

# 질문과 문장 5개를 한 번의 호출로 임베딩합니다 (반복하지 않습니다).
try:
    response = client.embeddings.create(
        model=embed_model,
        input=[QUESTION] + SENTENCES,
    )
except Exception as error:
    # 에러 내용에 키가 섞이지 않도록 종류만 쉽게 알려 줍니다.
    raise SystemExit(
        f"오류: 임베딩 호출에 실패했습니다 ({type(error).__name__}). "
        "키 값, 모델 이름, 인터넷 연결을 확인해 주세요."
    )

vectors = [item.embedding for item in sorted(response.data, key=lambda d: d.index)]
question_vec = vectors[0]

rows = []
for text, vec in zip(SENTENCES, vectors[1:]):
    rows.append((cosine_similarity(question_vec, vec), text))
rows.sort(key=lambda row: row[0], reverse=True)

print(f"임베딩 모델: {response.model}")
print(f"질문: {QUESTION}")
print()
print("| 순위 | 유사도 | 문장 |")
print("|---|---|---|")
for rank, (score, text) in enumerate(rows, start=1):
    print(f"| {rank} | {score:.4f} | {text} |")
