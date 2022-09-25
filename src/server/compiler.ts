import { parseScript } from "esprima";
import * as es from "estree";
import * as lang from "./lang";
import * as rt from "../shared/runtime";

interface Context {
  nextId: number
}

export function compile(app: lang.App): es.Program {
  const err: lang.Error[] = [];

  const ret = parseScript(`(function() {
    function ${rt.NOTNULL_FN}(s) { return s != null ? s : '' }
  })();`);

  const expr = ret.body[0].type === 'ExpressionStatement' ? ret.body[0] : null;
  const func = expr ? (expr.expression as es.CallExpression).callee : null;
  const blck = func ? (func as es.FunctionExpression).body : null;
  const body = blck ? blck.body : null;

  app.root && body && compileNode(app.root, body, err);

  return ret;
}

function compileNode(node: lang.Node, body: es.Statement[], err: lang.Error[]) {
  // body.push({
  //   type: 'ExpressionStatement',
  //   expression: {
  //     type: 'CallExpression',
  //     optional: false,
  //     callee: {
  //       type: 'MemberExpression',
  //       object: { type: 'Identifier', name: rt.NODES_VAR },
  //       property: { type: 'Identifier', name: 'push' },
  //       optional: false,
  //       computed: false
  //     },
  //     arguments: [{
  //       type: 'ObjectExpression',
  //       properties: compileNodeProperties(node, err)
  //     }]
  //   }
  // });
}

function compileNodeProperties(node: lang.Node, err: lang.Error[]) {
  const ret: es.Property[] = [];

  node.props.forEach((prop, key) => {
    compileNodeProperty(key, prop, ret, err);
  });

  return ret;
}

function compileNodeProperty(
  key: string, prop: lang.Prop, props: es.Property[], err: lang.Error[]
) {
  if (key.startsWith(lang.LOGIC_ATTR_PREFIX)) {
    key = key.substring(1);
  } else {
    key = rt.DOM_VALUE_PREFIX + key;
  }
  props.push({
    type: 'Property',
    key: { type: 'Identifier', name: key },
    computed: false,
    value: { type: 'Literal', value: prop.val },
    kind: 'init',
    method: false,
    shorthand: false,
  });
}
