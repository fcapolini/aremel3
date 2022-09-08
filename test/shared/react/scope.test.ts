import { assert } from "chai";
import Scope from "../../../src/shared/react/scope";

describe('Scope', function () {

	it("should be root and have no parent", () => {
		const scope = new Scope(null, {});
		assert.isNull(scope.parent);
		assert.equal(scope.root, scope);
	});

	it("should have root and parent", () => {
		const root = new Scope(null, {});
		const scope = new Scope(root, {});
		assert.isNull(root.parent);
		assert.equal(root.root, root);
		assert.equal(scope.parent, root);
		assert.equal(scope.root, root);
	});

});
