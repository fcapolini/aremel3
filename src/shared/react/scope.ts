import Value, { ValueProps } from "./value";

const ANON_VALUE_PREFIX = 'v-';

export declare type ScopeObj = any;
export declare type ScopeProxy = any;

export interface ScopeProps {

}

export default class Scope {
	root: Scope;
	parent: Scope | null;
	children: Scope[];
	props: ScopeProps;
	cb?: (p: Scope) => void;
	cycle: number;
	values: Map<string, Value>;
	obj: ScopeObj;
	proxy: ScopeProxy;

	constructor(parent: Scope | null, props: ScopeProps, cb?: (p: Scope) => void) {
		this.root = parent ? parent.root : this;
		this.parent = parent;
		this.children = [];
		this.props = props;
		this.cb = cb;
		this.cycle = 0;
		this.values = new Map();
		this.obj = {};
		this.proxy = new Proxy(this.obj, {
			
		});
	}

	addValue(props: ValueProps): Value {
		const value = new Value(this, props);
		const name = props.name ?? `${ANON_VALUE_PREFIX}-${this.values.size}`;
		this.values.set(name, value);
		return value;
	}

}
