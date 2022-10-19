/* istanbul ignore file */
// https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;
export const DOCUMENT_NODE = 9;

// https://developer.mozilla.org/en-US/docs/Web/API/NodeList
export interface DomNodeList {
  length: number;
  item: (i: number) => DomNode | undefined;
  forEach: (cb: (n: DomNode, i: number) => void) => void;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Node
export interface DomNode {
  nodeType: number;
  ownerDocument: DomDocument | undefined;
  parentElement: DomElement | undefined;
  nextSibling: DomNode | null;
  cloneNode(deep: boolean): DomNode;
}

export interface DomTextNode extends DomNode {
  nodeValue: string;
}

export interface DomComment extends DomNode {
  nodeValue: string;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Element
export interface DomElement extends DomNode {
  tagName: string;
  childNodes: DomNodeList;
  childElementCount: number;
  firstChild: DomNode | undefined;
  firstElementChild: DomElement | undefined;
  previousElementSibling: DomElement | undefined;
  nextElementSibling: DomElement | undefined;
  appendChild: (n: DomNode) => void;
  insertBefore: (n: DomNode, ref: DomNode | null) => void;
  removeChild: (n: DomNode) => void;
  classList: {
    add: (n: string) => void,
    remove: (n: string) => void,
  };
  style: {
    setProperty: (key: string, val: string) => void;
    removeProperty: (key: string) => void;
  };
  getAttributeNames: () => Array<string>;
  getAttribute: (key: string) => string | undefined;
  setAttribute: (key: string, val: string) => void;
  removeAttribute: (key: string) => void;
  addEventListener: (t: string, l: (ev: any) => void) => void;
  removeEventListener: (t: string, l: (ev: any) => void) => void;
  outerHTML: string;
  innerHTML: string;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Document
export interface DomDocument extends DomNode {
  get head(): DomElement | undefined;
  get body(): DomElement | undefined;
  createElement: (tagName: string) => DomElement;
  createComment: (text: string) => DomComment;
  createTextNode: (text: string) => DomTextNode;
  firstElementChild: DomElement | undefined;
}
