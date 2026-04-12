// ─── 헬퍼 코드 (class 첫 번째 { 직후 삽입) ────────────────────────────────────
const HELPER = [
  "  static int __step=0;",
  "  static String __s(Object o){",
  "    if(o==null)return \"null\";",
  "    if(o instanceof Boolean||o instanceof Number)return String.valueOf(o);",
  "    if(o instanceof int[])return java.util.Arrays.toString((int[])o);",
  "    if(o instanceof long[])return java.util.Arrays.toString((long[])o);",
  "    if(o instanceof double[])return java.util.Arrays.toString((double[])o);",
  "    if(o instanceof boolean[])return java.util.Arrays.toString((boolean[])o);",
  "    if(o instanceof int[][])return java.util.Arrays.deepToString((int[][])o);",
  "    if(o instanceof long[][])return java.util.Arrays.deepToString((long[][])o);",
  "    if(o instanceof Object[])return java.util.Arrays.deepToString((Object[])o);",
  "    if(o instanceof java.util.List){",
  "      StringBuilder b=new StringBuilder(\"[\");boolean f=true;",
  "      for(Object x:(java.util.List<?>)o){if(!f)b.append(\",\");b.append(__s(x));f=false;}",
  "      return b.append(\"]\").toString();",
  "    }",
  "    if(o instanceof java.util.Map){",
  "      StringBuilder b=new StringBuilder(\"{\");boolean f=true;",
  "      for(java.util.Map.Entry<?,?> e:((java.util.Map<?,?>)o).entrySet()){",
  "        if(!f)b.append(\",\");",
  "        b.append(\"\\\"\").append(e.getKey()).append(\"\\\":\").append(__s(e.getValue()));f=false;",
  "      }",
  "      return b.append(\"}\").toString();",
  "    }",
  "    String s=o.toString();",
  "    return \"\\\"\"+s.replace(\"\\\\\",\"\\\\\\\\\").replace(\"\\\"\",\"\\\\\\\"\").replace(\"\\n\",\"\\\\n\")+\"\\\"\";",
  "  }",
  "  static void __t(int line,Object...kv){",
  "    StringBuilder sb=new StringBuilder();",
  "    sb.append(\"{\\\"step\\\":\").append(__step++).append(\",\\\"line\\\":\").append(line).append(\",\\\"vars\\\":{\");",
  "    for(int i=0;i+1<kv.length;i+=2){",
  "      if(i>0)sb.append(\",\");",
  "      sb.append(\"\\\"\").append(kv[i]).append(\"\\\":\").append(__s(kv[i+1]));",
  "    }",
  "    System.err.println(sb.append(\"}}\"));",
  "  }",
].join("\n");

// ─── 코드 정규화 ───────────────────────────────────────────────────────────────
// { } ; 를 기준으로 줄 바꿈을 보장해 라인별 계측이 동작하게 한다.
// 문자열/문자 리터럴 내부와 for() 괄호 안 세미콜론은 건드리지 않는다.

// `{` 앞의 마지막 비공백 문자를 찾아 배열/객체 리터럴 여부 판별
function isInitializerBrace(builtSoFar: string): boolean {
  for (let j = builtSoFar.length - 1; j >= 0; j--) {
    const ch = builtSoFar[j];
    if (ch === " " || ch === "\t" || ch === "\n") continue;
    // = 뒤: 배열/객체 초기화  ({ 뒤: 다차원 배열  ( 뒤: 메서드 인자 내 리터럴
    return ch === "=" || ch === "{" || ch === "(" || ch === ",";
  }
  return false;
}

