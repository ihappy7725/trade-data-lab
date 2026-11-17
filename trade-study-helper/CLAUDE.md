# 개인 챗봇 과제 — 프로젝트 안내 (Claude 가 매번 읽어요)

## 목표
data/ 문서로 답하는 RAG 챗봇 웹앱. 자세한 요구사항: @과제_안내.md
디자인 규칙: @DESIGN.md

## 기술
- Python 3.11 이상 · 가상환경 `.venv`
- 서버: FastAPI(`main.py`) · 화면: HTML·CSS·JS (`public/`) · RAG/부품: LangChain · 흐름: LangGraph
- 벡터 저장소: Chroma · 서버는 `store/chunks.json`(조각+숫자 목록)을 읽어 메모리에 올려 사용 (배포 가능, 디스크 쓰기 없음) · 로컬 `chroma_db/`는 ingest 점검용
- 챗봇·사이트 이름: Muma (DESIGN.md 참고). 화면은 점 지도 배경 + 지구본 변형 연출 (디자인스펠 아이디어 차용)
- 모델: OpenAI API — 대화 `OPENAI_MODEL`(기본 gpt-6-luna) · 임베딩 `OPENAI_EMBED_MODEL`(기본 text-embedding-3-small)
- 모델 이름 · 키는 .env 에서 읽기 (코드에 직접 쓰지 않기) · 사용법은 최신 공식 문서 확인

## 작업 방식
- 큰 변경 전에는 계획부터 보여 주기
- 한 번에 파일 하나씩, 바꾼 내용 3줄 요약
- 비전공자용 한국어 주석

## 실행 (터미널은 이 폴더에서, 가상환경 `.venv` 기준)
- 색인 확인만 (OpenAI 호출 없음): `.venv/bin/python ingest.py`
- 색인 만들기·갱신 (OpenAI 임베딩 1회 호출): `.venv/bin/python ingest.py --run`
- 화면 실행: `.venv/bin/uvicorn main:app --reload` 후 브라우저에서 http://127.0.0.1:8000 열기
- 패키지 설치: `.venv/bin/python -m pip install -r requirements.txt`
