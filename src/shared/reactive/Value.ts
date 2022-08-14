import Scope from "./Scope";

export interface ValueProps {

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
