export const range = (start, end) => [...Array(end - start).keys()].map(v => start + v)
export const squared = x => x * x
export const transposeMatrix = m => m[0].map((x, i) => m.map(x => x[i]))
export const zipMatrices = (...rows) => [...rows[0]].map((_, c) => rows.map(row => row[c]))
export const splitNewlines = (str) => str.split(/[\r\n]+/)

export const matrix = (m, n) => Array.from({ length: m }, () => new Array(n).fill(0))