# 행렬 거듭제곱 (피보나치) — JavaScript

```javascript
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').trim().split('\n');

const MOD = 1000000007n;

function matMul(A, B) {
  const n = A.length;
  const C = Array.from({length: n}, () => new Array(n).fill(0n));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;
  return C;
}

function matPow(M, p) {
  const n = M.length;
  let result = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => i === j ? 1n : 0n));
  while (p > 0n) {
    if (p % 2n === 1n) result = matMul(result, M);
    p /= 2n;
    M = matMul(M, M);
  }
  return result;
}

const n = BigInt(lines[0].trim());
if (n === 0n) {
  console.log('0');
} else {
  const M = [[1n, 1n], [1n, 0n]];
  console.log(String(matPow(M, n)[0][1]));
}
```

입력

```
10
```

출력

```
55
```
