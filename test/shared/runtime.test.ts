import { assert } from "chai";
import HtmlParser from "../../src/server/htmlparser";
import { DomDocument } from "../../src/shared/dom";
import * as rt from "../../src/shared/runtime";
import * as lang from "../../src/server/lang";
import { normalizeText } from "../../src/shared/util";
import { HtmlDocument, HtmlElement } from "../../src/server/htmldom";

function baseDoc(): DomDocument {
  return HtmlParser.parse(`<html data-aremel="0">
    <head data-aremel="1"></head>
    <body data-aremel="2"></body>
  </html>`) as DomDocument;
}

function baseState(): rt.AppState {
  return {
    root: {
      id: '0', aka: 'page', values: {},
      children: [
        { id: '1', aka: 'head', values: {} },
        { id: '2', aka: 'body', values: {} }
      ]
    }
  };
}

function replDoc(): DomDocument {
  return HtmlParser.parse(`<html data-aremel="0">
    <head data-aremel="1"></head>
    <body data-aremel="2">
      <p data-aremel="3"><!---:0--><!---/0--></p>
    </body>
  </html>`, false) as DomDocument;
}

function replState(data: any): rt.AppState {
  return {
    root: {
      id: '0', aka: 'page', values: {},
      children: [
        { id: '1', aka: 'head', values: {} },
        { id: '2', aka: 'body', values: {}, children: [
          { id: '3', values: {
            data: { fn: function() { return data; }, t: 'data' },
            __t$0: { fn: function() { return this.data; }, t: 'text', k: '0', refs: ['data'] }
          } }
        ] }
      ]
    }
  };
}

