import { COMMENT_NODE, DomDocument, DomElement, DomTextNode, ELEMENT_NODE, TEXT_NODE } from "./dom";
import * as lang from "../server/lang";

const MODE: 'pull' | 'refs' = 'refs';

export const TEXT_ID_PREFIX = '__t$';
export const TEXT_COMMENT1 = '-:';
export const TEXT_COMMENT1_LEN = TEXT_COMMENT1.length;
export const TEXT_COMMENT2 = '-/';

export const NOTNULL_FN = lang.RESERVED_PREFIX + 'nn';
export const ATTR_VALUE_PREFIX = 'attr_';

export const EVENT_VALUE_PREFIX = 'event_';

//TODO:
// export const CLASS_VALUE_PREFIX = 'class_';
// export const STYLE_VALUE_PREFIX = 'style_';
// export const ON_VALUE_PREFIX = 'on_';
// export const DATA_VALUE = 'data';

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
  fn?: () => any
  pos?: ValuePos
  cycle?: number
  t?: 'attribute' | 'text' | 'event' //TODO: | 'class' | 'style'
  k?: string
  v?: any
  refs?: string[]
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
    MODE === 'pull' && (this.pullStack = []);
    (scope ?? this.root).clear();
    (scope ?? this.root).refresh();
    MODE === 'pull' && (delete this.pullStack);
    this.pushLevel = 0;
    return this;
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
  textMap?: Map<string, DomTextNode>

  constructor(app: App, state: ScopeState, parent?: Scope) {
    this.app = app;
    this.state = state;
    this.parent = parent;
    this.children = [];
    this.obj = new Proxy<any>(this.state.values, new ScopeHandler(app, this))
    this.dom = app.domMap.get(`${state.id}`);
    this.textMap = this.getTextMap();
    if (parent) {
      parent.children.push(this);
    }
    state.children?.forEach(s => new Scope(app, s, this));
  }

  getTextMap() {
    const that = this;
    const ret = new Map<string, DomTextNode>();
    function f(e: DomElement) {
      e.childNodes.forEach(n => {
        if (n.nodeType === COMMENT_NODE) {
          const s = (n as DomTextNode).nodeValue;
          if (s.startsWith(TEXT_COMMENT1)) {
            const id = s.substring(TEXT_COMMENT1_LEN);
            const t = n.nextSibling;
            if (t?.nodeType === TEXT_NODE) {
              ret.set(id, t as DomTextNode);
            } else if (t?.nodeType === COMMENT_NODE) {
              const s = (t as DomTextNode).nodeValue;
              if (s.startsWith(TEXT_COMMENT2)) {
                const n = that.app.doc.createTextNode('');
                e.insertBefore(n, t);
                ret.set(id, n);
              }
            }
          }
        } else if (n.nodeType === ELEMENT_NODE) {
          if (!(n as DomElement).getAttribute(lang.ID_ATTR)) {
            f(n as DomElement);
          }
        }
      });
    }
    this.dom && f(this.dom);
    return ret.size > 0 ? ret : undefined;
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
      MODE === 'refs' && value.refs?.forEach(id => {
        const other = this.lookup(id);
        if (other) {
          (value.upstream ?? (value.upstream = new Set())).add(other);
          (other.downstream ?? (other.downstream = new Set())).add(value);
        }
      });
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
// ScopeHandler
// =============================================================================

class ScopeHandler implements ProxyHandler<any> {
  app: App;
  scope: Scope;

  constructor(app: App, scope: Scope) {
    this.app = app;
    this.scope = scope;
  }

  get(target: any, prop: string, receiver?: any) {
    const value = this.scope.lookup(prop);
    value && this.update(value);
    return value?.v;
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    const value = this.scope.lookup(prop);

    if (value) {
      const old = value.v;
      value.v = val;
      delete value.fn;
      if (old == null ? value.v != null : old !== value.v) {
        this.reflect(value);
        this.propagate(value);
      }
    }

    return !!value;
  }

  private update(value: ValueState) {
    if (value) {
      if (MODE === 'pull' && this.app.pullStack) {
        if (this.app.pullStack.length > 0) {
          const o = this.app.pullStack[this.app.pullStack.length - 1];
          (value.downstream ?? (value.downstream = new Set())).add(o);
          (o.upstream ?? (o.upstream = new Set())).add(value);
        }
        this.app.pullStack?.push(value);
      }
      
      if (value.fn) {
        if (!value.cycle || value.cycle < (this.app.state.cycle ?? 0)) {
          value.cycle = this.app.state.cycle ?? 0;
          const old = value.v;

          try {
            value.v = value.fn.apply(this.scope.obj);
          } catch (ex: any) {
            //TODO (+ use ValueState.pos if available)
            console.log(ex);
          }

          if (old == null ? value.v != null : old !== value.v) {
            this.reflect(value);
            this.propagate(value);
          }
        }
      }

      if (MODE === 'pull' && this.app.pullStack) {
        this.app.pullStack?.pop();
      }
    }
  }

  private reflect(value: ValueState) {
    switch (value.t) {
      case 'attribute':
        value.k && this.scope.setAttr(value.k, value.v);
        break;
      case 'text':
        const t = value.k && this.scope.textMap?.get(value.k);
        //TODO: HTML encoding/decoding?
        t ? t.nodeValue = `${value.v != null ? value.v : ''}` : null;
        break;
    }
  }

  private propagate(value: ValueState) {
    if (value.downstream && this.app.pushLevel != null) {
      if ((this.app.pushLevel ?? 0) === 0) {
        this.app.state.cycle = (this.app.state.cycle ?? 0) + 1;
      }
      this.app.pushLevel++;
      try {
        value.downstream.forEach(v => this.update(v));
      } catch (ignored: any) {}
      this.app.pushLevel--;
    }
  }
}
