import { NextRequest, NextResponse } from "next/server";
import { AnalyzeAiResponse } from "@/types/prova";
import { stripCodeFence, tryParseJson } from "@/lib/jsonParsing";
import {
  buildChain,
  callWithFallback,
  GeminiOptions,
} from "@/lib/ai-providers";
import {
  ANALYZE_GEMINI_SCHEMA,
  compactCodeForAnalyze,
  compactVarTypes,
  normalizeResponse,
  fallbackAnalyzeMetadata,
  enrichAnalyzeMetadataWithPartitionValuePivots,
  applyLanguageEnricher,
  applyDirectionMapGuards,
  applyGraphModeInference,
  enrichLinearPivots,
} from "./_lib";
import { stripComments } from "@/lib/stripComments";

async function analyzeWithAi(
  code: string,
  varTypes: Record<string, string>,
  language = "python",
) {
  const chain = buildChain();
  if (chain.length === 0) throw new Error("NO_AI_PROVIDER_KEY");
  const lang = language === "javascript" ? "javascript" : language === "java" ? "java" : "python";
  const compactCode = compactCodeForAnalyze(stripComments(code, lang));
  const compactTypes = compactVarTypes(varTypes);

  let langLabel: string;
  let langSpecificHints: string[];
  switch (language) {
    case "javascript":
      langLabel = "JavaScript";
      langSpecificHints = [
        "JS 특화: Array.push/pop은 스택, shift/unshift(또는 shift/push)는 큐로 인식.",
        "JS 특화: Map은 dict, Set은 set에 대응. for...of, forEach 등 고차 함수 패턴도 인식.",
        "JS 특화: deque 없음 — 배열+shift/push 조합으로 BFS 큐를 구현함.",
        "JS 특화: 재귀 함수는 스택 프레임 없이 반복 구현과 동일하게 분류.",
      ];
      break;
    case "java":
      langLabel = "Java";
      langSpecificHints = [
        "Java 특화: Stack<T>.push/pop은 스택, Queue<T>/Deque<T>.offer/poll은 큐로 인식.",
        "Java 특화: Map<Integer, List<Integer>> 또는 인접 리스트 패턴이면 그래프 인식.",
        "Java 특화: 이전 인덱스 참조 갱신 패턴(arr[i] = f(arr[i-1], …) 형식)이면 DP 인식.",
        "Java 특화: PriorityQueue는 heap으로 감지.",
      ];
      break;
    default:
      langLabel = "Python";
      langSpecificHints = ["deque()는 반드시 자료구조로 감지하고 append+popleft면 queue/BFS 반영."];
  }

  const prompt = [
    `${langLabel} 코드의 자료구조/알고리즘 분류기다.`,
    "설명 없이 JSON 객체 하나만 출력.",
    "strategy는 GRID|LINEAR|GRID_LINEAR|GRAPH 중 하나.",
    "var_mapping[].var_name은 반드시 varTypes 키여야 한다.",
    "",
    ...langSpecificHints,
    "",
    "【최우선】strategy·graph_var_name·var_mapping의 panel은 변수 '이름'이 아니라 코드 안에서 그 값이 하는 '역할'로만 결정한다.",
    "2차원 리스트([[...]])라고 해서 무조건 GRID도 GRAPH도 아니다. 반드시 읽기: 이중 루프로 dp[i][j] 갱신·최적화 점화식이면 GRID/GRID_LINEAR, graph[u].append(v)·인접 탐색·간선 순회면 GRAPH.",
    "인접행렬(0/1 또는 가중치)로 정점 간 연결을 나타내고 BFS/DFS/다익스트라에 쓰이면 GRAPH(표현은 graph_representation=GRID일 수 있음). 행렬체인·배낭처럼 구간/부분문제 최적값만 담으면 GRID.",
    "dict로 정점→이웃 목록이면 graph_representation=MAP. graph_var_name은 '그래프 자료구조'로 쓰인 변수 하나만.",
    "변수명이 graph라도 보드 게임 격자만 담으면 GRAPH 전략이 아님. 이름이 dp여도 인접 리스트로만 쓰이면 GRAPH일 수 있음(드묾)—맥락이 우선.",
    "【격자 맵·미로·타일】board[r][c]에 '#', '.', 숫자·문자 타일만 있고 (dr,dc)로 4방/8방 이동·BFS/DFS·visited·키/문 비트마스크만 쓰면 strategy는 GRID 또는 GRID_LINEAR. graph_var_name은 비우고, board/map/maze/field를 GRAPH 패널(var_mapping)에 넣지 말 것 — 그것은 셀 격자이지 인접리스트 그래프가 아님.",
    "GRAPH·graph_var_name은 정점 번호 기반 인접리스트/딕트/간선 집합 등 ‘정점·간선’ 모델에만. 2D 맵 배열을 그래프 전략으로 분류하지 말 것.",
    "3차원 배열(list3d)은 기본적으로 GRAPH가 아니다. visited[y][x][z], dp[y][x][z], cost[y][x][z]처럼 상태공간/DP 텐서로 쓰이면 GRID_LINEAR 또는 GRID로 분류하고 graph_var_name에 넣지 말 것.",
    "좌표 축 표기는 x,y,z를 따른다. 1D 인덱스=i 대신 x, 2D는 (y,x), 3D는 (y,x,z) 맥락으로 이해해 key_vars/summary/var_mapping을 작성한다(변수명 자체를 강제하라는 뜻이 아님, 역할 해석 기준).",
    "dirs/DIRS/delta처럼 방향 벡터 목록 [(1,0),(-1,0),(0,1),(0,-1)] 은 GRID/GRAPH 본체가 아니라 정적 보조 변수다. var_mapping panel은 VARIABLES로 두고, 2D 격자로 오인해 GRID 패널에 배치하지 말 것.",
    "3D 배열 시각화 설명은 slice 기준으로 작성: xy(z=k), yz(x=k), xz(y=k)처럼 축 고정 슬라이스 관점. 그래프 토글 대상으로 안내하지 말 것.",
    "",
    "비트마스킹(<<, >>, &, |, ^, mask state DP 등) 사용 시 uses_bitmasking=true로 반환.",
    "가중치 그래프(예: graph = [[]...], graph[u].append([cost, v]) / (v, w) / edges with weight)는 반드시 GRAPH로 분류.",
    "다익스트라/프림: heapq+graph[now] 순회+거리 배열(distance)이면 strategy=GRAPH, graph_var_name=graph(또는 인접리스트 변수명), distance는 LINEAR 패널.",
    "가중치 그래프일 때 graph_var_name은 해당 인접리스트/간선 변수명으로 설정.",
    "GRAPH일 때 graph_representation도 함께 반환: 2D 인접행렬/격자형이면 GRID, dict/adjacency map 형태면 MAP.",
    "그래프(GRAPH)는 인접 리스트/딕트(graph[u]→이웃), 간선 리스트(edges), in_degree, BFS/DFS 탐색 등 '정점·간선' 모델일 때만.",
    "2차원 리스트가 숫자/스칼라만 담는 표(행렬 체인, 배낭, LCS, 플로이드 비용 등)면 GRID 또는 GRID_LINEAR이지 GRAPH가 아님.",
    "트리 parent/children 배열, union-find 부모 배열은 GRAPH가 아니라 LINEAR 또는 VARIABLES.",
    "가중치가 있으면 tags/detected_data_structures에 weighted graph 성격을 반영.",
    "GRAPH일 때 graph_mode는 반드시 directed 또는 undirected로 채운다.",
    "단방향 간선만 쓰는 경우(예: add(a,b) 한 번만, in_degree/in_degrees, 위상정렬·Kahn·DAG, 방향 최단경로): graph_mode=directed.",
    "무방향만 다루는 경우(예: 양쪽에 간선 추가, MST·Kruskal·Union-Find): graph_mode=undirected.",
    "DIRS/dirs/direction/delta 형태의 방향 벡터 맵은 GRAPH/GRID가 아닌 VARIABLES로 취급.",
    "tags 배열 값은 반드시 lower-kebab-case(소문자, 단어는 하이픈으로 연결, 공백 금지). 예: topological-sort, directed-graph.",
    "time_complexity: 코드 기준 최악 시간 복잡도 한 줄. Big-O 표기(예: O(n), O(n log n), O(V+E), O(n·m)). 변수는 코드에서 쓰인 기호(n,m,V,E 등)에 맞출 것.",
    "",
    "【선형 시각화·linear_pivots】UI는 변수 '이름'으로 역할을 추측하지 않는다. 맥락으로만 채운다. 각 항목에 pivot_mode를 반드시 구분한다.",
    "pivot_mode=index(생략 시 동일): var의 런타임 값이 정수 인덱스로 1차원 배열 첨자로 쓰인다(투포인터·슬라이딩 윈도우). 예: array[s], nums[i].",
    'pivot_mode=value_in_array: var의 값이 \'원소 값\'이고, 그 값과 같은 원소가 있는 1차원 배열 칸에 링을 그린다. indexes_1d_var는 그 배열 변수명(해당 스텝에서 시각화되는 리스트와 일치). 예: 퀵소트에서 pivot = tmpList[0]이면 [{"var_name":"pivot","pivot_mode":"value_in_array","indexes_1d_var":"tmpList","badge":"pv"}] — 변수명이 pivot이든 x든 코드 맥락으로만.',
    "여러 1차원 배열이 있으면 index·value_in_array 모두 indexes_1d_var를 채운다. 하나뿐이면 생략 가능.",
    '예(투포인터): [{"var_name":"s","pivot_mode":"index","indexes_1d_var":"array"},{"var_name":"e","pivot_mode":"index","indexes_1d_var":"array"}].',
    "linear_context_var_names: 스텝 요약 줄 스칼라(선택). 피벗 값 표시용으로 pivot을 넣을 수 있음.",
    "",
    "【special_var_kinds】코드에서 특수 자료구조로 쓰이는 변수가 있으면 반드시 채운다.",
    "핵심 원칙: 변수 '이름'이 아니라 코드에서 그 변수가 실제로 하는 '역할과 연산'으로만 판별한다. varTypes에 없는 변수명은 포함하지 말 것.",
    "HEAP: heapq.heappush/heappop이 이 변수에 직접 적용되고 우선순위 큐로 사용되는 경우.",
    "QUEUE: deque() 또는 list로 선언되고 .append()/.popleft() 또는 순서대로 front/back 삽입·삭제되는 BFS 큐.",
    "STACK: list로 .append()/.pop() 만 쓰이고 LIFO 스택으로 사용되는 경우(DFS 반복, 괄호, 단조 스택).",
    "DEQUE: deque()로 선언되고 양쪽(appendleft/popleft/append/pop)을 모두 사용하는 경우.",
    "UNIONFIND: find(x)/union(a,b) 형태로 쓰이는 부모 배열. rank/size 배열도 여기에 포함.",
    "VISITED: 방문 여부만 담는 bool/0-1 1D 배열. BFS·DFS에서 visited[node]=True/1로 표시.",
    "DISTANCE: 최단거리/비용 배열. 초기값 INF로 채우고 갱신하는 패턴(다익스트라·BFS 거리 등).",
    "PARENT_TREE: 트리의 부모 포인터 배열(parent[child]=parent_node). Union-Find가 아닌 일반 트리 탐색.",
    "BINARY_TREE: 1D 배열로 표현된 이진 트리/BST. 인덱스 i의 left=2i+1, right=2i+2(0-indexed) 또는 left=2i, right=2i+1(1-indexed). insert/search/inorder 등 트리 연산에 쓰임.",
    "SEGMENT_TREE: 구간 합/최솟값 쿼리를 위한 세그먼트 트리. 보통 크기 4*n 배열로 build/query/update 패턴.",
    "해당 없으면 {}.",
    "",
    "출력 JSON 스키마:",
    '{"algorithm":"string","display_name":"string","strategy":"GRID|LINEAR|GRID_LINEAR|GRAPH","key_vars":["string"],"var_mapping_list":[{"role":"string","var_name":"string","panel":"GRID|LINEAR|GRAPH|VARIABLES"}],"tags":["string"],"detected_data_structures":["string"],"detected_algorithms":["string"],"graph_mode":"directed|undirected","graph_var_name":"string","graph_representation":"GRID|MAP","uses_bitmasking":"boolean","time_complexity":"string","linear_pivots":[{"var_name":"string","badge":"string","indexes_1d_var":"string","pivot_mode":"index|value_in_array"}],"linear_context_var_names":["string"],"special_var_kinds":{"var_name":"HEAP|QUEUE|STACK|DEQUE|UNIONFIND|VISITED|DISTANCE|PARENT_TREE|BINARY_TREE|SEGMENT_TREE"},"summary":"string"}',
    "",
    `[code]\n${compactCode}`,
    "",
    `[varTypes]\n${JSON.stringify(compactTypes)}`,
  ].join("\n");

  const geminiOpts: GeminiOptions = {
    responseSchema: ANALYZE_GEMINI_SCHEMA,
    maxOutputTokens: 8192,
  };

  const parseAndPostProcess = (raw: string) => {
    const parsed = tryParseJson<AnalyzeAiResponse>(raw);
    if (!parsed) {
      const preview = stripCodeFence(raw).slice(0, 500);
      console.error("[/api/analyze] parse failed raw preview:", preview);
      throw new Error("ANALYZE_PARSE_FAILED");
    }
    const normalized = normalizeResponse(parsed, varTypes);
    const withPartitionPivots = enrichAnalyzeMetadataWithPartitionValuePivots(
      normalized,
      code,
      varTypes,
    );
    const withLang = applyLanguageEnricher(withPartitionPivots, code, varTypes, language);
    const guarded = applyDirectionMapGuards(withLang, code);
    const withGraphMode = applyGraphModeInference(guarded, code);
    return enrichLinearPivots(withGraphMode, code, varTypes);
  };

  const raw = await callWithFallback(prompt, chain, geminiOpts);
  return parseAndPostProcess(raw);
}

