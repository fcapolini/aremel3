import { parseScript } from "esprima";
import * as es from "estree";
import * as lang from "./lang";
import * as rt from "../shared/runtime";

interface Context {
  nextId: number
}

export function compileApp(app: lang.App): rt.AppState | null {
  const root = app.root ? compileNode(app.root, app) : null;
  return root ? { root: root } : null;
}

function compileNode(node: lang.Node, app: lang.App) {
  const ret: rt.ScopeState = {
    id: `${node.id}`,
    aka: node.aka,
    values: compileValues(node, app)
  };
  if (node.children.length > 0) {
    ret.children = [];
    node.children.forEach(n => {
      const child = compileNode(n, app);
      ret.children?.push(child);
    });
  }
  return ret;
}

function compileValues(node: lang.Node, app: lang.App) {
  const ret: { [key: string]: rt.ValueState } = {};
  node.props.forEach((prop, key) => {
    
  });
  return ret;
}
