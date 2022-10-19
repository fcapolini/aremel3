import { assert } from "chai";
import fs from "fs";
import { JSDOM } from "jsdom";
import Delivery from "../../src/server/delivery";
import { DomDocument } from "../../src/shared/dom";
import * as rt from "../../src/shared/runtime";
import { normalizeText } from "../../src/shared/util";

const ROOTPATH = process.cwd() + '/test/server/service';
const SRC_SUFFIX = '.html';
const PRE_PREFIX = '.';
const delivery = new Delivery(ROOTPATH);
const sources = fs.readdirSync(ROOTPATH)
  .filter(v => v.endsWith(SRC_SUFFIX) && !v.startsWith(PRE_PREFIX))
  .map(v => v.substring(0, v.length - SRC_SUFFIX.length))
  .sort();

describe('service', () => {

  sources.forEach(p => {
    it(p, async () => {
      // server page
      const outputPage = await delivery.fromSource(p + SRC_SUFFIX, true);
      // cached page
      const cachedPage = await fs.promises.readFile(
        `${ROOTPATH}/${PRE_PREFIX}${p}${SRC_SUFFIX}`,
        { encoding: 'utf8' }
      );
      assert.equal(normalizeText(outputPage), normalizeText(cachedPage));
      // client page
      const window = new JSDOM(outputPage, { runScripts: "dangerously" }).window;
      const document = window.document;
      const state = window[rt.STATE_GLOBAL];
      const app = new rt.App(document as unknown as DomDocument, state);
      app.refresh();
      const count = document.querySelectorAll(`[${rt.ID_ATTR}]`).length;
      assert.equal(app.scopes.size, count);
    });
  });

});
