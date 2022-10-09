import { assert } from "chai";
import { generate } from "escodegen";
import { compileApp } from "../../src/server/compiler";
import { load } from "../../src/server/loader";
import Preprocessor from "../../src/server/preprocessor";
import { normalizeSpace } from "../../src/shared/util";

const ROOTPATH = process.cwd() + '/test/server/compiler';

describe("compiler", () => {

  it(`base app`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: `<!DOCTYPE html>
        <html>
          <head></head>
          <body></body>
        </html>`
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`{
      root: {
        id: 0, aka: 'page', values: {}, children: [
          { id: 1, aka: 'head', values: {} },
          { id: 2, aka: 'body', values: {} }
        ]
      }
    }`));
  });

  it(`HTML parsing error position`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: 
        '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head>\n' +
        '<body></body>\n' +
        '</html>\n'
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    assert.equal(app.errors.length, 1);
    const err = app.errors[0];
    assert.deepEqual(err, {
      type: 'err',
      msg: 'Found </HTML> instead of </HEAD>',
      pos: { fname: 'index.html', line1: 5, line2: 5, column1: 3, column2: 3 }
    })
  });

  it(`value parsing error position w/ LF`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: 
        '<!DOCTYPE html>\n' +
        '<html :v=[[\n' +
        "' * 2 ]]>\n" +
        '<head></head>\n' +
        '<body></body>\n' +
        '</html>\n'
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    assert.equal(app.errors.length, 1);
    assert.deepEqual(app.errors[0], {
      type: 'err',
      msg: 'expression parsing: Unexpected token ILLEGAL',
      pos: { fname: '/index.html', line1: 3, line2: 3, column1: 1, column2: 1 }
    })
  });

  it(`value parsing error position w/ CRLF`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: 
        '<!DOCTYPE html>\r\n' +
        '<html :v=[[\r\n' +
        "' * 2 ]]>\r\n" +
        '<head></head>\r\n' +
        '<body></body>\r\n' +
        '</html>\r\n'
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    assert.equal(app.errors.length, 1);
    assert.deepEqual(app.errors[0], {
      type: 'err',
      msg: 'expression parsing: Unexpected token ILLEGAL',
      pos: { fname: '/index.html', line1: 3, line2: 3, column1: 1, column2: 1 }
    })
  });

  it(`value parsing error position w/ include`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: 
        '<!DOCTYPE html>\n' +
        '<html>\n' +
        '<head></head>\n' +
        '<body>' +
        '<:include src="inc/lib.htm"/>\n' +
        '</body>\n' +
        '</html>\n'
    }, {
      fname: 'inc/lib.htm',
      content:
      '<lib :v=[[\n' +
      "' * 2 ]]>\n" +
      `</lib>`
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    assert.equal(app.errors.length, 1);
    const err = app.errors[0];
    assert.deepEqual(err, {
      type: 'err',
      msg: 'expression parsing: Unexpected token ILLEGAL',
      pos: { fname: '/inc/lib.htm', line1: 2, line2: 2, column1: 1, column2: 1 }
    })
  });

  it(`root static value`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: `<html :msg="hi"></html>`
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`{
      root: {
        id: 0, aka: 'page', values: {
          msg: { v: 'hi' }
        }, children: [
          { id: 1, aka: 'head', values: {} },
          { id: 2, aka: 'body', values: {} }
        ]
      }
    }`));
  });

  it(`root dynamic value (expression)`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: `<html :msg=[['hi']]></html>`
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`{
      root: {
        id: 0, aka: 'page', values: {
          msg: { fn: function () { return 'hi'; } }
        }, children: [
          { id: 1, aka: 'head', values: {} },
          { id: 2, aka: 'body', values: {} }
        ]
      }
    }`));
  });

  it(`root dynamic value (statement)`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: `<html :msg=[[console.log('hi')]]></html>`
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`{
      root: {
        id: 0, aka: 'page', values: {
          msg: { fn: function () { return console.log('hi'); } }
        }, children: [
          { id: 1, aka: 'head', values: {} },
          { id: 2, aka: 'body', values: {} }
        ]
      }
    }`));
  });

  it(`root dynamic value (block 1)`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: `<html :msg=[['hi'; console.log('hi')]]></html>`
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`{
      root: {
        id: 0, aka: 'page', values: {
          msg: { fn: function () { 'hi'; return console.log('hi'); } }
        }, children: [
          { id: 1, aka: 'head', values: {} },
          { id: 2, aka: 'body', values: {} }
        ]
      }
    }`));
  });

  it(`root dynamic value (block 2)`, async () => {
    var pre = new Preprocessor(ROOTPATH, [{
      fname: 'index.html',
      content: `<html :msg=[[console.log('hi'); 'hi']]></html>`
    }]);
    const app = await load('index.html', pre);
    const ast = compileApp(app);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`{
      root: {
        id: 0, aka: 'page', values: {
          msg: { fn: function () { console.log('hi'); return 'hi'; } }
        }, children: [
          { id: 1, aka: 'head', values: {} },
          { id: 2, aka: 'body', values: {} }
        ]
      }
    }`));
  });

});
