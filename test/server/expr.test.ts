import { assert } from "chai";
import * as rt from "../../src/shared/runtime";
import { prepareExpr } from "../../src/server/expr";

describe("expr", () => {

	it("should prepare empty expressions", () => {
		assert.equal(prepareExpr(''), "''");
		assert.equal(prepareExpr('[[]]'), "");
		assert.equal(prepareExpr('[[ ]]'), " ");
	});

	it("should prepare quotes", () => {
		assert.equal(prepareExpr('x'), "'x'");
		assert.equal(prepareExpr('"'), "'\\\"'");
		assert.equal(prepareExpr("'"), "'\\\''");
	});

	it("should prepare complex expressions", () => {
		assert.equal(prepareExpr(" [[1 + 2]]"), `' '+${rt.NOTNULL_FN}(1 + 2)`);
		assert.equal(prepareExpr("[[1 + 2]] "), `${rt.NOTNULL_FN}(1 + 2)+' '`);
		assert.equal(prepareExpr(" [[1 + 2]] "), `' '+${rt.NOTNULL_FN}(1 + 2)+' '`);
		assert.equal(prepareExpr('[[f("\"hello\"")]]'), 'f("\"hello\"")');
		assert.equal(prepareExpr("[[f('\"hello\"')]]"), 'f(\'"hello"\')');
		assert.equal(prepareExpr("sum: [[1 + 2]]"), `'sum: '+${rt.NOTNULL_FN}(1 + 2)`);
	});

	it("should prepare function expressions", () => {
		assert.equal(prepareExpr("[[function() {return 1}]]"), 'function() {return 1}');
		assert.equal(prepareExpr("[[function() {return 1\n" + "}]]"), 'function() {return 1\n' + '}');
		assert.equal(prepareExpr(`[[if (true) {
			trace('ok');
		} else {
			trace('ko');
		}]]`), `if (true) {
			trace('ok');
		} else {
			trace('ko');
		}`);
		assert.equal(prepareExpr("[[function(x) {return x * 2}]]"), 'function(x) {return x * 2}');
		assert.equal(prepareExpr("[[function\n(x) {return x * 2}]]"), 'function\n(x) {return x * 2}');
		assert.equal(prepareExpr("[[(x) -> {return x * 2}]]"), '(x) -> {return x * 2}');
		assert.equal(prepareExpr("[[\n(x) -> {return x * 2}]]"), '\n(x) -> {return x * 2}');
		assert.equal(prepareExpr("[[(x) ->\n{return x * 2}]]"), '(x) ->\n{return x * 2}');
		assert.equal(prepareExpr(`[[function(x, y) {
            return x * y;
        }]]`), `function(x, y) {
            return x * y;
        }`);
	});

	it("should prepare data expressions", () => {
		assert.equal(
      prepareExpr(`[[ [{list:[1,2]}, {list:["a","b","c"]}] ]]`),
		  ' [{list:[1,2]}, {list:["a","b","c"]}] '
    );
		assert.equal(prepareExpr(`[[ [
        {list:[1,2]},
        {list:["a","b","c"]}
      ] ]]`),
      ` [
        {list:[1,2]},
        {list:["a","b","c"]}
      ] `
    );
		assert.equal(prepareExpr(`[[[
        {list:[1,2]},
        {list:["a","b","c"]}
      ]]]`),
      `[
        {list:[1,2]},
        {list:["a","b","c"]}
      ]`
    );
	});

	it("should prepare complex class expression", () => {
		assert.equal(
      prepareExpr(`btn btn-[[outline ? 'outline-' : '']][[type]][[nowrap ? ' text-nowrap' : '']][[size ? ' btn-'+size : '']]`),
		  `'btn btn-'+__nn(outline ? 'outline-' : '')+__nn(type)+__nn(nowrap ? ' text-nowrap' : '')+__nn(size ? ' btn-'+size : '')`
    );
	});

});
