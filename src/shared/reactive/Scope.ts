import Value from "./Value";

// export interface ScopeProps {

// }

// export default class Scope {
// 	root: Scope;
// 	parent: Scope | null;
// 	children: Scope[];
// 	props: ScopeProps;
// 	cb?: (p: Scope) => void;
// 	cycle: number;
// 	values: Set<Value>;

// 	constructor(parent: Scope | null, props: ScopeProps, cb?: (p: Scope) => void) {
// 		this.root = parent ? parent.root : this;
// 		this.parent = parent;
// 		this.children = [];
// 		this.props = props;
// 		this.cb = cb;
// 		this.cycle = 0;
// 		this.values = new Set();
// 	}

// }

export interface ScopeProps {}

export default class Scope {
  root: Scope;
  parent: Scope | null;
  props: ScopeProps;
  cb?: (p: Scope) => void;
  // cb: ((p: Scope) => void) | undefined;

  constructor(parent: Scope | null, props: ScopeProps, cb?: (p: Scope) => void) {
    this.root = (parent ? parent.root : this);
    this.parent = parent;
    this.props = props;
    this.cb = cb;
  }

}
