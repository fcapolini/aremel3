import { assert } from "chai";
import { generate } from "escodegen";
import fs from "fs";
import { compileApp } from "../../src/server/compiler";
import { HtmlDocument } from "../../src/server/htmldom";
import { load } from "../../src/server/loader";
import Preprocessor from "../../src/server/preprocessor";
import * as rt from "../../src/shared/runtime";
import { normalizeSpace } from "../../src/shared/util";

const ROOTPATH = process.cwd() + '/test/app/pages';
const SUFFIX = '.in.html';
const SUFFIX2 = '.out.html';
const pages = fs.readdirSync(ROOTPATH)
  .filter(v => v.endsWith(SUFFIX))
  .map(v => v.substring(0, v.length - SUFFIX.length))
  .sort();
const prepro = new Preprocessor(ROOTPATH);

describe("pages", () => {

  pages.forEach(p => {
    it(p, async () => {
      const app = await load(p + SUFFIX, prepro);
      const doc = app.doc as HtmlDocument;
      const ast = compileApp(app);
      const src = generate(ast);
      const obj = eval(`(${src})`);
      const run = new rt.App(doc, obj);
      assert.equal(run.state.cycle ?? 0, 0);
      run.refresh();
      assert.isTrue(run.state.cycle && run.state.cycle > 0);
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
