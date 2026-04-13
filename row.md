---

> **⚠ 초기 기획서** — 이 문서는 프로젝트 초기 구상 단계의 기획서로, 현재 구현과 상당 부분 다릅니다. 실제 아키텍처는 `docs/architecture.md`, 현재 기능은 `NEXT_FEATURES.md`를 참조하세요. 주요 차이: 실행은 AI 시뮬레이션이 아닌 실제 런타임(Pyodide/Acorn/원격 JVM) 기반, 에디터는 Monaco가 아닌 커스텀 구현, 시각화는 React Flow가 아닌 D3/Three.js/커스텀 SVG 사용.

# [기획서] Prova: AI 기반 알고리즘 시각화 디버거

## 1. 프로젝트 개요
- **서비스명:** Prova (코드레이스)
- **슬로건:** "코드를 실행하지 말고, 시각화로 읽으세요."
- **핵심 가치:** 실제 컴파일 엔진 없이 AI 시뮬레이션을 통해 알고리즘의 동작 과정을 단계별(Step-by-step)로 시각화하고, 런타임 에러의 원인을 로직 흐름 속에서 파악하게 돕는 교육용 디버깅 도구.

---

## 2. 주요 타겟 사용자

1. **코딩 테스트 준비생:** 본인이 짠 알고리즘(BFS, Dijkstra 등)이 왜 틀렸는지, 어디서 인덱스 에러가 나는지 시각적으로 확인하고 싶은 사용자.
2. **개발 숙련자:** 복잡한 로직의 데이터 흐름(DP 테이블 갱신, 트리 재구성 등)을 빠르게 검증하고 싶은 개발자.

---

## 3. 핵심 기능 (Core Features)

### A. AI 시뮬레이션 엔진 (Pseudo-Runtime)

- **Zero-Engine 방식:** 서버측 물리 런타임 없이, LLM이 코드를 한 줄씩 '논리적'으로 실행하여 실행 추적 데이터(Trace JSON)를 생성.
- **언어 확장성:** Python을 우선 지원하되, AI의 이해도를 바탕으로 JS, Java, C++ 등으로 확장 가능.
- **자가 검증 (CoT):** AI가 실행 로그를 작성하기 전 `internal_monologue`를 거치게 하여 환각(Hallucination)을 최소화하고 정확도 극대화.

### B. 전략적 데이터 시각화 (Multi-Strategy Rendering)

AI가 코드에서 사용된 자료구조를 파악하여 최적의 시각화 전략을 자동 선택합니다.

- **GRID 전략:** 2D 배열, 격자 탐색(BFS/DFS)용 셀 기반 하이라이트.
- **GRAPH 전략:** 트리, 그래프(최단 경로)용 노드-엣지 다이어그램.
- **LINEAR 전략:** 스택, 큐, 1차원 배열용 리스트 애니메이션.

### C. 인터랙티브 디버깅 제어

- **Step-by-Step:** 전/후 단계 이동을 통해 데이터 변화 추적.
- **Break & Rewind:** 에러 발생 시점(Break)에서 실행 중단. 에러 이전 시점으로는 자유롭게 복기(Rewind) 가능.
- **재생 컨트롤:** Auto-play 기능 및 0.5x ~ 2.0x 속도 조절 지원.

### D. 스마트 변수 모니터링

- **스코프 자동 필터링:** 단순 인덱스 변수(`i`, `j`)와 핵심 자료구조(`dist`, `queue`)를 분리하여 표시.
- **값 변화 하이라이트:** 이전 단계 대비 변경된 변수 값에 애니메이션 효과 부여.

---

## 4. 상세 기술 명세

### A. Trace JSON 스키마 (AI 응답 규격)

AI는 아래와 같은 엄격한 형식의 데이터를 생성하여 프론트엔드에 전달합니다.

```json
{
  "metadata": {
    "algorithm": "string",
    "strategy": "GRID | GRAPH | LINEAR",
    "total_steps": "number"
  },
  "steps": [
    {
      "line": "number",
      "internal_monologue": "string (AI의 사고 과정)",
      "vars": { "key": "value" },
      "visual_action": {
        "action": "focus | update | visitNode | push | pop 등",
        "params": { "any": "any" }
      },
      "explanation": "string (사용자용 설명)"
    }
  ],
  "error": {
    "type": "string",
    "line": "number",
    "message": "string",
    "visual_state": "object (에러 지점 하이라이트 정보)"
  }
}
```

### B. 시각화 원자적 명령 (Atomic Actions API)

- **GRID:** `focus(r, c)`, `update(r, c, val)`, `markPath(coords[])`
- **GRAPH:** `visitNode(id)`, `edge(u, v, state)`, `updateNode(id, val)`
- **LINEAR:** `push(val)`, `pop()`, `update(idx, val)`, `pointer(idx, name)`

---

## 5. UI/UX 레이아웃 구성

- **Left Pane (Editor):** Monaco Editor 기반 코드 영역. 현재 실행 줄 배경 하이라이트.
- **Center Pane (Visualizer):** `React Flow` 또는 커스텀 SVG/Canvas 기반 시각화 영역.
- **Right Pane (Info):** - 상단: 변수 모니터링 테이블 (변화 시 강조).
  - 하단: 콘솔 출력 및 AI의 단계별 설명.
- **Bottom (Timeline):** - 루프/조건문 분기점이 점(Dot)으로 표시된 타임라인.
  - 마지막 지점에 에러 발생 시 **빨간색 앵커(X)** 표시.

---

## 6. 기술 스택 (Tech Stack)

- **Frontend:** Next.js, Tailwind CSS, Zustand (상태 관리)
- **Library:** React Flow (Graph), Framer Motion (Animation), Monaco Editor
- **AI:** GPT-4o / Gemini 1.5 Pro (JSON Mode 사용)
- **Future Extension:** Pyodide (WebAssembly 기반 로컬 Python 런타임 도입)

---

## 7. 향후 확장 계획

1. **Edge Case 생성기:** AI가 사용자의 코드를 터뜨릴 수 있는 극한의 입력값(Test Case)을 자동 생성.
2. **협업 디버깅:** 특정 디버깅 세션(스텝과 시각화 상태 포함)을 고유 URL로 공유.
3. **코드 최적화 제안:** 시간/메모리 초과 감지 시 AI가 더 효율적인 알고리즘으로의 리팩토링 가이드 제공.