function normalizeJava(code: string): string {
  let out   = "";
  let paren = 0;   // () 깊이 — for(;;) 세미콜론 보호
  let inStr = false;
  let inChar = false;
  let escape = false;

  for (let i = 0; i < code.length; i++) {
    const c    = code[i];
    const next = code[i + 1] ?? "";

    if (escape)                       { out += c; escape = false; continue; }
    if (c === "\\" && (inStr || inChar)) { out += c; escape = true; continue; }
    if (c === '"'  && !inChar)          { inStr  = !inStr;  out += c; continue; }
    if (c === "'"  && !inStr)           { inChar = !inChar; out += c; continue; }
    if (inStr || inChar)                { out += c; continue; }

    if (c === "(") paren++;
    if (c === ")") paren--;

    out += c;

    if (c === "{") {
      // 배열/객체 리터럴 초기화자는 줄 바꾸지 않음
      if (!isInitializerBrace(out.slice(0, -1)) && next !== "\n") out += "\n";
      continue;
    }
    if (c === "}" && next && next !== "\n" && next !== ";" && next !== ",") {
      out += "\n"; continue;
    }
    if (c === ";" && paren === 0 && next !== "\n") out += "\n";
  }

  return out;
}

// ─── 변수 선언 / 대입 감지 정규식 ─────────────────────────────────────────────

const PRIM   = "int|long|double|float|boolean|char|byte|short";
const OBJ    = [
  "String","Integer","Long","Double","Float","Boolean","Character",
  "ArrayList","LinkedList","HashMap","TreeMap","HashSet","TreeSet",
  "LinkedHashMap","LinkedHashSet","Stack","Deque","ArrayDeque","PriorityQueue",
].join("|");

// 클래스 레벨 static 필드 선언 (메서드 밖):
//   [access] static [final] type[<G>][[][]] name ...
const STATIC_FIELD_RE = new RegExp(
  `^\\s+(?:(?:private|public|protected)\\s+)?static\\s+(?:final\\s+)?` +
  `(?:${PRIM}|${OBJ})(?:<[^>]*>)?(?:\\[\\])*\\s+(\\w+)(?:\\[\\])*`,
);

// 지역변수 선언:  [final] type[<G>][[] ...] name[[] ...] =
const VAR_DECL_RE = new RegExp(
  `^\\s+(?:(?:final|static)\\s+)?` +
  `(?:${PRIM}|${OBJ})` +
  `(?:<[^>]*>)?` +
  `(?:\\[\\])*\\s+(\\w+)(?:\\[\\])*\\s*=`,
);

// for 루프 변수: for (type name = | for (type name :
const FOR_VAR_RE = new RegExp(
  `^\\s*for\\s*\\(\\s*(?:${PRIM})\\s+(\\w+)\\s*[=:]`,
);

// 순수 대입: name = | name[...] = | name[...][...] =
const ASSIGN_RE = /^\s*(\w+)(?:\[[^\]]*\])*\s*(?:\+|-|\*|\/|%|&|\||\^|<<|>>|>>>)?=(?!=)/;

