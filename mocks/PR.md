**참고 링크**: [frogger `sjh/mocks`](https://github.com/ultra-ai-dle/frogger/tree/sjh/mocks)

## 요약

- 자료구조·알고리즘 주제별로 **Python / JS / Java / C++** 예시(표준 입출력)를 마크다운으로 정리
- [`GUIDELINES.md`](GUIDELINES.md) 작성 규칙, [`INDEX.md`](INDEX.md) 링크 모음, [`PROGRESS.md`](PROGRESS.md) 계획·달성률 관리.

## 규모

`PROGRESS.md` 기준: 완료 주제 **80** / 계획 **132** (≈60.6%), 본문 md **320**개

## 구조

```
mocks
├── GUIDELINES.md · INDEX.md · PROGRESS.md · PR.md
├── data-structures
│   ├── stack
│   │   └── python.md · javascript.md · java.md · cpp.md
│   └── …
└── algorithms
    ├── route
    │   ├── bfs
    │   │   └── python.md · javascript.md · java.md · cpp.md
    │   └── …
    ├── sort
    │   ├── merge
    │   │   └── python.md · javascript.md · java.md · cpp.md
    │   └── …
    ├── dp
    │   └── …
    └── binary-search
        └── …
```

앱 빌드와 무관한 **참고용 스니펫** 목적

## 예시 파일

각 `*.md`는 한 언어 기준으로 아래만 담는다.

- **코드** — stdin/stdout 쓰는 완결 스니펫
- **입력** — 넣을 stdin을 펜스 블록으로 고정
- **출력** — 기대 stdout을 펜스 블록으로 고정
