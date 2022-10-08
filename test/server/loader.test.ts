import { assert } from "chai";
import { HtmlDocument } from "../../src/server/htmldom";
import { load } from "../../src/server/loader";
import * as l from "../../src/server/lang";
import Preprocessor from "../../src/server/preprocessor";
import { DomDocument } from "../../src/shared/dom";
import { normalizeText } from "../../src/shared/util";

const preprocessor = new Preprocessor(process.cwd() + '/test/server/loader');

describe("loader", () => {

  it(`000 empy page`, async () => {
    const app = await load('loader000.html', preprocessor);
    assert.exists(app);
    assert.equal(app.errors.length, 1);
    assert.equal(app.errors[0].type, 'err');
    assert.equal(app.errors[0].msg, 'missing root element');
  });

  it(`001 html tag only`, async () => {
    const app = await load('loader001.html', preprocessor);
    assert.exists(app);
    assert.equal(app.errors.length, 0);
    assert.exists(app.root);
    assert.equal(app.root?.dom.tagName, 'HTML');
    assert.equal(app.root?.props.size, 0);
    assert.equal(app.root?.aka, 'page');
  });

  it(`002 html tag only w/ valid :aka attribute`, async () => {
    const app = await load('loader002.html', preprocessor);
    assert.equal(app.root?.aka, 'app');
    assert.equal(app.doc?.toString(), '<html data-aremel="0"><head data-aremel="1"></head><body data-aremel="2"></body></html>\n');
  });

  it(`003 html tag only w/ invalid :aka attribute`, async () => {
    const src = await load('loader003.html', preprocessor);
    assert.equal(src.errors.length, 1);
    assert.equal(src.errors[0].type, 'err');
    assert.equal(src.errors[0].msg, 'invalid name "a-pp"');
  });

  it(`004 body w/ valid :aka attribute`, async () => {
    const app = await load('loader004.html', preprocessor);
    assert.equal(app.root?.dom.tagName, 'HTML');
    assert.equal(app.root?.aka, 'page');
    assert.equal(app.root?.children.length, 2);
    assert.equal(app.root?.children[0].dom.tagName, 'HEAD');
    assert.equal(app.root?.children[0].aka, 'head');
    assert.equal(app.root?.children[1].dom.tagName, 'BODY');
    assert.equal(app.root?.children[1].aka, 'main');
    assert.equal(nodeCount(app), 3);
    assert.equal(
      normalizeText(app.doc?.toString()),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2"></body>
      </html>
      `)
    );
  });

  it(`005 body w/ invalid :aka attribute`, async () => {
    const app = await load('loader005.html', preprocessor);
    assert.equal(app.errors.length, 1);
    assert.equal(app.errors[0].type, 'err');
    assert.equal(app.errors[0].msg, 'invalid name "ma-in"');
    assert.equal(app.errors[0].pos?.fname, '/loader005.html');
    assert.equal(app.errors[0].pos?.line1, 3);
    assert.equal(app.errors[0].pos?.column1, 15);
  });

  it(`100 html w/ logic value`, async () => {
    const app = await load('loader100.html', preprocessor);
    assert.equal(app.root?.props.size, 1);
    assert.equal(app.root?.props.get(':v')?.val, 'en');
    assert.equal(
      normalizeText(app.doc?.toString()),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2"></body>
      </html>
      `)
    );
  });

  it(`101 html w/ logic value and attribute expression`, async () => {
    const app = await load('loader101.html', preprocessor);
    assert.equal(app.root?.props.size, 3);
    assert.equal(app.root?.props.get(':v')?.val, 'en');
    assert.equal(app.root?.props.get(':x')?.val, '[[1]]');
    assert.equal(app.root?.props.get('lang')?.val, '[[v]]');
    assert.equal(app.root?.children.length, 2);
    const body = app.root?.children[1];
    assert.equal(body?.dom.tagName, 'BODY');
    assert.equal(body?.props.size, 1);
    assert.equal(body?.props.get(`${l.TEXT_ID_PREFIX}0`)?.val, '[[v]]');
    assert.equal(
      normalizeText(app.doc?.toString(true)),
      normalizeText(`<html class="all" data-aremel="0" lang="">
        <head data-aremel="1"></head>
        <body data-aremel="2"><!--${l.TEXT_COMMENT1}0--><!--${l.TEXT_COMMENT2}0--></body>
      </html>
      `)
    );
  });

  it(`102 html w/ logic value and attribute expression`, async () => {
    const app = await load('loader102.html', preprocessor);
    assert.equal(app.root?.props.size, 3);
    assert.equal(app.root?.props.get(':v')?.val, 'en');
    assert.equal(app.root?.props.get(':x')?.val, '[[1]]');
    assert.equal(app.root?.props.get('lang')?.val, '[[v]]');
    assert.equal(app.root?.children.length, 2);
    const body = app.root?.children[1];
    assert.equal(body?.dom.tagName, 'BODY');
    assert.equal(body?.props.size, 1);
    assert.equal(body?.props.get(`${l.TEXT_ID_PREFIX}0`)?.val, '[[v]]');
    assert.equal(
      normalizeText(app.doc?.toString(true)),
      normalizeText(`<html class="all" data-aremel="0" lang="">
        <head data-aremel="1"></head>
        <body data-aremel="2">value: <!--${l.TEXT_COMMENT1}0--><!--${l.TEXT_COMMENT2}0-->...</body>
      </html>
      `)
    );
  });

});

// =============================================================================
// util
// =============================================================================

function nodeCount(app: l.App) {
  let ret = 0;
  function f(node: l.Node) {
    ret++;
    node.children.forEach(n => f(n));
  }
  app.root && f(app.root);
  return ret;
}
