import { assert } from "chai";
import { parseScript } from "esprima";
import { Compiler } from '../../src/server/compiler';
import { HtmlDocument } from "../../src/server/htmldom";
import Preprocessor from "../../src/server/preprocessor";
import { normalizeText } from "../../src/shared/util";

const preprocessor = new Preprocessor(process.cwd() + '/test/server/compiler');

describe("compiler", () => {

  it("should compile minimal page", async () => {
    const ast = parseScript(`(function () {
    })()`);
    console.log(ast);

    const doc = await preprocessor.reset().read('comp001.html');
    const code = Compiler.compile(doc as HtmlDocument);
    assert.equal(normalizeText(code), normalizeText(`(function() {
    })();`));
  });

});
