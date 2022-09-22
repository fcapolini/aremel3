import { assert } from "chai";
import Scope from "../../../src/shared/react/scope";
import Value from "../../../src/shared/react/value";

describe('value', function () {

	it("should add a scope value", () => {
		const scope = new Scope(null, {});
		const value = scope.addValue({});
		assert.equal(value.scope, scope);
		assert.equal(value.cycle, 0);
		assert.isUndefined(value.value);
	});

});
