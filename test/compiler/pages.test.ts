import { assert } from "chai";
import { generate } from "escodegen";
import fs from "fs";
import { compileApp } from "../../src/compiler/compiler";
import { HtmlDocument } from "../../src/compiler/htmldom";
import { load } from "../../src/compiler/loader";
import Preprocessor from "../../src/compiler/preprocessor";
import * as rt from "../../src/shared/runtime";
import { normalizeSpace } from "../../src/shared/util";

const ROOTPATH = process.cwd() + '/test/compiler/pages';
const SUFFIX = '.in.html';
const SUFFIX2 = '.out.html';
const pages = fs.readdirSync(ROOTPATH)
  .filter(v => v.endsWith(SUFFIX))
  .map(v => v.substring(0, v.length - SUFFIX.length))
  .sort();
const prepro = new Preprocessor(ROOTPATH);

async function loadPage(fname: string): Promise<rt.App> {
  const app = await load(fname, prepro);
  const doc = app.doc as HtmlDocument;
  const ast = compileApp(app);
  const src = generate(ast);
  const obj = eval(`(${src})`);
  const run = new rt.App(doc, obj);
  return run;
}

function getScope(app: rt.App, id: string): rt.Scope | undefined {
  function f(p: rt.Scope) {
    if (p.state.id === id) {
      return p;
    }
    for (const s of p.children) {
      const r = f(s);
      if (r) {
        return r;
      }
    }
    return undefined;
  }
  return f(app.root);
}

describe("pages", () => {

  pages.forEach(p => {
    it(p, async () => {
      const run = await loadPage(p + SUFFIX);
      assert.equal(run.state.cycle ?? 0, 0);
      run.refresh();
      assert.isTrue(run.state.cycle && run.state.cycle > 0);
      const txt = await fs.promises.readFile(
        `${ROOTPATH}/${p}${SUFFIX2}`,
        { encoding: 'utf8' }
      );
      assert.equal(
        normalizeSpace((run.doc as HtmlDocument).toString(true)),
        normalizeSpace(txt)
      );
    });
  });
  
});
