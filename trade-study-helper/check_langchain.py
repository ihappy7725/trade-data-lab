# os: 컴퓨터(운영체제)의 환경 변수를 읽는 기본 도구
import os

# load_dotenv: .env 파일 내용을 환경 변수로 올려 주는 도구 (python-dotenv 패키지)
from dotenv import load_dotenv

# ChatOpenAI: OpenAI 대화 모델을 LangChain 방식으로 부르는 부품
from langchain_openai import ChatOpenAI

# ChatPromptTemplate: 질문 틀(빈칸이 있는 문장)을 만드는 부품
from langchain_core.prompts import ChatPromptTemplate

# .env 파일을 읽어서 환경 변수로 등록합니다.
load_dotenv()

# OPENAI_MODEL: .env 에서 모델 이름을 읽습니다. 없으면 프로젝트 기본값을 씁니다.
model_name = os.getenv("OPENAI_MODEL", "gpt-6-luna")

# 대화 모델 객체: reasoning_effort="low" 는 생각하는 양을 적게 쓰라는 설정입니다.
llm = ChatOpenAI(model=model_name, reasoning_effort="low")

# 질문 틀: {term} 자리에 나중에 용어를 넣습니다.
prompt = ChatPromptTemplate.from_template(
    "너는 무역 초보를 돕는 선생님이야. {term} 을 비전공자도 알게 두 문장으로 설명해 줘."
)

# 틀과 모델을 한 줄로 연결합니다. (| 기호는 "틀 결과를 모델에 넘긴다"는 뜻입니다.)
chain = prompt | llm

# 용어 CIF 를 넣고, 모델을 딱 한 번만 호출합니다.
result = chain.invoke({"term": "CIF"})

# 모델이 돌려준 답 글자(text)를 꺼내서 보여 줍니다.
print(f"모델 이름: {model_name}")
print(f"답: {result.content}")

# 사용한 토큰 수(입력/출력)를 보여 줍니다. 정보가 없으면 '알 수 없음'으로 표시합니다.
usage = result.usage_metadata or {}
print(f"입력 토큰: {usage.get('input_tokens', '알 수 없음')}")
print(f"출력 토큰: {usage.get('output_tokens', '알 수 없음')}")
