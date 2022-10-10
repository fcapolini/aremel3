import { assert } from "chai";
import { generate } from "escodegen";
import { compileApp } from "../../src/server/compiler";
import { load } from "../../src/server/loader";
import Preprocessor from "../../src/server/preprocessor";
import { DomDocument } from "../../src/shared/dom";
import * as rt from "../../src/shared/runtime";
import fs from "fs";
import { normalizeSpace } from "../../src/shared/util";
import { HtmlDocument } from "../../src/server/htmldom";

const ROOTPATH = process.cwd() + '/test/server/pages';
const SUFFIX = '.in.html';
const SUFFIX2 = '.out.html';
const pages = fs.readdirSync(ROOTPATH)
  .filter(v => v.endsWith(SUFFIX))
  .map(v => v.substring(0, v.length - SUFFIX.length))
  .sort();
const prepro = new Preprocessor(ROOTPATH);

describe("pages", () => {

  it('aaa', async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: `<!DOCTYPE html>
        <html>
          <head></head>
          <body></body>
        </html>`
    }]);
    const app = await load('index.html', pre);
    const doc = app.doc as DomDocument;
    const ast = compileApp(app);
    const src = generate(ast);
    const obj = eval(`(${src})`);
    const run = new rt.App(doc, obj);
    assert.equal(run.state.cycle ?? 0, 0);
    run.refresh();
    assert.equal(run.state.cycle, 1);
  });

  pages.forEach(p => {
    it(p, async () => {
      const app = await load(p + SUFFIX, prepro);
      const doc = app.doc as HtmlDocument;
      const ast = compileApp(app);
      const src = generate(ast);
      const obj = eval(`(${src})`);
      const run = new rt.App(doc, obj);
      run.refresh();
      const txt = await fs.promises.readFile(
        `${ROOTPATH}/${p}${SUFFIX2}`,
        { encoding: 'utf8' }
      );
      assert.equal(
        normalizeSpace(doc.toString(true)),
        normalizeSpace(txt)
      );
    });
  });

});
