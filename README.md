<div align="center">

![header](https://capsule-render.vercel.app/api?type=waving&color=0:2D6A4F,50:40916C,100:95D5B2&height=210&section=header&text=Frogger&fontSize=80&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=AI-Powered%20Algorithm%20Visualizer%20%26%20Debugger&descAlignY=60&descAlign=50&descSize=18)

**코드를 실행하면 AI가 시각화와 해설을 완성하는 알고리즘 디버거**

브라우저에서 Python / JavaScript 코드를 돌리면, AI가 알고리즘을 분류하고<br/>실행 흐름을 스텝별 시각화와 자연어 해설로 변환합니다.

</div>

## Features

### 1. 코드 실행 — 브라우저에서 바로

Python(Pyodide WASM)과 JavaScript(Acorn AST)를 설치 없이 브라우저에서 실행합니다.

<!-- ![코드 실행 데모](demo/01-execution.gif) -->

### 2. AI 알고리즘 분류

코드를 분석해 알고리즘 종류를 자동 판별하고, 최적의 시각화 전략을 결정합니다.

<!-- ![알고리즘 분류 데모](demo/02-classification.gif) -->

### 3. 스텝별 자연어 해설

각 실행 단계마다 AI가 무슨 일이 일어나는지 자연어로 설명합니다. SSE 스트리밍으로 실시간 표시됩니다.

<!-- ![자연어 해설 데모](demo/03-explanation.gif) -->

### 4. 다양한 시각화 모드

Grid / Graph / Linear / 3D Volume 등 알고리즘 특성에 맞는 시각화를 자동 선택합니다.

<!-- ![시각화 모드 데모](demo/04-visualization.gif) -->

### 5. 자료구조 전용 뷰

힙, 큐, 스택, 데크, Union-Find 등 자료구조별 특화된 시각화를 제공합니다.

<!-- ![자료구조 뷰 데모](demo/05-data-structures.gif) -->

### 6. 포인터 & 피벗 자동 감지

Two-pointer, 퀵소트 피벗 등을 코드 맥락에서 자동으로 감지하고 시각화에 반영합니다.

<!-- ![포인터 감지 데모](demo/06-pointers.gif) -->

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-433E38?style=flat-square&logo=react&logoColor=white)
![D3.js](https://img.shields.io/badge/D3.js-F9A03C?style=flat-square&logo=d3.js&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=three.js&logoColor=white)
![Pyodide](https://img.shields.io/badge/Pyodide-3776AB?style=flat-square&logo=python&logoColor=white)
![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?style=flat-square&logo=webassembly&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)

## Architecture

> **`TRACE`** &rarr; **`AI`** &rarr; **`RENDER`**

| 단계 | 역할 |
|------|------|
| **TRACE** | Web Worker가 코드 실행 + 줄 단위 trace 수집 |
| **AI** | 알고리즘 분류 + 스텝별 자연어 해설 생성 |
| **RENDER** | mergedTrace 기반 시각화 렌더링 |

상세: [docs/architecture.md](docs/architecture.md)

## Getting Started

```bash
npm install
cp .env.example .env.local  # API 키 설정
npm run dev
```

## 참고 문서

- [전체 파이프라인](docs/architecture.md)
- [Execution Engine](docs/features/execution.md)
- [Trace 병합](docs/features/trace.md)
- [AI Pipeline](docs/features/ai-pipeline.md)
- [Visualization](docs/features/visualization.md)
- [커맨드 가이드](docs/commands.md)

## Team

<!-- 팀 이름 -->

<!-- 팀 소개 문구 -->

| 이름          | 역할          | GitHub           |
| ------------- | ------------- | ---------------- |
| <!-- 이름 --> | <!-- 역할 --> | <!-- @github --> |
| <!-- 이름 --> | <!-- 역할 --> | <!-- @github --> |

## License

<!-- 라이선스 -->
