import { assert } from "chai";
import HtmlParser from "../../src/server/htmlparser";
import { DomDocument } from "../../src/shared/dom";
import * as rt from "../../src/shared/runtime";
import { normalizeText } from "../../src/shared/util";

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
    const body = state.root.children?.at(1) as rt.ScopeState;
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

  it(`dependent value`, async () => {
    const doc = baseDoc();
    const state = baseState();
    const body = state.root.children?.at(1) as rt.ScopeState;
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
    body.values['attr_class'] = { fn: function() { /* @ts-ignore */ return this.v; }, t: 'attribute', k: 'class' };
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
        <body data-aremel="2" class="main"></body>
      </html>`)
    );

    const bodyObj = app.root.children.at(1)?.obj as any;
    bodyObj.v = 'other';
    assert.equal(
      normalizeText(doc.firstElementChild?.outerHTML),
      normalizeText(`<html data-aremel="0">
        <head data-aremel="1"></head>
        <body data-aremel="2" class="other"></body>
      </html>`)
    );
  });

});

// =============================================================================
// util
// =============================================================================

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
