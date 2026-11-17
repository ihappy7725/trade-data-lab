# Muma · 무역 공부 도우미

내 무역 노트(`data/` 폴더의 문서)에서 근거를 찾아 답하는 개인 챗봇 웹앱입니다.
질문하면 노트에 있는 내용만 바탕으로 답하고, 어느 파일에서 찾았는지 함께 보여 줍니다.
노트에 없는 내용은 지어내지 않고 "문서에서 찾지 못했어요."라고 말합니다.

> 모든 예시 문서는 연습용 가상 자료입니다 (파일 안에 "(가상)" 표시).

## 1. 실행 방법

터미널에서 이 폴더(`trade-study-helper`)로 이동한 뒤 아래 순서대로 실행합니다.

**(1) 가상환경과 패키지 준비 (처음 한 번)**

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

**(2) API 키 설정**

`.env.example`을 복사해서 `.env` 파일을 만들고, 자기 OpenAI 키를 적습니다.
`.env`는 절대 GitHub에 올리지 마세요.

```bash
cp .env.example .env
```

**(3) 문서 색인 만들기 (문서가 바뀔 때만 다시 실행)**

```bash
.venv/bin/python ingest.py          # 확인만 함 (OpenAI 호출 없음)
.venv/bin/python ingest.py --run    # 실제로 임베딩을 만들어 chroma_db/ 에 저장
```

**(4) 화면 열기**

```bash
.venv/bin/uvicorn main:app --reload
```

브라우저에서 http://127.0.0.1:8000 을 엽니다.

## 2. 사용한 기술

| 부분 | 쓴 것 |
|---|---|
| 화면 | HTML · CSS · JavaScript (지구본은 d3.js + world-atlas 지도 데이터) |
| 서버 | FastAPI (`main.py`) |
| 문서 나누기·검색 부품 | LangChain (`langchain-core`, `langchain-openai`, `langchain-text-splitters`, `langchain-chroma`) |
| 답변 흐름 | LangGraph (`lib/rag.py`) |
| 벡터 저장소 | Chroma (서버 시작 시 `store/chunks.json`을 메모리에 올려 사용) |
| 대화 모델 | OpenAI, `.env`의 `OPENAI_MODEL` (기본 `gpt-6-luna`) |
| 임베딩 모델 | OpenAI, `.env`의 `OPENAI_EMBED_MODEL` (기본 `text-embedding-3-small`) |

## 3. 답변 흐름 (LangGraph)

```
질문 → [찾기] → 관련 조각이 충분한가?
         ├─ 예  → [답하기] → 답 + 출처 파일명
         ├─ 아니오, 다시 찾기 2회 안 됨 → [다시 쓰기: 무역 용어 짝말 덧붙이기] → [찾기]로 돌아감
         └─ 아니오, 2회 넘음 → [거절하기] → "문서에서 찾지 못했어요."
```

- 충분한지는 검색 점수(0~1)로 판단합니다. 기준은 0.30이에요.
- 다시 쓰기는 `lib/terms.json`의 무역 용어 사전으로 합니다. AI를 부르지 않아요.
- 관련 조각이 없으면 답변용 AI를 부르지 않고 바로 거절합니다.

## 4. 폴더 구조

```
trade-study-helper/
├── main.py              # 서버 (화면 제공, /api/chat, /api/docs)
├── ingest.py            # 문서 → 조각 → 임베딩 → chroma_db/ 저장
├── lib/
│   ├── rag.py           # 답변 흐름 (LangGraph)
│   └── terms.json       # 무역 용어 짝말 사전
├── store/chunks.json    # 조각 글 + 숫자 목록 (서버가 읽는 배포용 파일, API 키 없음)
├── chroma_db/           # 로컬 Chroma 저장소 (ingest 가 변경 여부 확인용, 배포에 안 씀)
├── public/              # 화면 (index.html, css/, js/)
├── data/                # 연습용 가상 문서 6개
├── eval/
│   ├── questions.json   # 검증 질문 25개와 기대 출처
│   ├── run_eval.py      # 검증 실행 스크립트
│   └── results*.json    # 검증 결과
├── docs/decisions.md    # 설계 결정 기록
├── DESIGN.md            # 디자인 규칙
├── requirements.txt     # 설치 패키지와 버전
└── .env.example         # 키 양식 (실제 키는 .env에만)
```

## 5. 비용 아끼기

- 문서 임베딩은 `ingest.py --run`을 실행할 때만 하고, 바뀐 파일만 다시 만듭니다.
- 질문 한 개당 호출은 질문 임베딩 1회 + 답변 1회가 기본이에요.
- 관련 조각이 없으면 답변 호출 없이 거절합니다.
- 답변은 최대 300 토큰, 하루 질문은 기본 50개까지로 제한합니다 (`DAILY_QUESTION_LIMIT`).
- 실제 비용은 OpenAI 대시보드의 Usage 화면에서 확인하세요.

## 6. 검증

`eval/questions.json`의 질문 25개로 확인했습니다.
- 답 가능 질문 20개: 정답 출처 파일이 출처 목록에 들어 있는지 확인
- 문서에 없는 질문 5개: "문서에서 찾지 못했어요."로 거절하는지 확인

| 실행 | 결과 |
|---|---|
| 1차 (수정 전) | 14 / 25 |
| 2차 (수정 후, JSON 저장소) | 23 / 25 |

남은 실패 2개는 검색 점수가 기준(0.30)보다 낮게 나온 경우예요 ("임베딩이 무엇인가요?", "베트남 바이어와 견적 협의는 언제 시작했나요?").
Chroma로 바꾼 뒤에는 검색 점수가 같았지만, 25문항 전체는 다시 실행하지 않았습니다.

## 7. 알려진 한계

- 답변은 노트에 있는 내용만 근거로 하지만, AI가 문장을 다듬으며 표현이 달라질 수 있어요.
- 짧은 문서는 검색 점수가 낮게 나와서 가끔 거절할 수 있어요.
- 질문 기록은 브라우저(localStorage)에만 저장돼요.
- 배경 지구본은 인터넷 연결이 있어야 보여요. 없으면 질문 기능만 동작해요.
