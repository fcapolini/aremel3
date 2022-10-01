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
    const doc = await preprocessor.reset().read('base-app.html');
    const langApp = load(doc as HtmlDocument, preprocessor);
    // const appStateSrc = compileApp(langApp);
    // const appState = eval(appStateSrc);
    //TODO
  });

  it(`root value`, async () => {
    const doc = await preprocessor.reset().read('root-value.html');
    const app = load(doc as HtmlDocument, preprocessor);
    // const appState = compileApp(app);
    //TODO
  });

});
