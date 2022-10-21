import { assert } from "chai";
import fs from "fs";
import { JSDOM } from "jsdom";
import Delivery from "../../src/server/delivery";
import { DomDocument } from "../../src/shared/dom";
import * as rt from "../../src/shared/runtime";
import { normalizeSpace } from "../../src/shared/util";

const ROOTPATH = process.cwd() + '/test/server/delivery';
const SOURCE_SUFFIX = '.source.html';
const CACHED_SUFFIX = '.cached.html';
const CHANGE_SUFFIX = '.change.html';
const delivery = new Delivery(ROOTPATH);
const sources = fs.readdirSync(ROOTPATH)
  .filter(v => v.endsWith(SOURCE_SUFFIX))
  .map(v => v.substring(0, v.length - SOURCE_SUFFIX.length))
  .sort();

describe('delivery', () => {

  sources.forEach(p => {
    it(p, async () => {
      // server page
      const outputPage = await delivery.fromSource(p + SOURCE_SUFFIX, true);
      // console.log(outputPage);
      // cached page
      const cachedPage = await fs.promises.readFile(
        `${ROOTPATH}/${p}${CACHED_SUFFIX}`,
        { encoding: 'utf8' }
      );
      assert.equal(
        normalizeSpace(outputPage)?.trim(),
        normalizeSpace(cachedPage)?.trim()
      );
      // client page
      const jsdom = new JSDOM(outputPage, { runScripts: "dangerously" });
      const window = jsdom.window;
      const document = window.document;
      const state = window[rt.STATE_GLOBAL];
      const app = new rt.App(document as unknown as DomDocument, state);
      app.refresh();
      const count = document.querySelectorAll(`[${rt.ID_ATTR}]`).length;
      assert.equal(app.scopes.size, count);
      assert.equal(
        normalizeSpace(jsdom.serialize()
          .replace(' async="" ', ' async ')
          .replace('><html', '>\n<html')
          .replace('><head', '>\n<head')
          .replace('></html>', '>\n</html>'))?.trim(),
        normalizeSpace(cachedPage)?.trim()
      );
      // page change
      app.root.obj.change = 1;
      const changePage = await fs.promises.readFile(
        `${ROOTPATH}/${p}${CHANGE_SUFFIX}`,
        { encoding: 'utf8' }
      );
      assert.equal(
        normalizeSpace(jsdom.serialize()
          .replace(' async="" ', ' async ')
          .replace('><html', '>\n<html')
          .replace('><head', '>\n<head')
          .replace('></html>', '>\n</html>'))?.trim(),
        normalizeSpace(changePage)?.trim()
      );
    });
  });

});
