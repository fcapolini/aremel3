import { DomDocument, DomElement, ELEMENT_NODE } from "./dom";
import * as lang from "../server/lang";

export const NOTNULL_FN = lang.RESERVED_PREFIX + 'nn';
export const DOM_VALUE_PREFIX = 'dom_';

export interface AppState {
  root: ScopeState
}

export interface ScopeState {
  id: string
  aka?: string
  props: any
  children?: ScopeState[]
}

// =============================================================================
// App
// =============================================================================

export class App {
	doc: DomDocument;
	state: AppState;
  domMap: Map<string, DomElement>;
  root: Scope;

  constructor(doc: DomDocument, state: AppState) {
    this.doc = doc;
    this.state = state;
    this.domMap = this.getDomMap(doc);
    this.root = new Scope(this, state.root);
  }

  getDomMap(doc: DomDocument) {
    const ret = new Map<string, DomElement>();
    function f(e: DomElement) {
      const id = e.getAttribute(lang.ID_ATTR);
      id && ret.set(id, e);
      e.childNodes.forEach(n => n.nodeType === ELEMENT_NODE && f(n as DomElement));
    }
    doc.firstElementChild && f(doc.firstElementChild);
    return ret;
  }
}

// =============================================================================
// Scope
// =============================================================================

export class Scope {
  app: App
	state: ScopeState
	parent?: Scope
	children: Scope[]
	proxy: any
  dom?: DomElement

  constructor(app:App, state: ScopeState, parent?: Scope) {
    this.app = app;
    this.state = state;
    this.parent = parent;
    this.children = [];
    this.proxy = new Proxy<any>(this.state.props, new ScopeHandler(this))
    this.dom = app.domMap.get(state.id);
    if (parent) {
      parent.children.push(this);
    }
    state.children?.forEach(s => new Scope(app, s, this));
  }
}

class ScopeHandler implements ProxyHandler<any> {
  scope: Scope;

  constructor(scope: Scope) {
    this.scope = scope;
  }

  get(target: any, prop: string, receiver?: any) {
    return Reflect.get(target, prop, receiver);
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    return Reflect.set(target, prop, val, receiver);
  }
}
