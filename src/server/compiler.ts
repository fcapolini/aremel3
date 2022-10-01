import * as es from "estree";
import * as rt from "../shared/runtime";
import * as expr from "./expr";
import * as lang from "./lang";

interface Context {
  nextId: number
}

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

function compileNode(node: lang.Node, app: lang.App): es.ObjectExpression {
  return {
    type: "ObjectExpression",
    properties: compileValues(node, app)
  };
}

function compileValues(node: lang.Node, app: lang.App): es.Property[] {
  const ret: es.Property[] = [];
  node.props.forEach((prop, key) => {
    if (expr.isDynamic(prop.val)) {
      const e = expr.parseExpr(`${prop.val}`);//TODO position
    }
  });
  return ret;
}

function makeProperty(name: string, value: es.Expression): es.Property {
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