describe("runtime", () => {

  it(`base app`, async () => {
    const doc = baseDoc();
    const state = baseState();
    const app = new rt.App(doc, state);
    assert.equal(app.domMap.size, 3);
    assert.equal(app.root.children.length, 2);
    assert.equal(app.root.dom, app.domMap.get('0'));
    assert.equal(app.root.children[0].dom, app.domMap.get('1'));
    assert.equal(app.root.children[1].dom, app.domMap.get('2'));
  });

  it(`root value`, async () => {
    const doc = baseDoc();
    const state = baseState();
    state.root.values['v'] = { fn: () => 1 };
    const app = new rt.App(doc, state);
    assert.equal(app.root.obj.v, 1);
    app.root.obj.v = 2;
    assert.equal(app.root.state.values['v'].v, 2);
  });

  it(`root attribute value`, async () => {
    const doc = baseDoc();
    const state = baseState();
    state.root.values['attr_lang'] = { fn: () => 'en', t: 'attribute', k: 'lang' };
    const app = new rt.App(doc, state);
    app.refresh();
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0" lang="en">
        <head data-aremel="1"></head>
        <body data-aremel="2"></body>
      </html>`)
    );
  });

  it(`body attribute value`, async () => {
    const doc = baseDoc();
    const state = baseState();
    const body = (state.root.children && state.root.children[1]) as rt.ScopeState;
    body.values['attr_class'] = { fn: () => 'main', t: 'attribute', k: 'class' };
    const app = new rt.App(doc, state);
    app.refresh();
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2" class="main"></body>
      </html>`)
    );
  });

  it(`dependent attribute value`, async () => {
    const doc = baseDoc();
    const state = baseState();
    const body = (state.root.children && state.root.children[1]) as rt.ScopeState;
    body.values['v'] = { fn: () => 'main' };
    //
    // NOTE: in order to access other values, value functions must be classic
    // functions, not arrow functions, so they support `apply()` and `this`.
    //
    // see:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
    //
    // The compiler will generate classic functions and add `this.` as needed.
    //
    // At runtime, `this` will be a Proxy object that will resolve the property
    // name in its `get()` and `set()` methods.
    //
    body.values['attr_class'] = {
      fn: function() { /* @ts-ignore */ return 'base ' + this.v; },
      refs: ['v'],
      t: 'attribute',
      k: 'class'
    };
    const app = new rt.App(doc, state);
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2"></body>
      </html>`)
    );
    app.refresh();
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2" class="base main"></body>
      </html>`)
    );
    const bodyObj = (app.root.children && app.root.children[1]?.obj) as any;
    bodyObj.v = 'other';
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2" class="base other"></body>
      </html>`)
    );
  });

  it(`dependent text value`, async () => {
    const doc = baseDoc();
    const e = doc.firstElementChild?.firstElementChild?.nextElementSibling as HtmlElement;
    e.addChild(doc.createTextNode('Hello '));
    e.addChild(doc.createComment(rt.TEXT_COMMENT1 + '0'));
    e.addChild(doc.createTextNode(' '));
    e.addChild(doc.createComment(rt.TEXT_COMMENT2 + '0'));
    e.addChild(doc.createTextNode('!'));
    const state = baseState();
    const body = (state.root.children && state.root.children[1]) as rt.ScopeState;
    body.values['v'] = { fn: () => 'Alice' };
    body.values[`${rt.TEXT_ID_PREFIX}0`] = {
      fn: function() { /* @ts-ignore */ return this.v; },
      refs: ['v'],
      t: 'text',
      k: '0'
    };
    const app = new rt.App(doc, state).refresh();
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">Hello <!---:0-->Alice<!---/0-->!</body>
      </html>`)
    );
    const bodyObj = (app.root.children && app.root.children[1]?.obj) as any;
    bodyObj.v = 'Bob';
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">Hello <!---:0-->Bob<!---/0-->!</body>
      </html>`)
    );
  });

  it(`replication 1`, async () => {
    const app = new rt.App(replDoc(), replState(null)).refresh();
    assert.equal(
      normalizeText((app.doc as HtmlDocument).toString(true)),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">
          <p data-aremel="3"><!---:0--><!---/0--></p>
        </body>
      </html>`)
    );
  });

  it(`replication 2`, async () => {
    const app = new rt.App(replDoc(), replState([])).refresh();
    assert.equal(
      normalizeText((app.doc as HtmlDocument).toString(true)),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">
          <p data-aremel="3"><!---:0--><!---/0--></p>
        </body>
      </html>`)
    );
  });

  it(`replication 3`, async () => {
    const app = new rt.App(replDoc(), replState(['a'])).refresh();
    assert.equal(
      normalizeText((app.doc as HtmlDocument).toString(true)),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">
          <p data-aremel="3"><!---:0-->a<!---/0--></p>
        </body>
      </html>`)
    );
  });

  it(`replication 4`, async () => {
    const app = new rt.App(replDoc(), replState(['a', 'b'])).refresh();
    assert.equal(
      normalizeText((app.doc as HtmlDocument).toString(true)),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">
          <p data-aremel="3.0"><!---:0-->a<!---/0--></p><p data-aremel="3"><!---:0-->b<!---/0--></p>
        </body>
      </html>`)
    );
  });

  it(`replication 10`, async () => {
    const app = new rt.App(replDoc(), replState(null)).refresh();
    assert.equal(
      normalizeText((app.doc as HtmlDocument).toString(true)),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">
          <p data-aremel="3"><!---:0--><!---/0--></p>
        </body>
      </html>`)
    );
    const p = app.root.children[1].children[0];
    assert.equal(p.state.id, '3');
    p.obj['data'] = ['x'];
    assert.equal(
      normalizeText((app.doc as HtmlDocument).toString(true)),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">
          <p data-aremel="3"><!---:0-->x<!---/0--></p>
        </body>
      </html>`)
    );
    p.obj['data'] = ['a', 'b', 'c'];
    assert.equal(
      normalizeText((app.doc as HtmlDocument).toString(true)),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2">
          <p data-aremel=\"3.0\"><!---:0-->a<!---/0--></p><p data-aremel=\"3.1\"><!---:0-->b<!---/0--></p><p data-aremel=\"3\"><!---:0-->c<!---/0--></p>
        </body>
      </html>`)
    );
  });

});
