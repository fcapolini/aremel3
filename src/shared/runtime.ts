import { DomDocument, DomElement, ELEMENT_NODE } from "./dom";
import * as lang from "../server/lang";
import { makeHyphenName } from "./util";

export const NOTNULL_FN = lang.RESERVED_PREFIX + 'nn';
export const ATTR_VALUE_PREFIX = 'attr_';
export const CLASS_VALUE_PREFIX = 'class_';
export const STYLE_VALUE_PREFIX = 'style_';
export const ON_VALUE_PREFIX = 'on_';
export const EVENT_VALUE_PREFIX = 'event_';

export interface AppState {
  cycle: number
  root: ScopeState
}

export interface ScopeState {
  id: string
  aka?: string
  values: { [key: string]: ValueState }
  children?: ScopeState[]
}

export interface ValueState {
  fn: () => any
  cycle?: number
  k?: string
  v?: any
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

  refresh() {
    this.state.cycle++;
    this.root.refresh();
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
	obj: any
  dom?: DomElement

  constructor(app:App, state: ScopeState, parent?: Scope) {
    this.app = app;
    this.state = state;
    this.parent = parent;
    this.children = [];
    this.obj = new Proxy<any>(this.state.values, new ScopeHandler(this))
    this.dom = app.domMap.get(state.id);
    if (parent) {
      parent.children.push(this);
    }
    state.children?.forEach(s => new Scope(app, s, this));
  }

  refresh() {
    Object.keys(this.obj).forEach((k) => this.obj[k]);
    this.children.forEach(s => s.refresh());
  }

  lookup(prop: string): ValueState | undefined {
    let ret = undefined;
    let scope: Scope | undefined = this;
    while (scope && !ret) {
      const target = scope.state.values;
      ret = Reflect.get(target, prop, target);
      scope = scope.parent;
    }
    return ret;
  }

  setAttr(k: string, v: any) {
    if (v != null) {
      this.dom?.setAttribute(k, `${v}`);
    } else {
      this.dom?.removeAttribute(k);
    }
  }
}

// =============================================================================
// Scope
// =============================================================================

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy
class ScopeHandler implements ProxyHandler<any> {
  scope: Scope;

  constructor(scope: Scope) {
    this.scope = scope;
  }

  get(target: any, prop: string, receiver?: any) {
    const value = this.scope.lookup(prop);
    if (value && (!value.cycle || value.cycle < this.scope.app.state.cycle)) {
      value.cycle = this.scope.app.state.cycle;
      // refresh
      const v1 = value.v;
      value.v = value.fn();
      // apply
      if (v1 == null ? value.v != null : v1 !== value.v) {
        if (prop.startsWith(ATTR_VALUE_PREFIX)) {
          value.k ??= makeHyphenName(prop.substring(ATTR_VALUE_PREFIX.length));
          this.scope.setAttr(value.k, value.v);
        }
      }
      // propagate
      //TODO
    }
    return value?.v;
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    const value = this.scope.lookup(prop);
    value && (value.v = val);
    return (!!value);
  }
}
