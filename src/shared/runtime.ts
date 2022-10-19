import { COMMENT_NODE, DomDocument, DomElement, DomTextNode, ELEMENT_NODE, TEXT_NODE } from "./dom";
import * as lang from "../server/lang";

export const ID_ATTR = 'data-aremel';
export const STATE_GLOBAL = '__aremel_state__';

export const TEXT_ID_PREFIX = '__t$';
export const TEXT_COMMENT1 = '-:';
export const TEXT_COMMENT1_LEN = TEXT_COMMENT1.length;
export const TEXT_COMMENT2 = '-/';

export const NOTNULL_FN = lang.RESERVED_PREFIX + 'nn';
export const OUTER_PROPERTY = lang.RESERVED_PREFIX + 'outer';
export const ATTR_VALUE_PREFIX = 'attr_';
export const EVENT_VALUE_PREFIX = 'event_';
export const HANDLER_VALUE_PREFIX = 'on_';
// export const CLASS_VALUE_PREFIX = 'class_';
// export const STYLE_VALUE_PREFIX = 'style_';
export const DATA_VALUE = 'data';
// export const DATAOFFSET_VALUE = 'dataOffset';
// export const DATALENGTH_VALUE = 'dataLength';

const UNDEFINED: ValueState = { passive: true, v: undefined };

export interface AppState {
  root: ScopeState
  sources?: string[]
  cycle?: number
}

export type ScopeStateValues = { [key: string]: ValueState };

export interface ScopeState {
  id: string
  aka?: string
  values: ScopeStateValues
  children?: ScopeState[]
}

export interface ValueState {
  fn?: () => any
  pos?: ValuePos
  cycle?: number
  t?: 'attribute' | 'text' | 'event' | 'handler' | 'data' //TODO: | 'class' | 'style'
  k?: string
  v?: any
  refs?: string[]
  // indicates this value doesn't participate in reactivity
  // (e.g. a global or a function)
  passive?: boolean

  src?: Set<ValueState>
  dst?: Set<ValueState>
  scope?: Scope
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
  domMap: DomMap;
  scopes: Map<string, Scope>;
  root: Scope;
  pushLevel?: number;

  constructor(doc: DomDocument, state: AppState) {
    this.doc = doc;
    this.state = state;
    this.domMap = new DomMap(doc.firstElementChild);
    this.scopes = new Map();
    this.root = new Scope(this, this.domMap, state.root);
  }

  refresh(scope?: Scope, noincrement?: boolean) {
    this.state.cycle ? (noincrement ? null : this.state.cycle++) : this.state.cycle = 1;
    delete this.pushLevel;
    scope || (scope = this.root);
    scope.unlinkValues();
    scope.relinkValues();
    scope.updateValues();
    this.pushLevel = 0;
    return this;
  }

  globalLookup(key: string): ValueState | undefined {
    return UNDEFINED;
  }
}

class DomMap {
  parent?: DomMap;
  map: Map<string, DomElement>;

  constructor(root?: DomElement, parent?: DomMap) {
    this.parent = parent;
    const map = this.map = new Map();

    function f(e: DomElement) {
      const id = e.getAttribute(ID_ATTR);
      id && map.set(id, e);
      e.childNodes.forEach(n => n.nodeType === ELEMENT_NODE && f(n as DomElement));
    }
    root && f(root);
  }

  get size() {
    return this.map.size;
  }

