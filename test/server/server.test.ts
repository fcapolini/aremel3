import { assert } from "chai";
import { JSDOM } from "jsdom";
import { exec, execSync, ChildProcess } from "child_process";
import Server from "../../src/server/server";
import * as rt from "../../src/shared/runtime";

const ROOTPATH = process.cwd() + '/test/server/delivery';

describe('server', function () {
  this.timeout(10000);
  let serverProcess: ChildProcess;
  let port: string;

  before(async () => {
    // compile client runtime code
    execSync('npx spack');
    // launch server from ts sources
    serverProcess = exec(`npx ts-node src/server.ts -m ${ROOTPATH}`);
    port = await new Promise<string>((resolve, reject) => {
      serverProcess.once('error', (code, signal) => reject(new Error(`${code} ${signal}`)));
      serverProcess.stderr?.on('data', (s) => reject(new Error(s)));
      serverProcess.stdout?.on('data', (s) => {
        const parts = s.split(':');
        if (parts.length === 2 && parts[0] === 'listening on port') {
          resolve(parts[1].trim());
        }
      });
    });
  });

  after(() => {
    serverProcess.kill('SIGKILL');
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
