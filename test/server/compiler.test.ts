import { assert } from "chai";
import { generate } from "escodegen";
import { compileApp } from "../../src/server/compiler";
import { HtmlDocument } from "../../src/server/htmldom";
import * as lang from "../../src/server/lang";
import { load } from "../../src/server/loader";
import Preprocessor from "../../src/server/preprocessor";
import * as rt from "../../src/shared/runtime";
import { normalizeText } from "../../src/shared/util";

const preprocessor = new Preprocessor(process.cwd() + '/test/server/compiler');

describe("compiler", () => {

  it(`base app`, async () => {
    var prepro = new Preprocessor(preprocessor.rootPath, [{
      fname: 'dummy.html',
      content: 
        '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head></head>\n' +
        '<body></body>\n' +
        '</html>\n'
    }]);
    const doc = await prepro.read('dummy.html') as HtmlDocument;
    const langApp = load(doc as HtmlDocument, preprocessor);
    // const appStateSrc = compileApp(langApp);
    // const appState = eval(appStateSrc);
    //TODO
  });

  it(`value parsing error`, async () => {
    var prepro = new Preprocessor(preprocessor.rootPath, [{
      fname: 'dummy.html',
      content: 
        '<!DOCTYPE html>\n' +
        '<html :v=[[\n' +
        "' * 2 ]]>\n" +
        '<head></head>\n' +
        '<body></body>\n' +
        '</html>\n'
    }]);
    const doc = await prepro.read('dummy.html') as HtmlDocument;
    const app = load(doc as HtmlDocument, prepro);
    const ast = compileApp(app);
    assert.equal(app.errors.length, 1);
    assert.deepEqual(app.errors[0], {
      type: 'err',
      msg: 'expression parsing: Unexpected token ILLEGAL',
      pos: { fname: '/dummy.html', line1: 3, line2: 3, column1: 1, column2: 1 }
    })
  });

});
