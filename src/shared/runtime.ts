import * as dom from "./dom";

export const RESERVED_PREFIX = '__';
export const ID_ATTR = 'data-aremel';
export const STATE_GLOBAL = '__aremel_state__';
export const APP_GLOBAL = '__aremel_app__';

export const TEXT_ID_PREFIX = '__t$';
export const TEXT_COMMENT1 = '-:';
export const TEXT_COMMENT1_LEN = TEXT_COMMENT1.length;
export const TEXT_COMMENT2 = '-/';

export const NOTNULL_FN = RESERVED_PREFIX + 'nn';
export const OUTER_PROPERTY = RESERVED_PREFIX + 'outer';
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
	doc: dom.DomDocument;
	state: AppState;
  domMap: DomMap;
  scopes: Map<string, Scope>;
  root: Scope;
  pushLevel?: number;

  constructor(doc: dom.DomDocument, state: AppState) {
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
  map: Map<string, dom.DomElement>;

  constructor(root?: dom.DomElement, parent?: DomMap) {
    this.parent = parent;
    const map = this.map = new Map();

    function f(e: dom.DomElement) {
      const id = e.getAttribute(ID_ATTR);
      id && map.set(id, e);
      e.childNodes.forEach(n => n.nodeType === dom.ELEMENT_NODE && f(n as dom.DomElement));
    }
    root && f(root);
  }

  get size() {
    return this.map.size;
  }

  get(id: string): dom.DomElement | undefined {
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
  dom?: dom.DomElement
  domMap: DomMap
  textMap?: Map<string, dom.DomTextNode>

  constructor(
    app: App, domMap: DomMap, state: ScopeState, parent?: Scope, before?: Scope
  ) {
    this.app = app;
    this.state = state;
    this.parent = parent;
    this.children = [];
    this.obj = new Proxy<any>(this.state.values, new ScopeHandler(app, this));
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
    const ret = new Map<string, dom.DomTextNode>();
    function f(e: dom.DomElement) {
      e.childNodes.forEach(n => {
        if (n.nodeType === dom.COMMENT_NODE) {
          const s = (n as dom.DomTextNode).nodeValue;
          if (s.startsWith(TEXT_COMMENT1)) {
            const id = s.substring(TEXT_COMMENT1_LEN);
            const t = n.nextSibling;
            if (t?.nodeType === dom.TEXT_NODE) {
              ret.set(id, t as dom.DomTextNode);
            } else if (t?.nodeType === dom.COMMENT_NODE) {
              const s = (t as dom.DomTextNode).nodeValue;
              if (s.startsWith(TEXT_COMMENT2)) {
                const n = that.app.doc.createTextNode('');
                e.insertBefore(n, t);
                ret.set(id, n);
              }
            }
          }
        } else if (n.nodeType === dom.ELEMENT_NODE) {
          if (!(n as dom.DomElement).getAttribute(ID_ATTR)) {
            f(n as dom.DomElement);
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

  // ---------------------------------------------------------------------------
  // replication
  // ---------------------------------------------------------------------------
  clones: Scope[] | undefined;

  replicateFor(value: ValueState): any {
    let v = Array.isArray(value.v) ? value.v : [];
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
        const state = this.cloneState(this.state, i, true);
        delete state.values[DATA_VALUE].fn;
        delete state.values[DATA_VALUE].t;
        state.values[DATA_VALUE].v = v;
        const dom = this.cloneDom(state.id);
        const clone = this.cloneScope(dom, state);
        this.app.refresh(clone, true);
        this.clones.push(clone);
      }
    }

    const maxClones = Math.max(0, length - 1);
    while (this.clones.length > maxClones) {
      (this.clones.pop() as Scope).dispose();
    }

    const ret = (length > 0 ? aa[length - 1] : null);
    return ret;
  }

  private collectClones(): Scope[] {
    const ret: Scope[] = [];
    const re = new RegExp(`^${this.state.id.replace('.', '\\.')}\\.\\d+$`);
    if (this.dom && this.dom.parentElement) {
      this.dom.parentElement.childNodes.forEach(n => {
        if (n.nodeType === dom.ELEMENT_NODE) {
          const id = (n as dom.DomElement).getAttribute(ID_ATTR);
          if (id !== undefined && re.test(id)) {
            const i = parseInt(id.substring(`${this.state.id}.`.length));
            const state = this.cloneState(this.state, i, true);
            delete state.values[DATA_VALUE].fn;
            delete state.values[DATA_VALUE].t;
            state.values[DATA_VALUE].v = undefined;
            const dom = n as dom.DomElement;
            const clone = this.cloneScope(dom, state);
            clone.relinkValues();
            ret.push(clone);
          }
        }
      });
    }
    return ret;
  }

  private cloneDom(id: string) {
    const dom = this.dom?.cloneNode(true) as dom.DomElement | undefined;
    dom && dom.setAttribute(ID_ATTR, id);
    dom && this.dom?.parentElement?.insertBefore(dom, this.dom);
    return dom;
  }

  private cloneScope(dom: dom.DomElement | undefined, state: ScopeState) {
    const domMap = new DomMap(dom, this.domMap);
    const ret = new Scope(this.app, domMap, state, this.parent, this);
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
    if (prop.startsWith(RESERVED_PREFIX)) {
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
    if (value.fn) {
      if (!value.cycle || value.cycle < (this.app.state.cycle ?? 0)) {
        value.cycle = this.app.state.cycle ?? 0;
        const old = value.v;

        try {
          value.v = value.fn.apply((value.scope as Scope).obj);
        } catch (ex: any) {
          //TODO (+ use ValueState.pos if available)
          console.log(ex);
        }

        if (old == null ? value.v != null : old !== value.v) {
          value.t && this.reflect(value);
          value.dst && this.propagate(value);
        }
      }
    }
  }

  private reflect(value: ValueState) {
    switch (value.t) {
      case 'attribute':
        value.k && value.scope?.setAttr(value.k, value.v);
        break;
      case 'text':
        const t = value.k && value.scope?.textMap?.get(value.k);
        //TODO: HTML encoding/decoding?
        t ? t.nodeValue = `${value.v != null ? value.v : ''}` : null;
        break;
      case 'data':
        value.v = value.scope?.replicateFor(value);
    }
  }

  private propagate(value: ValueState) {
    if (this.app.pushLevel != null) {
      if ((this.app.pushLevel ?? 0) === 0) {
        this.app.state.cycle = (this.app.state.cycle ?? 0) + 1;
      }
      this.app.pushLevel++;
      try {
        const that = this;
        (value.dst as Set<ValueState>).forEach(function(v) {
          that.update(v);
        });
      } catch (ignored: any) {}
      this.app.pushLevel--;
    }
  }
}
