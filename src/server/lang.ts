import { HtmlDocument, HtmlElement, HtmlText } from "./htmldom";
import Preprocessor, { SourcePos } from "./preprocessor";

export const AKA_ATTR = ':aka';

export interface App {
  doc: HtmlDocument
  pre: Preprocessor
  root?: Node
  errors: Error[]
}

export interface Node {
  parent?: Node
  children: Node[]
  aka?: string
  dom: HtmlElement
  props: Map<string, Prop>
}

export interface Prop {
  textNode?: HtmlText
  val: string
}

export interface Error {
  type: 'err' | 'warn'
  msg: string
  pos?: SourcePos
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

export function defaultAka(dom: HtmlElement): string | undefined {
  let ret = undefined;
  if (dom.tagName === 'HTML') {
    ret = 'page';
  } else if (dom.tagName === 'HEAD') {
    ret = 'head';
  } else if (dom.tagName === 'BODY') {
    ret = 'body';
  }
  return ret;
}
