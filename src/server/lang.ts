import { HtmlDocument, HtmlElement, HtmlText } from "./htmldom";
import Preprocessor, { SourcePos } from "./preprocessor";

export interface Src {
  doc: HtmlDocument
  pre: Preprocessor
  msg: SrcMsg[]
  root?: SrcNode
}

export interface SrcMsg {
  type: 'err' | 'warn'
  msg: string
  pos?: SourcePos
}

export interface SrcNode {
  parent?: SrcNode
  aka?: string
  dom: HtmlElement
  props: Map<string, SrcProp>
}

export interface SrcProp {
  textNode?: HtmlText
  val: string
}

export function isNodeRoot(dom: HtmlElement): boolean {
  let ret = false;
  if (dom.tagName === 'HEAD' || dom.tagName === 'BODY') {
    ret = true;
  } else {
    dom.getAttributeNames().forEach(key => {
      if (isPropertyId(key)) {
        ret = true;
      }
    });
  }
  return ret;
}

export function isPropertyId(key: string): boolean {
  return key.includes(':');
}

export function containsExpression(text: string): boolean {
  const i1 = text.indexOf('[[');
  const i2 = text.indexOf(']]');
  return (i1 >= 0 && i2 > i1);
}

export function isValidId(id: string): boolean {
  return /^(\w+)$/.test(id); //TODO: improve check
}
