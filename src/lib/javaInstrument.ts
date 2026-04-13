// ─── 헬퍼 코드 (class 첫 번째 { 직후 삽입) ────────────────────────────────────
const HELPER = [
  "  static int __step=0;",
  "  static int __depth=0;",
  "  static String __func=\"main\";",
  "  static java.util.ArrayDeque<String> __fs=new java.util.ArrayDeque<>();",
  "  static void __en(String f){__fs.push(__func);__func=f;__depth++;}",
  "  static void __ex(){__func=__fs.isEmpty()?\"main\":__fs.pop();if(__depth>0)__depth--;}",
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
  "    if(o instanceof StringBuilder||o instanceof StringBuffer){",
  "      return \"\\\"\"+o.toString().replace(\"\\\\\",\"\\\\\\\\\").replace(\"\\\"\",\"\\\\\\\"\").replace(\"\\n\",\"\\\\n\")+\"\\\"\";",
  "    }",
  "    if(o instanceof java.util.Collection){",
  "      StringBuilder b=new StringBuilder(\"[\");boolean f=true;",
  "      for(Object x:(java.util.Collection<?>)o){if(!f)b.append(\",\");b.append(__s(x));f=false;}",
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
  "    sb.append(\"{\\\"step\\\":\").append(__step++).append(\",\\\"line\\\":\").append(line)",
  "      .append(\",\\\"func\\\":\\\"\").append(__func).append(\"\\\",\\\"depth\\\":\").append(__depth)",
  "      .append(\",\\\"vars\\\":{\");",
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

/**
 * 정규화 결과 + normalized line index → original line number(1-based) 매핑 반환.
 * 원본 \n은 originalLine을 증가시키고, 인위적으로 삽입된 \n은 현재 originalLine을 유지.
 */
function normalizeJava(code: string): { normalized: string; lineMap: number[] } {
  let out   = "";
  let paren = 0;
  let inStr = false;
  let inChar = false;
  let escape = false;

  // lineMap[i] = normalized 코드의 i번째 줄(0-based)이 대응하는 원본 라인(1-based)
  const lineMap: number[] = [1];
  let origLine = 1;

  const pushNewline = (isOriginal: boolean) => {
    out += "\n";
    if (isOriginal) origLine++;
    lineMap.push(origLine);
  };

  for (let i = 0; i < code.length; i++) {
    const c    = code[i];
    const next = code[i + 1] ?? "";

    if (escape)                         { out += c; escape = false; continue; }
    if (c === "\\" && (inStr || inChar)) { out += c; escape = true; continue; }
    if (c === '"'  && !inChar)           { inStr  = !inStr;  out += c; continue; }
    if (c === "'"  && !inStr)            { inChar = !inChar; out += c; continue; }
    if (inStr || inChar)                 { out += c; continue; }

    if (c === "\n") { pushNewline(true); continue; }

    if (c === "(") paren++;
    if (c === ")") paren--;

    out += c;

    if (c === "{") {
      if (!isInitializerBrace(out.slice(0, -1)) && next !== "\n") pushNewline(false);
      continue;
    }
    if (c === "}" && next && next !== "\n" && next !== ";" && next !== ",") {
      pushNewline(false); continue;
    }
    if (c === ";" && paren === 0 && next !== "\n") pushNewline(false);
  }

  return { normalized: out, lineMap };
}

// ─── 변수 선언 / 대입 감지 정규식 ─────────────────────────────────────────────

const PRIM = "int|long|double|float|boolean|char|byte|short";

// 기본형 외 모든 Java 클래스를 포괄한다 (대문자로 시작하는 식별자).
// 특정 클래스 목록으로 제한하지 않는 이유:
//   - 계측기가 "이 타입은 추적할 가치 없다"고 선제 판단하면 AI가 해당 변수를
//     아예 볼 수 없어 맥락 판단 자체가 불가능해진다.
//   - Python/JS worker는 모든 로컬 변수를 캡처한다 — Java도 동등해야 한다.
//   - BufferedReader, StringBuilder, Scanner 등 I/O 클래스도 포함해야
//     AI가 전체 변수 집합을 보고 역할을 판단할 수 있다.
const CLS = "[A-Z][A-Za-z0-9_]*";

// 클래스 레벨 static 필드 선언 (메서드 밖):
//   [access] static [final] type[<G>][[][]] name ...
const STATIC_FIELD_RE = new RegExp(
  `^\\s+(?:(?:private|public|protected)\\s+)?static\\s+(?:final\\s+)?` +
  `(?:${PRIM}|${CLS})(?:<[^>]*>)?(?:\\[\\])*\\s+(\\w+)(?:\\[\\])*`,
);

// 지역변수 선언:  [final] type[<G>][[] ...] name[[] ...] =
const VAR_DECL_RE = new RegExp(
  `^\\s+(?:(?:final|static)\\s+)?` +
  `(?:${PRIM}|${CLS})` +
  `(?:<[^>]*>)?` +
  `(?:\\[\\])*\\s+(\\w+)(?:\\[\\])*\\s*=`,
);

// for 루프 변수: for (type name = | for (type name :
// 기본형 외에 향상된 for 문의 클래스 타입도 포함 (for (String line : lines))
const FOR_VAR_RE = new RegExp(
  `^\\s*for\\s*\\(\\s*(?:${PRIM}|${CLS}(?:<[^>]*>)?(?:\\[\\])*)\\s+(\\w+)\\s*[=:]`,
);

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
  if (all.length === 0) return `__t(${lineNum});`;
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
 *
 * @returns instrumented 코드 문자열과 계기화된 라인 → 원본 라인 매핑 배열.
 *          resultLineMap[i] = 계기화 코드 i번째 줄(0-based)의 원본 라인(1-based).
 */
export function instrumentJavaCode(code: string): { instrumented: string; resultLineMap: number[] } {
  const { normalized, lineMap } = normalizeJava(code);
  const lines                   = normalized.split("\n");
  const result: string[] = [];
  const resultLineMap: number[] = [];

  // 원본 라인 번호를 추적하며 result에 push
  let _currentOrigLine = 1;
  const push = (line: string, origLine?: number) => {
    result.push(line);
    resultLineMap.push(origLine ?? _currentOrigLine);
    if (origLine !== undefined) _currentOrigLine = origLine;
  };
  const pop = () => { result.pop(); resultLineMap.pop(); };

  let helperInjected    = false;
  let braceDepth        = 0;
  let inClassBody       = false;
  let inMethod          = false;
  let methodDepth       = 0;
  let currentMethodName = "main";
  let currentMethodIsVoid = false;

  // 클래스 레벨 static 필드 — 모든 __t() 에 항상 포함
  const classVars: string[] = [];
  // depth 포함 로컬 스코프 추적 — 블록 이탈 시 해당 depth 변수 자동 제거
  const scopeVars: ScopeVar[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line    = lines[i];
    const lineNum = lineMap[i] ?? (i + 1);  // 원본 라인 번호 사용
    const trimmed = line.trim();

    const opens  = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;

    // ── 헬퍼 주입: class ... { 라인 직후 ──────────────────────────────────────
    if (!helperInjected && /\bclass\s+\w/.test(line) && line.includes("{")) {
      push(line, lineNum);
      for (const hLine of HELPER.split("\n")) push(hLine, lineNum);
      helperInjected = true;
      braceDepth += opens - closes;
      inClassBody = true;
      continue;
    }

    // ── 클래스 레벨 static 필드 감지 (메서드 밖) ──────────────────────────────
    if (inClassBody && !inMethod) {
      const fieldMatch = line.match(STATIC_FIELD_RE);
      // __step/__s/__t 헬퍼 자신은 제외
      // 메서드 선언 제외: match 직후 문자열이 ( 로 시작하면 메서드 선언
      if (fieldMatch && !fieldMatch[1].startsWith("__")) {
        const afterMatch = line.slice((fieldMatch.index ?? 0) + fieldMatch[0].length);
        if (!/^\s*\(/.test(afterMatch) && !classVars.includes(fieldMatch[1])) {
          classVars.push(fieldMatch[1]);
        }
      }
    }

    // ── 메서드 진입 감지 ───────────────────────────────────────────────────────
    let isMethodEntryLine = false;
    if (
      inClassBody && !inMethod &&
      /\b(?:void|int|long|double|float|boolean|char|String)\b/.test(line) &&
      /\)\s*(?:throws\s+[\w,\s]+)?\s*\{/.test(line)
    ) {
      // 메서드 이름: ( 앞의 마지막 식별자
      const allMatches = [...line.matchAll(/(\w+)\s*\(/g)];
      currentMethodName   = allMatches.length > 0 ? allMatches[allMatches.length - 1][1] : "main";
      currentMethodIsVoid = /\bvoid\b/.test(line);
      inMethod            = true;
      methodDepth         = braceDepth + opens - closes;
      isMethodEntryLine   = true;
    }

    push(line, lineNum);
    braceDepth += opens - closes;

    // ── 블록 이탈: depth 감소 시 해당 depth 로컬 변수 제거 ────────────────────
    for (let j = scopeVars.length - 1; j >= 0; j--) {
      if (scopeVars[j].depth > braceDepth) scopeVars.splice(j, 1);
    }

    // ── 메서드 이탈 감지: 닫는 } 앞에 void 암묵적 return 처리 ─────────────────
    if (inMethod && braceDepth < methodDepth) {
      if (currentMethodIsVoid) {
        // unreachable 방지: depth>0 일 때만 __ex()
        const closingBrace = result.pop()!; resultLineMap.pop();
        push(`${leadingSpaces(line)}if(__depth>0)__ex();`, lineNum);
        push(closingBrace, lineNum);
      }
      inMethod = false;
      scopeVars.length = 0;
      continue;
    }

    // ── 계측 삽입 (메서드 내부, 모든 statement) ────────────────────────────────
    if (!inMethod) continue;
    // 메서드 진입 라인 직후: __en 삽입
    if (isMethodEntryLine) {
      push(`${leadingSpaces(line)}__en("${currentMethodName}");`, lineNum);
      continue;
    }
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    // 순수 블록 경계 라인은 statement가 아님
    if (trimmed === "{" || trimmed === "}") continue;

    // for 루프 변수: { 있는 블록 for문만 scopeVars에 추적
    const forMatch = line.match(FOR_VAR_RE);
    if (forMatch) {
      if (opens > 0) {
        const v = forMatch[1];
        if (!scopeVars.find(sv => sv.name === v)) scopeVars.push({ name: v, depth: braceDepth });
      }
      push(`${leadingSpaces(line)}${makeTraceCall(lineNum, classVars, scopeVars, braceDepth)}`, lineNum);
      continue;
    }

    // 지역변수 선언: scopeVars에 추가 후 __t
    const declMatch = line.match(VAR_DECL_RE);
    if (declMatch) {
      const v = declMatch[1];
      if (!scopeVars.find(sv => sv.name === v)) scopeVars.push({ name: v, depth: braceDepth });
      push(`${leadingSpaces(line)}${makeTraceCall(lineNum, classVars, scopeVars, braceDepth)}`, lineNum);
      continue;
    }

    // 나머지 모든 statement (대입, if, while, return, 메서드 호출 등) — 모두 __t 삽입
    // continue / break / return / throw: 뒤에 삽입하면 unreachable → __t를 앞으로 이동
    if (/^(?:continue|break|return|throw)\b/.test(trimmed)) {
      const jumpLine = result.pop()!; resultLineMap.pop();
      push(`${leadingSpaces(line)}${makeTraceCall(lineNum, classVars, scopeVars, braceDepth)}`, lineNum);
      push(`${leadingSpaces(line)}__ex();`, lineNum);
      push(jumpLine, lineNum);
    } else {
      push(`${leadingSpaces(line)}${makeTraceCall(lineNum, classVars, scopeVars, braceDepth)}`, lineNum);
    }
  }

  return { instrumented: result.join("\n"), resultLineMap };
}