export async function POST(req: NextRequest) {
  let code = "";
  let varTypes: Record<string, string> = {};
  let language = "python";
  try {
    const body = await req.json();
    code = String(body?.code ?? "");
    varTypes = (body?.varTypes ?? {}) as Record<string, string>;
    language = String(body?.language ?? "python");
    // console.log(
    //   "[POST /api/analyze] Input - language:",
    //   language,
    //   "varTypes:",
    //   Object.keys(varTypes).slice(0, 5),
    //   "codeLength:",
    //   code.length,
    // );
    if (code.trim().length === 0) {
      return NextResponse.json(
        { message: "code is required" },
        { status: 400 },
      );
    }
    const metadata = await analyzeWithAi(code, varTypes, language);
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[/api/analyze] ok",
        `language=${language}`,
        `tags=${(metadata.tags ?? []).slice(0, 8).join(",")}`,
      );
    }
    return NextResponse.json(metadata);
  } catch (error) {
    // Keep fallback behavior, but log root cause for debugging.
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      "[/api/analyze] fallback triggered:",
      message,
      "Stack:",
      error instanceof Error ? error.stack : "",
    );
    return NextResponse.json(
      fallbackAnalyzeMetadata(varTypes, code, language),
      {
        status: 200,
      },
    );
  }
}