// System.out.print* / System.err.print* 호출
const PRINT_RE = /^\s*System\.(?:out|err)\.print(?:ln|f)?\s*\(/;

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

function leadingSpaces(line: string): string {
  return (line.match(/^(\s*)/) ?? ["", ""])[1] + "  ";
}

interface ScopeVar { name: string; depth: number; }

function makeTraceCall(
  lineNum: number,
  classVars: string[],   // 클래스 레벨 static 필드 (항상 포함)
  scopeVars: ScopeVar[],
  currentDepth: number,
): string {
  const localActive = scopeVars.filter(v => v.depth <= currentDepth).map(v => v.name);
  const all = [...classVars, ...localActive];
  if (all.length === 0) return "";
  return `__t(${lineNum}, ${all.map(n => `"${n}", ${n}`).join(", ")});`;
}

// ─── 메인 함수 ─────────────────────────────────────────────────────────────────

/**
 * Java 소스 코드에 트레이스 계측 코드를 삽입한다.
 *
 * - class 첫 번째 { 직후에 __step/__s/__t 헬퍼를 주입한다.
 * - static 필드(classVars)를 감지해 모든 __t() 호출에 포함시킨다.
 * - 각 지역변수 선언/대입문 뒤에 __t(lineNum, ...) 를 삽입한다.
 * - depth 기반 스코프 추적: { 진입 시 depth 증가, } 이탈 시 해당 depth 변수 제거.
 */
export function instrumentJavaCode(code: string): string {
  const normalized = normalizeJava(code);
  const lines      = normalized.split("\n");
  const result: string[] = [];

  let helperInjected = false;
  let braceDepth     = 0;
  let inClassBody    = false;
  let inMethod       = false;
  let methodDepth    = 0;

  // 클래스 레벨 static 필드 — 모든 __t() 에 항상 포함
  const classVars: string[] = [];
  // depth 포함 로컬 스코프 추적 — 블록 이탈 시 해당 depth 변수 자동 제거
  const scopeVars: ScopeVar[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    const opens  = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;

    // ── 헬퍼 주입: class ... { 라인 직후 ──────────────────────────────────────
    if (!helperInjected && /\bclass\s+\w/.test(line) && line.includes("{")) {
      result.push(line);
      result.push(HELPER);
      helperInjected = true;
      braceDepth += opens - closes;
      inClassBody = true;
      continue;
    }

    // ── 클래스 레벨 static 필드 감지 (메서드 밖) ──────────────────────────────
    if (inClassBody && !inMethod) {
      const fieldMatch = line.match(STATIC_FIELD_RE);
      // __step/__s/__t 헬퍼 자신은 제외
      if (fieldMatch && !fieldMatch[1].startsWith("__")) {
        if (!classVars.includes(fieldMatch[1])) classVars.push(fieldMatch[1]);
      }
    }

    // ── 메서드 진입 감지 ───────────────────────────────────────────────────────
    if (
      inClassBody && !inMethod &&
      /\b(?:void|int|long|double|float|boolean|char|String)\b/.test(line) &&
      /\)\s*(?:throws\s+[\w,\s]+)?\s*\{/.test(line)
    ) {
      inMethod    = true;
      methodDepth = braceDepth + opens - closes;
    }

    result.push(line);
    braceDepth += opens - closes;

    // ── 블록 이탈: depth 감소 시 해당 depth 로컬 변수 제거 ────────────────────
    for (let j = scopeVars.length - 1; j >= 0; j--) {
      if (scopeVars[j].depth > braceDepth) scopeVars.splice(j, 1);
    }

    // ── 메서드 이탈 감지 ───────────────────────────────────────────────────────
    if (inMethod && braceDepth < methodDepth) {
      inMethod = false;
      continue;
    }

    // ── 계측 삽입 (메서드 내부만) ──────────────────────────────────────────────
    if (!inMethod) continue;
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    // for 루프 변수: { 있는 블록 for문만 추적 (단일 라인 for문은 { 없으므로 제외)
    const forMatch = line.match(FOR_VAR_RE);
    if (forMatch) {
      if (opens > 0) {
        const v = forMatch[1];
        if (!scopeVars.find(sv => sv.name === v)) scopeVars.push({ name: v, depth: braceDepth });
      }
      continue;
    }

    // 지역변수 선언
    const declMatch = line.match(VAR_DECL_RE);
    if (declMatch) {
      const v = declMatch[1];
      if (!scopeVars.find(sv => sv.name === v)) scopeVars.push({ name: v, depth: braceDepth });
      const call = makeTraceCall(lineNum, classVars, scopeVars, braceDepth);
      if (call) result.push(`${leadingSpaces(line)}${call}`);
      continue;
    }

    // 대입문: 로컬 변수 또는 클래스 static 필드에 대한 대입 모두 캡처
    const assignMatch = line.match(ASSIGN_RE);
    if (assignMatch) {
      const varName    = assignMatch[1];
      const isLocal    = scopeVars.some(sv => sv.name === varName && sv.depth <= braceDepth);
      const isClassVar = classVars.includes(varName);
      if (isLocal || isClassVar) {
        const call = makeTraceCall(lineNum, classVars, scopeVars, braceDepth);
        if (call) result.push(`${leadingSpaces(line)}${call}`);
      }
      continue;
    }

    // System.out.print* — 출력 라인도 스텝으로 포함
    if (PRINT_RE.test(line)) {
      const call = makeTraceCall(lineNum, classVars, scopeVars, braceDepth);
      if (call) result.push(`${leadingSpaces(line)}${call}`);
    }
  }

  return result.join("\n");
}
