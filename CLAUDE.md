# Project: Prova

AI 기반 알고리즘 시각화 디버거. 브라우저에서 코드를 실행하고, AI가 실행 흐름을 시각화 + 자연어 해설로 변환한다.
핵심 철학: **역할 분리** — 실행의 정확성은 엔진이, 해석과 설명은 AI가, 디자인은 프론트엔드가 전담.

## Tech Stack

- **Framework**: Next.js (App Router), React, Tailwind CSS
- **State**: Zustand (단일 스토어)
- **Visualization**: D3, Three.js
- **Execution**: Pyodide (Python WASM), Acorn (JS AST 계측), Web Worker
- **AI**: Gemini/OpenAI/Groq/Anthropic/OpenRouter (멀티 프로바이더 폴백)

## Directory Structure

```
app/
├── api/analyze/     # AI Phase 1: 알고리즘 분류 + 전략 결정
├── api/explain/     # AI Phase 2: 스텝별 설명 SSE 스트리밍
├── page.tsx         # 메인 페이지
src/
├── config/          # 실행 제한 설정 (timeout, maxSteps)
├── features/
│   ├── execution/   # Worker 라이프사이클 (ProvaRuntime)
│   ├── trace/       # rawTrace + AI 어노테이션 → mergedTrace 병합
│   ├── playback/    # 재생/탐색 컨트롤
│   └── visualization/  # GridLinearPanel, GraphPanel, 3D Volume
├── lib/             # AI 프로바이더, 태그 정규화, 피벗 보강
├── store/           # Zustand 스토어 (useProvaStore)
├── types/           # 파이프라인 전체 타입 (prova.ts)
public/worker/       # pyodide.worker.js, js.worker.js
docs/                # 개발자 아키텍처 문서
prompts/             # AI에게 던질 프롬프트 모음 (UI, pitch, 언어 확장)
```

## 3-Step Pipeline

1. **TRACE** — Worker(Pyodide/JS)가 코드 실행 + trace 수집 → `{rawTrace, branchLines, varTypes}`
2. **AI** — `/api/analyze`(전략·변수 매핑) → `/api/explain`(스텝별 설명, 8step/chunk SSE)
3. **RENDER** — `mergedTrace[currentStep]` 기준으로 시각화 패널 렌더링

## AI Integration Rules

- AI 분류 규칙: 역할은 타입/이름이 아닌 **사용 패턴**으로만 결정 (상세: `app/api/analyze/CLAUDE.md`)
- `var_mapping[].var_name`은 반드시 실제 `varTypes` 키여야 함
- `aiError` 키 이름 고정 (`error`, `analysisError` 등 사용 금지)
- AI는 action 이름 + params만 반환, 색상/스타일 절대 포함 금지
- explain 출력 배열 길이 === 입력 steps 길이 (1:1 보장)

## Custom Commands

- `/qa` — feature별 QA 체크리스트 생성/업데이트
- `/test` — feature별 테스트 작성 + 커밋
- `/review` — feature + test 코드 품질 검사 + 커밋
- `/docs` — 아키텍처 문서 + JSDoc + 인라인 주석 업데이트
- `/trace-validate` — trace 스키마 + 병합 무결성 검증
- `/prompt-diff` — AI 프롬프트 변경 회귀 체크
- `/refactor-audit` — export 타입/시그니처 호환성 검증
- `/pr-ready` — lint + type check + build + 변경 요약

## Coding Conventions

- TypeScript strict mode
- 타입 정의는 `src/types/prova.ts`에 집중 — 파이프라인 전체가 이 파일의 타입에 의존
- Store 액션에서 `mergeTrace()` 자동 호출 — 수동 병합 금지
- Worker 통신은 `ProvaRuntime` 클래스를 통해서만 (직접 postMessage 금지)
- AI 프로바이더 호출은 `callWithFallback()` 경유 (직접 fetch 금지)

## Do NOT

- `prova.ts` 타입 변경 시 의존 파일 확인 없이 수정하지 않는다 (`/refactor-audit` 사용)
- Worker 메시지 포맷 변경 시 양쪽(Worker + 메인 스레드) 동시 수정하지 않으면 안 된다
- AI 프롬프트에서 색상/스타일/폰트를 지정하지 않는다
- 전역(페이지) 스크롤을 발생시키지 않는다 — 100vh 고정 레이아웃
- `README.md`, `prova.md`(기획서)를 자동 수정하지 않는다 — 수동 관리 대상

## Architecture Docs

상세 아키텍처가 필요할 때 아래 문서를 참조한다. 평소에는 각 디렉토리의 CLAUDE.md 규칙만으로 충분하다.

- [전체 파이프라인 개요](docs/architecture.md)
- [Execution Engine](docs/features/execution.md)
- [Trace 병합](docs/features/trace.md)
- [AI Pipeline](docs/features/ai-pipeline.md)
- [Visualization](docs/features/visualization.md)