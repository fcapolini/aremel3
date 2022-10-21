
export class StringBuf {
  parts: string[];

  constructor() {
    this.parts = [];
  }

  add(s: string) {
    this.parts.push(s);
  }

  toString() {
    return this.parts.join('');
  }
}

export function normalizeText(s?: string): string | undefined {
  return s?.split(/\n\s+/).join('\n').split(/\s{2,}/).join(' ');
}

export function normalizeSpace(s?: string): string | undefined {
  return s?.split(/\s+/).join(' ');
}

// export function makeCamelName(n: string): string {
//   // @ts-ignore
//   return new EReg('(\\-\\w)', 'g').map(n, function (re: EReg): string {
//     return n.substr(re.matchedPos().pos + 1, 1).toUpperCase();
//   });
// }

// export function makeHyphenName(n: string): string {
//   // @ts-ignore
//   return new EReg('([0-9a-z][A-Z])', 'g').map(n, function (re: EReg): string {
//     var p = re.matchedPos().pos;
//     return n.substr(p, 1).toLowerCase() + '-' + n.substr(p + 1, 1).toLowerCase();
//   });
// }
