import { assert } from "chai";
import { HtmlDocument } from "../../src/server/htmldom";
import { load } from "../../src/server/loader";
import Preprocessor from "../../src/server/preprocessor";
import { DomDocument } from "../../src/shared/dom";
import { normalizeText } from "../../src/shared/util";

const preprocessor = new Preprocessor(process.cwd() + '/test/server/loader');

describe("loader", () => {

  it(`load 000`, async () => {
    const doc = await preprocessor.reset().read('loader000.html');
    assert.exists(doc);
    const src = load(doc as HtmlDocument, preprocessor);
    assert.exists(src);
    assert.equal(src.errors.length, 1);
    assert.equal(src.errors[0].type, 'err');
    assert.equal(src.errors[0].msg, 'missing root element');
  });

  it(`load 001`, async () => {
    const doc = await preprocessor.reset().read('loader001.html');
    const src = load(doc as HtmlDocument, preprocessor);
    assert.exists(src);
    assert.equal(src.errors.length, 0);
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
    assert.equal(src.errors.length, 1);
    assert.equal(src.errors[0].type, 'err');
    assert.equal(src.errors[0].msg, 'invalid name "a-pp"');
  });

  it(`load 004`, async () => {
    const doc = await preprocessor.reset().read('loader004.html');
    const src = load(doc as HtmlDocument, preprocessor);
    assert.equal(src.root?.dom.tagName, 'HTML');
    assert.equal(src.root?.aka, 'page');
    assert.equal(src.root?.children.length, 2);
    assert.equal(src.root?.children[0].dom.tagName, 'HEAD');
    assert.equal(src.root?.children[0].aka, 'head');
    assert.equal(src.root?.children[1].dom.tagName, 'BODY');
    assert.equal(src.root?.children[1].aka, 'main');
    assert.equal(
      normalizeText(doc?.toString()),
      normalizeText(`<html>
        <head></head>
        <body></body>
      </html>
      `)
    );
  });

  it(`load 005`, async () => {
    const doc = await preprocessor.reset().read('loader005.html');
    const src = load(doc as HtmlDocument, preprocessor);
    assert.equal(src.errors.length, 1);
    assert.equal(src.errors[0].type, 'err');
    assert.equal(src.errors[0].msg, 'invalid name "ma-in"');
    assert.equal(src.errors[0].pos?.fname, '/loader005.html');
    assert.equal(src.errors[0].pos?.line1, 3);
    assert.equal(src.errors[0].pos?.column1, 15);
  });

});
