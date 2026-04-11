# Visualization — 렌더링 규칙

## Status

- [x] 구현
- [ ] 테스트
- [x] 문서화

## Domain Context

- AI가 결정한 전략(GRID/LINEAR/GRID_LINEAR/GRAPH)에 따라 mergedTrace를 step 단위로 렌더링
- 상세 아키텍처: [docs/features/visualization.md](../../../docs/features/visualization.md)

## 핵심 원칙

- **클라이언트는 변수 이름으로 역할을 추측하지 않는다.** 고정 매핑 테이블 금지.
- AI가 `var_mapping`과 `linear_pivots`로 결정한 역할만 사용한다.
- AI는 action 이름 + params만 반환. **색상/스타일/폰트는 렌더러 디자인 시스템이 결정.**

## visual_actions 규칙

| 패널   | 허용 액션                                                           |
| ------ | ------------------------------------------------------------------- |
| GRID   | `highlight`, `focusGrid(r,c)`, `markVisited(r,c)`, `markError(r,c)` |
| LINEAR | `push(val)`, `pop()`, `updateLinear(idx,val)`, `pointer(idx,name)`  |
| GRAPH  | `visit(id)`, `updateGraph(id,val)`, `highlightPath(ids[])`          |
| 공통   | `compare`, `swap`, `markError`, `pause`                             |

- action에 `color`, `style`, `fontSize` 등 디자인 속성 포함 금지
- 새 action 추가 시 렌더러에 핸들러 구현 필수

## GRID 관련

- `GraphPanel`에서 2D 스칼라 격자는 `is2DRectangularCellGrid` 등으로 **ARRAY2D(격자) 우선** 판단
- 메타가 잘못 GRAPH여도 격자 후보는 기본 GRID 뷰를 선호
- `visited[y][x][z]` 같은 3D 상태 텐서, 방향 벡터 리스트 → GRAPH 토글 제공하지 않음 (항상 GRID/VARIABLES 맥락)

## 좌표 표기 통일

- 1D: `x`
- 2D: `y, x`
- 3D: `y, x, z`
- 라벨, 툴팁, UI 카피 전부 이 표기 기준

## 3D 표시 기본

- 슬라이스 뷰 (`xy(z=k)`, `yz(x=k)`, `xz(y=k)`)를 기본으로 한다
- Three.js 3D Volume은 보조 뷰로 둔다

## 레이아웃 제약

- 전역(페이지) 스크롤 금지 — 100vh 고정 레이아웃
- 모든 핵심 데이터구조는 Center Pane 내에서 동시 노출
- 데이터 크기 상한: 배열 20, 그래프 노드 15 (가독성 확보)
- AI 실패 시 → `vars` Key-Value 테이블 폴백 (데이터 탐색 모드)

## linear_pivots 렌더링

- `pivot_mode: "index"` → 해당 인덱스 셀 아래에 포인터 배지 표시
- `pivot_mode: "value_in_array"` → 배열에서 해당 값과 같은 첫 칸에 링/배지 표시
- 구현: `linearPointerHelpers.ts`의 `pointersAtIndexFromSpecs` 함수
- 새 UI가 이름만 보고 포인터를 추정하면 안 된다 — 반드시 `linear_pivots` 스펙 참조

## Test Coverage

유닛 테스트: linearPointerHelpers
- [ ] `pointersAtIndexFromSpecs` — index 모드: 정수 인덱스 → 해당 셀에 포인터 매핑
- [ ] `pointersAtIndexFromSpecs` — value_in_array 모드: 배열에서 값 검색 → 첫 매칭 셀에 포인터
- [ ] `cellMatchesMarkerValue` — null/undefined/숫자/문자열/불리언 각 타입별 비교
- [ ] `formatLinearAlgoContext` — 변수 없으면 null, 있으면 ` · ` 구분 문자열

데이터 감지 함수:
- [ ] `getFirst2DVar` — 스칼라 2D 배열 우선 감지, 없으면 일반 2D
- [ ] `getFirst3DVar` — dp 패턴 우선, 없으면 스칼라 3D
- [ ] `getFirstLinearVar` — 1D 배열 감지 (배열의 배열 제외)
- [ ] 빈 배열 / null step → null 반환

Grid vs Graph 판별:
- [ ] ≥82% 스칼라 2D → `looksLike2DScalarTableGrid` true (GRID 우선)
- [ ] ≥68% 스칼라 + 행 길이 차 ≤8 → `is2DRectangularCellGrid` true
- [ ] 인접 리스트 형태 → `detectGraphLike` true
- [ ] strategy=GRAPH지만 데이터가 2D 스칼라 격자 → GRID 뷰 우선

toCells 변환:
- [ ] 현재 셀 감지 (vars.r, vars.c 기반)
- [ ] previousGrid 비교 → changed 셀 표시
- [ ] previousGrid 없음 → 모든 셀 changed=false

비트마스크:
- [ ] `is2DBitmaskGrid` — 정수 ≥ 0만 허용
- [ ] `expand2DBitmaskGridTo3D` — 각 셀 → 비트 배열 확장
- [ ] `bitWidthFromGrid` — log2(maxValue)+1, cap=64

특수 자료구조 뷰 (GraphPanel):
- [ ] HEAP → 이진 트리 레이아웃
- [ ] QUEUE/DEQUE → 수평 큐 front/back 마커
- [ ] STACK → 수직 스택
- [ ] UNIONFIND → 포레스트 트리
- [ ] VISITED/DISTANCE → 히트맵

3D Volume:
- [ ] `getLayerWindow` — 24개 초과 시 윈도잉, focusIndex 중심
- [ ] `buildTickIndices` — 축 라벨 솎아내기
- [ ] 슬라이스 뷰 (xy/xz/yz) 축 전환
