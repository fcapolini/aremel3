import { assert } from "chai";
import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
import { HtmlElement } from "../../src/compiler/htmldom";
import HtmlParser from "../../src/compiler/htmlparser";
import Server from "../../src/server/server";
import * as rt from "../../src/shared/runtime";
import { normalizeSpace, normalizeText } from "../../src/shared/util";

const ROOTPATH = process.cwd() + '/test/server/server2';
const SUFFIX = '._.html';
const sources = fs.readdirSync(ROOTPATH)
  .filter(v => v.endsWith(SUFFIX))
  .map(v => v.substring(0, v.length - SUFFIX.length))
  .sort();

describe('server2', function () {
  let server: Server;
  let portNr: number;

  before(async () => {
    server = new Server(ROOTPATH);
    portNr = await server.start({ mute: true });
  });

  after(() => {
    server.stop();
  });

  sources.forEach(p => {
    it(p, async () => {
      const jsdom = await JSDOM.fromURL(
        `http://localhost:${portNr}/${p}${SUFFIX}`, {
          runScripts: "dangerously",
          resources: "usable"
        }
      );
      await new Promise<void>(resolve => {
        const e = jsdom.window.document.querySelector('body > script:last-child');
        e?.addEventListener('load', (_) => resolve());
      });
      const app = jsdom.window[rt.APP_GLOBAL];
      for (let i = 0; fs.existsSync(path.join(ROOTPATH, `${p}.${i}.html`));) {
        const live = serialize(jsdom);
        const file = fs.readFileSync(path.join(ROOTPATH, `${p}.${i}.html`));
        assert.equal(
          normalizeText(live)?.trim(),
          normalizeText(file.toString())?.trim(),
          `failed for change = ${i}`
        );
        app.root.obj.change = ++i;
      }
    });
  });

});

function serialize(jsdom: JSDOM): string | undefined {
  const doc = HtmlParser.parse(jsdom.serialize()
    .replace(' async="" ', ' async ')
    .replace('><html', '>\n<html')
    .replace('><head', '>\n<head')
    .replace('></html>', '>\n</html>'));
  const toRemove: HtmlElement[] = [];
  doc.scan((e) => {
    e.removeAttribute(rt.ID_ATTR);
    e.tagName === 'SCRIPT' && (toRemove.push(e));
    return false;
  }, true);
  for (const e of toRemove) {
    e.remove();
  }
  return doc.toString(true);
}
