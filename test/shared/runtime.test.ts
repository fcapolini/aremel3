import { assert } from "chai";
import HtmlParser from "../../src/server/htmlparser";
import { DomDocument } from "../../src/shared/dom";
import * as rt from "../../src/shared/runtime";

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
      id: '0', aka: 'page', props: {},
      children: [{
        id: '1', aka: 'head', props: {}
      }, {
        id: '2', aka: 'body', props: {}
      }]
    }
  };
}
