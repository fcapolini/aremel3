import { assert } from "chai";
import Scope from "../../../src/shared/react/Scope";

describe('Scope', function () {

	it("should be root", () => {
		const scope = new Scope(null, {});
		assert.isNull(scope.parent);
		assert.equal(scope.root, scope);
	});

	it("should have root", () => {
		const scope1 = new Scope(null, {});
		const scope2 = new Scope(scope1, {});
		assert.isNull(scope1.parent);
		assert.equal(scope1.root, scope1);
		assert.equal(scope2.parent, scope1);
		assert.equal(scope2.root, scope1);
	});

});
