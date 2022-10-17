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

  it(`replication - add clones`, async () => {
    const run = await loadPage('replication.html');
    run.refresh();
    assert.equal(
      normalizeSpace((run.doc as HtmlDocument).toString(true)),
      normalizeSpace(`<!DOCTYPE html>
      <html data-aremel="0">
        <head data-aremel="1">
        </head>
        <body data-aremel="2">
          <ul>
            <li data-aremel="3.0">data: <!---:1-->a<!---/1--></li>` +
            `<li data-aremel="3.1">data: <!---:1-->b<!---/1--></li>` +
            `<li data-aremel="3">data: <!---:1-->c<!---/1--></li>
          </ul>
        </body>
      </html>
      `)
    );
    const li = getScope(run, '3');
  });
});
