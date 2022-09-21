import { assert } from "chai";
import { JSDOM } from "jsdom";
import { Scope } from "../../src/shared/lang";

describe('Lang', function () {

  it("should load minimal page", () => {
    const dom = new JSDOM();
    const doc = dom.window.document.getRootNode() as Document;
    const page = new Scope(doc, {
      html: '<html></html>'
    });
    const html = doc.firstElementChild?.outerHTML;
    assert.equal(html, '<html><head></head><body></body></html>');
  });

});
