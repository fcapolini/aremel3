import { ELEMENT_NODE } from "../shared/dom";
import { HtmlDocument, HtmlElement, HtmlText } from "./htmldom";
import * as lang from "./lang";
import Preprocessor from "./preprocessor";

export function load(doc: HtmlDocument, pre: Preprocessor): lang.Src {
  const ret: lang.Src = { doc: doc, pre: pre, msg: [] };
  
  if (doc.firstElementChild) {
    ret.root = loadNode(doc.firstElementChild as HtmlElement, pre, ret.msg);
  } else {
    ret.msg.push({
      type: 'err',
      msg: 'missing root element',
      pos: pre.getSourcePos({ origin: 0, i1: 0, i2: 0 })
    });
  }

  return ret;
}

function loadNode(
  dom: HtmlElement, pre: Preprocessor, msg: lang.SrcMsg[], parent?: lang.SrcNode
): lang.SrcNode {
  const ret: lang.SrcNode = { parent: parent, dom: dom, props: new Map() };

  loadNodeProps(ret, pre, msg);

  return ret;
}

function loadNodeProps(
  node: lang.SrcNode, pre: Preprocessor, msg: lang.SrcMsg[]
) {
  function f(dom: HtmlElement) {
    dom.getAttributeNames().slice().forEach(key => {
      const val = dom.getAttribute(key) ?? '';
      if (lang.isPropertyId(key) || lang.containsExpression(val)) {
        node.props.set(key, { val: val });
        dom.removeAttribute(key);
      }
    });

    const aka = node.props.get(':aka');
    if (aka) {
      node.props.delete(':aka');
      if (lang.isValidId(aka.val)) {
        node.aka = aka.val;
      } else {
        msg.push({
          type: 'err',
          msg: `invalid name "${aka.val}"`,
          pos: pre.getSourcePos(dom.pos)
        });
      }
    } else if (dom.tagName === 'HTML') {
      node.aka = 'page';
    } else if (dom.tagName === 'HEAD') {
      node.aka = 'head';
    } else if (dom.tagName === 'BODY') {
      node.aka = 'body';
    }

    dom.childNodes.forEach(n => {
      if (n.nodeType === ELEMENT_NODE) {
        if (!lang.isNodeRoot(n as HtmlElement)) {
          f(n as HtmlElement);
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
}
