import { assert } from "chai";
import { HtmlDocument } from "../../src/server/htmldom";
import { load } from "../../src/server/lang";

const rootPath = process.cwd() + '/test/server/lang';

describe("lang", () => {

  it("loading", () => {
    const app = {
      html: '<html></html>',
      children: [{
        html: '<head></head>'
      }, {
        html: '<body></body>',
        children: [{
          html: '<div>[[name]]</div>'
        }]
      }]
    };

    const rt = load(app, new HtmlDocument(0));

    assert.equal(
      '<html><head></head><body><div>[[name]]</div></body></html>',
      rt.doc.toString());
  });

  // it("data binding", () => {
  //   const data = {
  //     list: [{
  //       name: '1',
  //       list: [{
  //         name: '1.1',
  //         list: [{
  //           name: '1.1.1'
  //         }]
  //       }]
  //     }]
  //   };

  //   const app = {
  //     html: '<html></html>',
  //     children: [{
  //       html: '<head></head>'
  //     }, {
  //       html: '<body></body>',
  //       children: [{
  //         html: '<div>[[name]]</div>',
  //         data: data.list
  //       }]
  //     }]
  //   };

  //   const rt = load(app, new HtmlDocument(0));

  //   assert.equal(
  //     '<html><head></head><body><div>[[name]]</div></body></html>',
  //     rt.doc.toString());
  // });

});
