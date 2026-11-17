"""
OpenAI API 연결 확인용 스크립트 (한 번만 호출합니다).

- .env 파일에서 OPENAI_API_KEY 와 OPENAI_MODEL 을 읽습니다.
- API 키는 화면에 출력하지 않습니다.
- 질문 한 개만 보내고, 모델 이름 · 답 · 토큰 수를 보여 줍니다.
"""

import os

from dotenv import load_dotenv
from openai import OpenAI

# .env 파일을 읽어서 환경변수로 등록합니다.
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
# 모델 이름이 .env 에 없으면 프로젝트 기본값을 사용합니다.
model = os.getenv("OPENAI_MODEL", "gpt-6-luna")

if not api_key:
    raise SystemExit("오류: .env 에 OPENAI_API_KEY 가 없습니다.")

client = OpenAI(api_key=api_key)

question = "무역 용어 FOB 를 한 문장으로 설명해 줘."

# API 호출은 이 한 번만 합니다 (반복하지 않습니다).
try:
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": question}],
    )
except Exception as error:
    # 에러 내용에 키가 섞이지 않도록 종류만 쉽게 알려 줍니다.
    raise SystemExit(
        f"오류: OpenAI 호출에 실패했습니다 ({type(error).__name__}). "
        "키 값, 모델 이름, 인터넷 연결을 확인해 주세요."
    )

answer = response.choices[0].message.content
usage = response.usage

print(f"모델 이름: {response.model}")
print(f"답: {answer}")
print(f"입력 토큰: {usage.prompt_tokens}")
print(f"출력 토큰: {usage.completion_tokens}")
