import { RESERVED_PREFIX } from "../shared/runtime";
import { HtmlDocument, HtmlElement, HtmlText } from "./htmldom";
import Preprocessor, { SourcePos } from "./preprocessor";

export const LOGIC_ATTR_PREFIX = ':';
export const AKA_ATTR = LOGIC_ATTR_PREFIX + 'aka';
export const EXPR_ATTR_QUOTE = '[';
export const EXPR_MARKER1 = '[[';
export const EXPR_MARKER2 = ']]';
export const EXPR_MARKER1_LEN = EXPR_MARKER1.length;
export const EXPR_MARKER2_LEN = EXPR_MARKER2.length;

export const EVENT_ATTR_PREFIX = 'event-';
export const HANDLER_ATTR_PREFIX = 'on-';

export interface App {
  pre: Preprocessor
  doc?: HtmlDocument
  root?: Node
  errors: Error[]
}

export interface Node {
  id: number
  parent?: Node
  children: Node[]
  aka?: string
  dom: HtmlElement
  props: Map<string, Prop>
}

export interface Prop {
  textNode?: HtmlText
  val: string
  pos?: SourcePos
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

export function isValidId(id: string): boolean {
  return /^(\w+)$/.test(id) && !id.startsWith(RESERVED_PREFIX); //TODO: improve check
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
