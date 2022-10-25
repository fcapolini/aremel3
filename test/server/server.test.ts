import { assert } from "chai";
import { JSDOM } from "jsdom";
import { exec, execSync, ChildProcess } from "child_process";
import Server from "../../src/server/server";
import * as rt from "../../src/shared/runtime";

const ROOTPATH = process.cwd() + '/test/server/delivery';

describe('server', function () {
  let server: Server;
  let portNr: number;

  before(async () => {
    server = new Server(ROOTPATH);
    portNr = await server.start({ mute: true });
  });

  after(() => {
    server.stop();
  });

  it('should deliver base.source.html', async () => {
    const jsdom = await JSDOM.fromURL(
      `http://localhost:${portNr}/base.source.html`, {
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
