import { DomNode, ELEMENT_NODE } from "../shared/dom";
import { HtmlAttribute, HtmlDocument, HtmlElement, HtmlText } from "./htmldom";
import * as expr from "./expr";
import * as lang from "./lang";
import Preprocessor from "./preprocessor";

interface Context {
  nextId: number
}

export function load(doc: HtmlDocument, pre: Preprocessor): lang.App {
  const ctx: Context = { nextId: 0 };
  const ret: lang.App = { doc: doc, pre: pre, errors: [] };
  
  if (doc.firstElementChild) {
    ret.root = loadNode(doc.firstElementChild as HtmlElement, pre, ret.errors, ctx);
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
  dom: HtmlElement, pre: Preprocessor, err: lang.Error[], ctx: Context,
  parent?: lang.Node
): lang.Node {
  const ret: lang.Node = {
    id: ctx.nextId++,
    parent: parent,
    children: [],
    dom: dom,
    props: new Map()
  };

  dom.setAttribute(lang.ID_ATTR, `${ret.id}`);
  const roots = loadNodeProps(ret, pre, err, []);
  roots.forEach(dom => {
    const child = loadNode(dom, pre, err, ctx, ret);
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

    loadNodeAttributes(node, dom, pre);

    dom.childNodes.forEach(n => {
      if (n.nodeType === ELEMENT_NODE) {
        if (!lang.isNodeRoot(n as HtmlElement)) {
          f(n as HtmlElement);
        } else {
          roots.push(n as HtmlElement);
        }
      } else {
        loadNodeTexts(node, n as HtmlText, pre);
      }
    });
  }

  f(node.dom);
  return roots;
}

function loadNodeAttributes(node: lang.Node, dom: HtmlElement, pre: Preprocessor) {
  //FIXME
  // dom.attributes.forEach((attr, key) => {
  // });

  dom.getAttributeNames().slice().forEach(key => {
    const attr = dom.attributes.get(key) as HtmlAttribute;
    const val = attr.value != null ? attr.value : '';
    if (lang.isPropertyId(key)) {
      if (dom.attributes.get(key)?.quote === lang.EXPR_ATTR_QUOTE) {
        node.props.set(key, {
          val: `${lang.EXPR_MARKER1}${val}${lang.EXPR_MARKER2}`,
          pos: pre.getSourcePos(attr.pos2),
        });
      } else {
        node.props.set(key, {
          val: val,
          pos: pre.getSourcePos(attr.pos2),
        });
      }
      dom.removeAttribute(key);
    } else if (dom.attributes.get(key)?.quote === lang.EXPR_ATTR_QUOTE) {
      node.props.set(key, {
        val: `${lang.EXPR_MARKER1}${val}${lang.EXPR_MARKER2}`,
        pos: pre.getSourcePos(attr.pos2),
      });
      dom.setAttribute(key, '', '"');
    } else if (expr.isDynamic(val)) {
      node.props.set(key, {
        val: val,
        pos: pre.getSourcePos(attr.pos2),
      });
      dom.setAttribute(key, '');
    }
  });
}

function loadNodeTexts(node: lang.Node, dom: HtmlText, pre: Preprocessor) {
  const text = dom.nodeValue;

  if (expr.isDynamic(text)) {
    let i1, i2 = 0, i, id, n: DomNode | undefined;

    while ((i1 = text.indexOf(lang.EXPR_MARKER1, i2)) >= 0) {
      if (i1 > i2) {
        n = dom.ownerDocument?.createTextNode(text.substring(i2, i1));
        dom.parentElement?.insertBefore(n as DomNode, dom);
      }
      i2 = i1;
      i1 += lang.EXPR_MARKER1_LEN;
      if ((i = text.indexOf(lang.EXPR_MARKER2, i1)) >= i1) {
        i2 = i;
        id = node.props.size;
        n = dom.ownerDocument?.createComment(`${lang.TEXT_COMMENT1}${id}`)
        dom.parentElement?.insertBefore(n as DomNode, dom);
        const expr = text.substring(i1, i2).trim();
        if (expr.length > 0) {
          node.props.set(`${lang.TEXT_ID_PREFIX}${id}`, {
            val: `${lang.EXPR_MARKER1}${expr}${lang.EXPR_MARKER2}`,
            pos: pre.getSourcePos(dom.pos),
          });
        }
        n = dom.ownerDocument?.createComment(`${lang.TEXT_COMMENT2}${id}`)
        dom.parentElement?.insertBefore(n as DomNode, dom);
        i2 += lang.EXPR_MARKER2_LEN;
      } else {
        break;
      }
    }

    if (i2 < text.length) {
      n = dom.ownerDocument?.createTextNode(text.substring(i2));
      dom.parentElement?.insertBefore(n as DomNode, dom);
    }

    dom.remove();
  }
}
