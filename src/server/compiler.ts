import { parseScript } from "esprima";
import * as es from "estree";
import * as rt from "../shared/runtime";
import * as code from "./code";
import * as expr from "./expr";
import * as lang from "./lang";
import * as pre from "./preprocessor";

interface Context {
  nextId: number
}

/**
 * @see rt.AppState
 */
 export function compileApp(app: lang.App): es.ObjectExpression | null {
  if (app.root) {
    return {
      type: "ObjectExpression",
      properties: [
        makeProperty('root', compileNode(app.root, app))
      ],
    };
  } else {
    return null;
  }
}

function addError(type: 'err' | 'warn', cat: string, ex: any, app: lang.App, startPos?: pre.SourcePos) {
  let error: lang.Error;
  if (ex.lineNumber && ex.column && ex.description && startPos) {
    const ln = ex.lineNumber + startPos.line1 - 1;
    const col = ex.column + (ex.lineNumber < 2 ? startPos.column1 - 1 : 0);
    error = {
      type: type,
      msg: `${cat}: ${ex.description}`,
      pos: {
        fname: startPos.fname,
        line1: ln,
        line2: ln,
        column1: col,
        column2: col
      }
    }
  } else {
    error = {
      type: type,
      msg: `${cat} error: ${ex.description}`
    }
  }
  app.errors.push(error);
}

function makeProperty(name: string, value: es.Expression | es.Literal): es.Property {
  return {
    type: "Property",
    kind: "init",
    computed: false,
    shorthand: false,
    method: false,
    key: { type: "Identifier", name: name },
    value: value
  };
}

/**
 * @see rt.ScopeState
 */
 function compileNode(node: lang.Node, app: lang.App): es.ObjectExpression {
  const p: es.Property[] = [];
  p.push(makeProperty('id', { type: 'Literal', value: node.id }));
  node.aka && p.push(makeProperty('aka', { type: 'Literal', value: node.aka }));
  p.push(makeProperty('values', compileValues(node, app)));
  if (node.children && node.children.length > 0) {
    p.push(makeProperty('children', compileChildren(node, app)));
  }
  return {
    type: "ObjectExpression",
    properties: p,
  };
}

function compileChildren(node: lang.Node, app: lang.App): es.ArrayExpression {
  const e: es.ObjectExpression[] = [];
  node.children.forEach(child => {
    e.push(compileNode(child, app));
  });
  return {
    type: "ArrayExpression",
    elements: e
  };
}

function compileValues(node: lang.Node, app: lang.App): es.ObjectExpression {
  const p: es.Property[] = [];
  node.props.forEach((prop, key) => {
    if (key.startsWith(lang.LOGIC_ATTR_PREFIX)) {
      key = key.substring(lang.LOGIC_ATTR_PREFIX.length);
    } else if (key.startsWith(rt.TEXT_ID_PREFIX)) {
      // nop
    } else {
      key = rt.ATTR_VALUE_PREFIX + key;
    }
    const v = compileValue(key, prop, node, app);
    p.push(makeProperty(v.key, v.obj));
  });
  return {
    type: "ObjectExpression",
    properties: p,
  };
}

/**
 * @see rt.ValueState
 */
function compileValue(
  key: string, prop: lang.Prop, node: lang.Node, app: lang.App
): { key: string, obj: es.ObjectExpression } {
  const p: es.Property[] = [];

  if (expr.isDynamic(prop.val)) {
    const refs = new Set<string>();
    const e = compileExpression(prop, node, app, refs);
    e && p.push(makeProperty('fn', e));
    if (refs.size > 0) {
      const a: es.ArrayExpression = {
        type: 'ArrayExpression',
        elements: []
      }
      refs.forEach(id => a.elements.push({ type: 'Literal', value: id }));
      p.push(makeProperty('refs', a));
    }
  } else {
    p.push(makeProperty('v', { type: 'Literal', value: prop.val }));
  }

  if (key.startsWith(rt.ATTR_VALUE_PREFIX)) {
    p.push(makeProperty('t', { type: 'Literal', value: 'attribute'}));
    p.push(makeProperty('k', { type: 'Literal', value: key.substring(rt.ATTR_VALUE_PREFIX.length)}));
  } else if (key.startsWith(rt.TEXT_ID_PREFIX)) {
    p.push(makeProperty('t', { type: 'Literal', value: 'text'}));
    p.push(makeProperty('k', { type: 'Literal', value: key.substring(rt.TEXT_ID_PREFIX.length)}));
  } else if (key.startsWith(lang.EVENT_ATTR_PREFIX)) {
    const eventName = key.substring(lang.EVENT_ATTR_PREFIX.length);
    key = rt.EVENT_VALUE_PREFIX + eventName;
    p.push(makeProperty('t', { type: 'Literal', value: 'event'}));
    p.push(makeProperty('k', { type: 'Literal', value: eventName}));
  }

  return {
    key: key,
    obj: { type: "ObjectExpression", properties: p }
  };
}

function compileExpression(
  prop: lang.Prop, node: lang.Node, app: lang.App, refs: Set<string>
): es.FunctionExpression | undefined {
  let ast: es.Program | undefined;


  try {
    if (prop.pos) {
      const exp = expr.parseExpr(prop.val, prop.pos.fname, prop.pos.line1);
      ast = parseScript(exp.src, { loc: true });
    } else {
      const exp = expr.parseExpr(prop.val);
      ast = parseScript(exp.src);
    }
  } catch (ex: any) {
    addError('err', 'expression parsing', ex, app, prop.pos);
  }

  const ret = ast ? code.makeFunction(ast, refs) : undefined;
  return ret;
}
