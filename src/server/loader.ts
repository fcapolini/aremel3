import { ELEMENT_NODE } from "../shared/dom";
import { HtmlDocument, HtmlElement, HtmlText } from "./htmldom";
import * as lang from "./lang";
import Preprocessor from "./preprocessor";

export function load(doc: HtmlDocument, pre: Preprocessor): lang.App {
  const ret: lang.App = { doc: doc, pre: pre, errors: [] };
  
  if (doc.firstElementChild) {
    ret.root = loadNode(doc.firstElementChild as HtmlElement, pre, ret.errors);
  } else {
    ret.errors.push({
      type: 'err',
      msg: 'missing root element',
      pos: pre.getSourcePos({ origin: 0, i1: 0, i2: 0 })
    });
  }

  return ret;
}

function loadNode(
  dom: HtmlElement, pre: Preprocessor, err: lang.Error[], parent?: lang.Node
): lang.Node {
  const ret: lang.Node = {
    parent: parent,
    children: [],
    dom: dom,
    props: new Map()
  };

  const roots = loadNodeProps(ret, pre, err, []);
  roots.forEach(dom => {
    const child = loadNode(dom, pre, err, ret);
    ret.children.push(child);
  });

  return ret;
}

function loadNodeProps(
  node: lang.Node, pre: Preprocessor, err: lang.Error[], roots: HtmlElement[]
): HtmlElement[] {
  function f(dom: HtmlElement) {
    const aka = dom.getAttribute(lang.AKA_ATTR);
    if (aka != null) {
      if (lang.isValidId(aka)) {
        node.aka = aka;
      } else {
        const attr = dom.attributes.get(lang.AKA_ATTR);
        err.push({
          type: 'err',
          msg: `invalid name "${aka}"`,
          pos: pre.getSourcePos(attr?.pos2)
        });
      }
      dom.removeAttribute(lang.AKA_ATTR);
    } else {
      node.aka = lang.defaultAka(dom);
    }

    dom.getAttributeNames().slice().forEach(key => {
      const val = dom.getAttribute(key) ?? '';
      if (lang.isPropertyId(key) || lang.containsExpression(val)) {
        node.props.set(key, { val: val });
        dom.removeAttribute(key);
      }
    });

    dom.childNodes.forEach(n => {
      if (n.nodeType === ELEMENT_NODE) {
        if (!lang.isNodeRoot(n as HtmlElement)) {
          f(n as HtmlElement);
        } else {
          roots.push(n as HtmlElement);
        }
      } else {
        const text = (n as HtmlText).nodeValue;
        if (lang.containsExpression(text)) {
          node.props.set(`__t_${node.props.size}`, {
            textNode: n as HtmlText,
            val: text
          });
        }
      }
    });
  }

  f(node.dom);
  return roots;
}
