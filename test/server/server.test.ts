import { assert } from "chai";
import { JSDOM } from "jsdom";
import Server from "../../src/server/server";

const ROOTPATH = process.cwd() + '/test/server/delivery';

describe('server', () => {
  let server: Server;
  let port: number;

  before(async () => {
    server = new Server(ROOTPATH);
    port = await server.startServer();
  });

  after(async () => {
    server.stopServer();
  });

  // it('should deliver base.source.html', async () => {
  //   const jsdom = await JSDOM.fromURL(`http://localhost:${port}/base.source.html`);
  //   const text = jsdom.window.document.querySelector('body p')?.textContent;
  //   assert.equal(text, 'change: 0');
  // });

});