  get(id: string): DomElement | undefined {
    let ret;
    for (let that = this as DomMap | undefined; that && !ret; that = that.parent) {
      ret = that.map.get(id);
    }
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
  domMap: DomMap
  textMap?: Map<string, DomTextNode>

  constructor(
    app: App, domMap: DomMap, state: ScopeState, parent?: Scope, before?: Scope
  ) {
    this.app = app;
    this.state = state;
    this.parent = parent;
    this.children = [];
    this.obj = new Proxy<any>(this.state.values, new ScopeHandler(app, this))
    this.dom = domMap.get(`${state.id}`);
    this.domMap = domMap;
    this.textMap = this.getTextMap();
    if (parent) {
      const i = (before ? parent.children.indexOf(before) : -1);
      if (i < 0) {
        parent.children.push(this);
      } else {
        parent.children.splice(i, 0, this);
      }
      if (this.state.aka) {
        parent.obj[this.state.aka] = this.obj;
      }
    }
    app.scopes.set(state.id, this);
    state.children?.forEach(s => new Scope(app, domMap, s, this));
  }

  dispose() {
    this.app.scopes.delete(this.state.id);
    this.unlinkValues();
    this.dom && this.dom.parentElement && this.dom.parentElement.removeChild(this.dom);
    const i = (this.parent ? this.parent.children.indexOf(this) : -1);
    i >= 0 && this.parent?.children.splice(i, 1);
    if (this.state.aka) {
      if (this.parent && this.parent.obj[this.state.aka] === this.obj) {
        delete this.parent.obj[this.state.aka];
      }
    }
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
          if (!(n as DomElement).getAttribute(ID_ATTR)) {
            f(n as DomElement);
          }
        }
      });
    }
    this.dom && f(this.dom);
    return ret.size > 0 ? ret : undefined;
  }

  lookup(prop: string, outer?: boolean): ValueState | undefined {
    let ret = undefined;
    let scope: Scope | undefined = (outer ? this.parent : this);
    while (scope && !ret) {
      const target = scope.state.values;
      ret = Reflect.get(target, prop, target);
      scope = scope.parent;
    }
    if (!ret) {
      ret = this.app.globalLookup(prop);
    }
    return ret;
  }

  unlinkValues() {
    for (const [key, value] of Object.entries(this.state.values)) {
      if (value.src) {
        value.src.forEach(o => o?.dst?.delete(value));
        delete value.src;
      }
    }
    this.children.forEach(s => s.unlinkValues());
  }

  relinkValues() {
    for (const [key, value] of Object.entries(this.state.values)) {
      value.scope = this;
      value.refs?.forEach(id => {
        const other = this.lookup(id, id === key);
        if (other && !other.passive) {
          (value.src ?? (value.src = new Set())).add(other);
          (other.dst ?? (other.dst = new Set())).add(value);
        }
      });
    }
    this.children.forEach(s => s.relinkValues());
  }

  updateValues() {
    Object.keys(this.obj).forEach(k => this.obj[k]);
    this.children.forEach(s => s.updateValues());
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
    if (prop === OUTER_PROPERTY) {
      return this.scope.parent?.obj;
    }
    const value = this.scope.lookup(prop);
    value && !value.passive && this.update(value);
    return value?.v;
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    if (prop.startsWith(lang.RESERVED_PREFIX)) {
      return false;
    }
    const value = this.scope.lookup(prop);

    if (value && !value.passive) {
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
    }
  }

  private reflect(value: ValueState) {
    switch (value.t) {
      case 'attribute':
        value.k && this.scope.setAttr(value.k, value.v);
        break;
      case 'text':
        const t = value.k && value.scope?.textMap?.get(value.k);
        //TODO: HTML encoding/decoding?
        t ? t.nodeValue = `${value.v != null ? value.v : ''}` : null;
        break;
      case 'data':
        value.v = this.replicateFor(value);
    }
  }

  private propagate(value: ValueState) {
    if (value.dst && this.app.pushLevel != null) {
      if ((this.app.pushLevel ?? 0) === 0) {
        this.app.state.cycle = (this.app.state.cycle ?? 0) + 1;
      }
      this.app.pushLevel++;
      try {
        value.dst.forEach(v => this.update(v));
      } catch (ignored: any) {}
      this.app.pushLevel--;
    }
  }

  // ---------------------------------------------------------------------------
  // replication
  // ---------------------------------------------------------------------------
  clones: Scope[] | undefined;

  private replicateFor(value: ValueState): any {
    let v = value.v;
    if (!(v instanceof Array) || v.length < 1) {
      return v;
    }
    if (!this.clones) {
      this.clones = this.collectClones();
    }

    const aa = v as Array<any>;
    const offset = 0;
    const length = aa.length;

    for (let i = 0; i < length - 1; i++) {
      const v = aa[i + offset];
      if (i < this.clones.length) {
        // update existing clone
        this.clones[i].obj[DATA_VALUE] = v;
      } else {
        // create new clone
        const clone = this.cloneScope(i, v);
        this.clones.push(clone);
      }
    }

    while (this.clones.length > (length - 1)) {
      (this.clones.pop() as Scope).dispose();
    }

    const ret = (length > 0 ? aa[length - 1] : null);
    return ret;
  }

  private collectClones(): Scope[] {
    const ret: Scope[] = [];
    //FIXME
    return ret;
  }

  private cloneScope(i: number, v: any) {
    const state = this.cloneState(this.scope.state, i, true);
    const dom = this.scope.dom?.cloneNode(true) as DomElement | undefined;
    dom && dom.setAttribute(ID_ATTR, state.id);
    dom && this.scope.dom?.parentElement?.insertBefore(dom, this.scope.dom);
    const domMap = new DomMap(dom, this.scope.domMap);
    delete state.values[DATA_VALUE].fn;
    state.values[DATA_VALUE].v = v;
    state.id && dom?.setAttribute(ID_ATTR, state.id);
    const ret = new Scope(this.app, domMap, state, this.scope.parent, this.scope);
    this.app.refresh(ret, true);
    return ret;
  }

  cloneState(src: ScopeState, i: number | undefined, clearCycle: boolean): ScopeState {
    const ret: ScopeState = {
      id: (i != null ? `${src.id}.${i}` : src.id),
      values: this.cloneValues(src.values, clearCycle)
    };
    src.aka && (ret.aka = src.aka);
    if (src.children) {
      ret.children = [];
      src.children.forEach(s => {
        ret.children?.push(this.cloneState(s, undefined, clearCycle));
      });
    }
    return ret;
  }

  cloneValues(src: ScopeStateValues, clearCycle: boolean): ScopeStateValues {
    const ret: ScopeStateValues = {};
    Object.keys(src).forEach(key => {
      ret[key] = this.cloneValue(src[key], clearCycle);
    });
    return ret;
  }

  cloneValue(src: ValueState, clearCycle: boolean): ValueState {
    const ret: ValueState = {};
    src.fn && (ret.fn = src.fn);
    src.pos && (ret.pos = src.pos);
    !clearCycle && src.cycle && (ret.cycle = src.cycle);
    src.t && (ret.t = src.t);
    src.k && (ret.k = src.k);
    src.v && (ret.v = src.v);
    src.refs && (ret.refs = src.refs);
    src.passive && (ret.passive = src.passive);
    return ret;
  }
}
