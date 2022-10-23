import { assert } from "chai";
import { JSDOM } from "jsdom";
import Server from "../../src/server/server";
import * as rt from "../../src/shared/runtime";

const ROOTPATH = process.cwd() + '/test/server/delivery';

describe('server', () => {
  let server: Server;
  let port: number;

  before(async () => {
    server = new Server(ROOTPATH);
    port = await server.startServer({ mute: true });
  });

  after(async () => {
    server.stopServer();
  });

  it('should deliver base.source.html', async () => {
    const jsdom = await JSDOM.fromURL(
      `http://localhost:${port}/base.source.html`, {
        runScripts: "dangerously",
        resources: "usable"
      }
    )
    assert.exists(jsdom.window[rt.STATE_GLOBAL]);
    const rtScript = jsdom.window.document.body.lastElementChild;
    await new Promise<Event>(res => rtScript?.addEventListener('load', res));
    assert.exists(jsdom.window[rt.APP_GLOBAL]);
  });
});
