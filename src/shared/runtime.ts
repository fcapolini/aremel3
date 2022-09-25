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
  root: ScopeState
  sources?: string[]
  cycle?: number
}

export interface ScopeState {
  id: string
  aka?: string
  values: { [key: string]: ValueState }
  children?: ScopeState[]
}

export interface ValueState {
  fn: () => any
  pos?: ValuePos
  cycle?: number
  k?: string
  v?: any
  upstream?: Set<ValueState>
  downstream?: Set<ValueState>
}

export interface ValuePos {
  src: number
  ln: number
  col: number
}

// =============================================================================
// App
// =============================================================================

export class App {
	doc: DomDocument;
	state: AppState;
  domMap: Map<string, DomElement>;
  root: Scope;
  pullStack?: ValueState[];
  pushLevel?: number;

  constructor(doc: DomDocument, state: AppState) {
    this.doc = doc;
    this.state = state;
    this.domMap = this.getDomMap(doc);
    this.root = new Scope(this, state.root);
  }

  refresh(scope?: Scope) {
    this.state.cycle ? this.state.cycle++ : this.state.cycle = 1;
    delete this.pushLevel;
    this.pullStack = [];
    (scope ?? this.root).clear();
    (scope ?? this.root).refresh();
    delete this.pullStack;
    this.pushLevel = 0;
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

  constructor(app: App, state: ScopeState, parent?: Scope) {
    this.app = app;
    this.state = state;
    this.parent = parent;
    this.children = [];
    this.obj = new Proxy<any>(this.state.values, new ScopeHandler(app, this))
    this.dom = app.domMap.get(state.id);
    if (parent) {
      parent.children.push(this);
    }
    state.children?.forEach(s => new Scope(app, s, this));
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

  clear() {
    for (const [key, value] of Object.entries(this.state.values)) {
      if (value.upstream) {
        value.upstream.forEach(o => o?.downstream?.delete(value));
        delete value.upstream;
      }
    }
    this.children.forEach(s => s.clear());
  }

  refresh() {
    Object.keys(this.obj).forEach(k => this.obj[k]);
    this.children.forEach(s => s.refresh());
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
  app: App;
  scope: Scope;

  constructor(app: App, scope: Scope) {
    this.app = app;
    this.scope = scope;
  }

  get(target: any, prop: string, receiver?: any) {
    const value = this.scope.lookup(prop);
    if (value && (!value.cycle || value.cycle < (this.app.state.cycle ?? 0))) {
      value.cycle = this.app.state.cycle ?? 0;
      
      const old = value.v;
      if (this.app.pullStack && this.app.pullStack.length > 0) {
        const o = this.app.pullStack[this.app.pullStack.length - 1];
        (value.downstream ?? (value.downstream = new Set())).add(o);
        (o.upstream ?? (o.upstream = new Set())).add(value);
      }
      
      this.app.pullStack?.push(value);
      try {
        value.v = value.fn.apply(this.scope.obj);
      } catch (ex: any) {
        //TODO (+ use ValueState.pos if available)
        console.log(ex);
      }
      this.app.pullStack?.pop();
      
      if (old == null ? value.v != null : old !== value.v) {
        this.reflect(prop, value);
        this.propagate(value);
      }
    }
    return value?.v;
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    const value = this.scope.lookup(prop);
    value && (value.v = val);
    return (!!value);
  }

  reflect(prop: string, value: ValueState) {
    if (prop.startsWith(ATTR_VALUE_PREFIX)) {
      value.k ??= makeHyphenName(prop.substring(ATTR_VALUE_PREFIX.length));
      this.scope.setAttr(value.k, value.v);
    }
  }

  propagate(value: ValueState) {
    if (value.downstream && this.app.pushLevel != null) {
      if (this.app.pushLevel === 0) {
        this.app.state.cycle = (this.app.state.cycle ?? 0) + 1;
      }
      this.app.pushLevel++;
      try {
        // value.downstream.forEach(v => v.)
      } catch (ignored: any) {}
      this.app.pushLevel--;
    }
  }
}
