import { assert } from "chai";
import { generate } from "escodegen";
import { compile } from "../../src/server/compiler";
import { HtmlDocument } from "../../src/server/htmldom";
import { load } from "../../src/server/loader";
import Preprocessor from "../../src/server/preprocessor";
import * as rt from "../../src/server/runtime";
import { normalizeText } from "../../src/shared/util";

const preprocessor = new Preprocessor(process.cwd() + '/test/server/compiler');

describe("compiler", () => {

  it(`001 html tag only`, async () => {
    const doc = await preprocessor.reset().read('compiler001.html');
    const app = load(doc as HtmlDocument, preprocessor);
    const ast = compile(app);
    const str = generate(ast);
    assert.equal(
      normalizeText(str),
      normalizeText(`(function () {
        function ${rt.NOTNULL_FN}(s) {
          return s != null ? s : '';
        }
      }());`)
    );
  });

  it(`002 html tag only`, async () => {
    const doc = await preprocessor.reset().read('compiler002.html');
    const app = load(doc as HtmlDocument, preprocessor);
    const ast = compile(app);
    const str = generate(ast);
    assert.equal(
      normalizeText(str),
      normalizeText(`(function () {
        function ${rt.NOTNULL_FN}(s) {
          return s != null ? s : '';
        }
      }());`)
    );
  });

});
