import { assert } from "chai";
import { HtmlDocument } from "../../src/server/htmldom";
import { load } from "../../src/server/loader";
import Preprocessor from "../../src/server/preprocessor";
import { DomDocument } from "../../src/shared/dom";

const preprocessor = new Preprocessor(process.cwd() + '/test/server/loader');

describe("loader", () => {

  it(`load 000`, async () => {
    const doc = await preprocessor.reset().read('loader000.html');
    assert.exists(doc);
    const src = load(doc as HtmlDocument, preprocessor);
    assert.exists(src);
    assert.equal(src.msg.length, 1);
    assert.equal(src.msg[0].type, 'err');
    assert.equal(src.msg[0].msg, 'missing root element');
  });

  it(`load 001`, async () => {
    const doc = await preprocessor.reset().read('loader001.html');
    const src = load(doc as HtmlDocument, preprocessor);
    assert.exists(src);
    assert.equal(src.msg.length, 0);
    assert.exists(src.root);
    assert.equal(src.root?.dom.tagName, 'HTML');
    assert.equal(src.root?.props.size, 0);
    assert.equal(src.root?.aka, 'page');
  });

  it(`load 002`, async () => {
    const doc = await preprocessor.reset().read('loader002.html');
    const src = load(doc as HtmlDocument, preprocessor);
    assert.equal(src.root?.aka, 'app');
    assert.equal(doc?.toString(), '<html><head></head><body></body></html>\n');
  });

  it(`load 003`, async () => {
    const doc = await preprocessor.reset().read('loader003.html');
    const src = load(doc as HtmlDocument, preprocessor);
    assert.equal(src.msg.length, 1);
    assert.equal(src.msg[0].type, 'err');
    assert.equal(src.msg[0].msg, 'invalid name "a-pp"');
  });

  it(`load 004`, async () => {
    const doc = await preprocessor.reset().read('loader003.html');
    const src = load(doc as HtmlDocument, preprocessor);
  });

});
