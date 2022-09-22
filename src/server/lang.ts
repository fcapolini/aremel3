import { HtmlDocument, HtmlElement } from "./htmldom";
import HtmlParser from "./htmlparser";

export interface App {
  html: string,
  children?: App[]
}

export interface Scope {
  parent?: Scope,
  children: Scope[],
  dom: HtmlElement,
  values: Value[],
}

export interface Value {
  scope: Scope,
}

export interface Runtime {
  doc: HtmlDocument,
  root: Scope,
}

export function load(app: App, doc: HtmlDocument): Runtime {
  const parser = new HtmlParser();

  function f(src: App, dst: HtmlElement, parent?: Scope): Scope {
    const dom = parser.parseDoc(src.html);
    const main = dom.firstElementChild ?? dst;
    const scope: Scope = {
      parent: parent,
      children: [],
      dom: main as HtmlElement,
      values: []
    };
    parent && parent.children.push(scope);
    
    // loadTexts()

    while (dom.children.length > 0) {
      dst.appendChild(dom.children[0].remove());
    }

    if (src.children) {
      src.children.forEach((src) => f(src, main as HtmlElement, parent));
    }

    return scope;
  }

  const root = f(app, doc);
  return { doc: doc, root: root };
}
