import Scope from "./Scope";

export declare type ValueFn = (obj: any) => any;

export interface ValueProps {
	name?: string;
	fn?: ValueFn;
	refs?: string[];
}

export default class Value {
	scope: Scope;
	props: ValueProps;
	cycle: number;
	value: any;

	constructor(scope: Scope, props: ValueProps) {
		this.scope = scope;
		this.props = props;
		this.cycle = 0;
		this.value = undefined;
	}

}
