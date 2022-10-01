import * as lang from "./lang";
import * as rt from "../shared/runtime";
import { StringBuf } from "../shared/util";

export interface Expr {
	src: string,
	code: string,
	fndecl?: boolean,
	origin?: string,
	lineNr?: number,
}

export function isDynamic(s: any) {
  let i;
	return (
    s != null && typeof s === 'string' &&
    (i = s.indexOf(lang.EXPR_MARKER1)) >= 0 &&
    s.indexOf(lang.EXPR_MARKER2) > i
  );
}

export function parseExpr(s: string, origin?: string, lineNr = 1): Expr {
	var src = prepareExpr(s);
	var expr = { src: src, code: '', origin: origin, lineNr: lineNr };
	return expr;
}

export function prepareExpr(s: string): string {
	var sb = new StringBuf();
	var sep = '';
	var exprStart, exprEnd;
	if (s.startsWith(lang.EXPR_MARKER1) && s.endsWith(lang.EXPR_MARKER2)) {
		exprStart = exprEnd = '';
	} else {
		exprStart = rt.NOTNULL_FN + '(';
		exprEnd = ')';
	}
	var i = 0, i1, i2;
	while ((i1 = s.indexOf(lang.EXPR_MARKER1, i)) >= 0
			&& (i2 = s.indexOf(lang.EXPR_MARKER2, i1)) >= 0) {
		while ((i2 + 2) < s.length && s.charAt(i2 + 2) === ']') i2++;
		sb.add(sep); sep = '+';
		if (i1 > i) {
			sb.add("'" + escape(s.substring(i, i1)) + "'+");
		}
		sb.add(exprStart);
		sb.add(s.substring(i1 + lang.EXPR_MARKER1_LEN, i2));
		sb.add(exprEnd);
		i = i2 + lang.EXPR_MARKER2_LEN;
	}
	if (i < s.length || sep === '') {
		sb.add(sep);
		sb.add("'" + escape(s.substr(i)) + "'");
	}
	return sb.toString();
}

function escape(s: string): string {
	s = s.replace(/\\/g, "\\\\");
	s = s.replace(/'/g, "\\'");
	s = s.replace(/"/g, '\\"');
	s = s.replace(/\n/g, '\\n');
	s = s.replace(/\r/g, '\\r');
	return s;
}
