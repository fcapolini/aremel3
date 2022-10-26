import { assert } from "chai";
import fs from "fs";
import { JSDOM } from "jsdom";
import Server from "../../src/server/server";
import * as rt from "../../src/shared/runtime";
import { normalizeSpace } from "../../src/shared/util";

const ROOTPATH = process.cwd() + '/test/server/server1';
const SOURCE_SUFFIX = '.source.html';
const CACHED_SUFFIX = '.cached.html';
const CHANGE_SUFFIX = '.change.html';
const sources = fs.readdirSync(ROOTPATH)
  .filter(v => v.endsWith(SOURCE_SUFFIX))
  .map(v => v.substring(0, v.length - SOURCE_SUFFIX.length))
  .sort();

describe('server1', function () {
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
        `http://localhost:${portNr}/${p}${SOURCE_SUFFIX}`, {
          runScripts: "dangerously",
          resources: "usable"
        }
      );
      await new Promise<void>(resolve => {
        const e = jsdom.window.document.querySelector('body > script:last-child');
        e?.addEventListener('load', (_) => resolve());
      });
      const cachedPage = await fs.promises.readFile(
        `${ROOTPATH}/${p}${CACHED_SUFFIX}`,
        { encoding: 'utf8' }
      );
      assert.equal(
        normalizeSpace(serialize(jsdom))?.trim(),
        normalizeSpace(cachedPage)?.trim()
      );
      const app = jsdom.window[rt.APP_GLOBAL];
      app.root.obj.change = 1;
      const changePage = await fs.promises.readFile(
        `${ROOTPATH}/${p}${CHANGE_SUFFIX}`,
        { encoding: 'utf8' }
      );
      assert.equal(
        normalizeSpace(serialize(jsdom))?.trim(),
        normalizeSpace(changePage)?.trim()
      );
    });
  });

});

function serialize(jsdom: JSDOM): string {
  return jsdom.serialize()
    .replace(' async="" ', ' async ')
    .replace('><html', '>\n<html')
    .replace('><head', '>\n<head')
    .replace('></html>', '>\n</html>');
}
