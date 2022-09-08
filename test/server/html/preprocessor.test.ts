import { HtmlDocument, HtmlElement } from "../../../src/server/html/htmldom";
import { ELEMENT_NODE, TEXT_NODE } from "../../../src/shared/dom";
import Preprocessor, { domGetTop, PreprocessorError } from "../../../src/server/html/preprocessor";
import { EReg, normalizeText } from "../../../src/shared/util";
import { assert } from "chai";

const preprocessor = new Preprocessor(process.cwd() + '/test/server/html/preprocessor');

describe("preprocessor", () => {

  it("should complain about missing file", async () => {
    var msg = '';
    try {
      await preprocessor.reset().read('inexistent.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'Could not read file "inexistent.html"');
  });

  it("should read the single test001.html UFT-8 file", async () => {
    var doc = await preprocessor.reset().read('test001.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html utf8-value="€"><head></head><body></body></html>');
  });

  // =========================================================================
  // inclusion
  // =========================================================================

  it("should follow test002.html inclusion chain", async () => {
    var doc = await preprocessor.reset().read('test002.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><div>Test 2</div></body></html>');
  });

  it("should include test002includes.html inclusions twice", async () => {
    var doc = await preprocessor.reset().read('test002includes.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><div>Test 2</div><div>Test 2</div></body></html>');
  });

  it("should import test002imports.html inclusions once", async () => {
    var doc = await preprocessor.reset().read('test002imports.html');
    assert.exists(doc);
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><div>Test 2</div></body></html>');
  });

  it("should forbid access to files outside root path", async () => {
    var msg = '';
    try {
      var doc = await preprocessor.reset().read('test003.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'Forbidden file path "../dummy.htm"');
  });

  it("should complain of missing src in includes", async () => {
    var msg = '';
    try {
      var doc = await preprocessor.reset().read('test004.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'test004.html:1 col 8: Missing "src" attribute');
  });

  it("should remove adjacent text nodes", async () => {
    var doc = await preprocessor.reset().read('test005.html');
    assert.isFalse(adjacentTextNodes(doc));
  });

  it("should pass include root attributes to target element", async () => {
    var doc = await preprocessor.reset().read('testIncludedRootAttributesShouldPassToTargetElement.html');
    assert.isFalse(adjacentTextNodes(doc));
    var head = doc ? domGetTop(doc, 'HEAD') : undefined;
    assert.equal(head?.getAttribute(':overriddenAttribute'), '1');
    assert.equal(head?.getAttribute(':attribute1'), 'hi');
    assert.equal(head?.getAttribute(':attribute2'), 'there');
    assert.equal(head?.getAttribute(':attribute3'), '2');
  });

  it("should accept textual includes", async () => {
    var doc = await preprocessor.reset().read('testTextualInclude.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body>This is a &quot;text&quot;</body></html>');
  });

  // =========================================================================
  // macros
  // =========================================================================

  it("should expand an empty macro", async () => {
    var doc = await preprocessor.reset().read('test101.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><div></div></body></html>');
  });

  it("should expand a macro with text", async () => {
    var doc = await preprocessor.reset().read('test102.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><span>[[text]]</span></body></html>');
  });

  it("should follow macro inheritance", async () => {
    var doc = await preprocessor.reset().read('test103.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><span><b>[[text]]</b></span></body></html>');
  });

  it("should add attributes and content to expanded macros", async () => {
    var doc = await preprocessor.reset().read('test104.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(doc?.toString(), '<html><head></head><body><span class="title"><b>[[text]]</b>OK</span></body></html>');
  });

  it("should keep non-overridden macro attributes", async () => {
    var doc = await preprocessor.reset().read('test201.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText('<html>\n'
      + '<head></head><body>\n'
      + '		<div class="pippo">localhost</div>\n'
      + '	</body>\n'
    + '</html>'));
  });

  it("should replace overridden macro attributes", async () => {
    var doc = await preprocessor.reset().read('test202.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText('<html>\n'
      + '<head></head><body>\n'
      + '		<div class="pluto">localhost</div>\n'
      + '	</body>\n'
    + '</html>'));
  });

  it("should let macro define their `default` slot", async () => {
    var doc = await preprocessor.reset().read('test203.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText('<html>\n'
      + '<head></head><body>\n'
      + '		<div class="pippo">\n'
      + '			title: <b>localhost</b>\n'
      + '		</div>\n'
      + '	</body>\n'
    + '</html>'));
  });

  it("should let users nest macros (1)", async () => {
    var doc = await preprocessor.reset().read('test204.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText(`<html>
      <head>
      </head>
      <body>
        <div class=\"kit-page\">
          <div class=\"kit-nav\"></div>
        </div>
      </body>
    </html>`));
  });

  it("should let users nest macros (2)", async () => {
    var doc = await preprocessor.reset().read('testNestedMacros1.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText(`<html>
      <head>
      </head>
      <body>
        <div class=\"kit-page\">
          <div class=\"kit-nav\"><div>[[pageScrollY]] ([[pageScrollDeltaY]])</div></div>
        </div>
      </body>
    </html>`));
  });

  it("should support [[*]] attributes in macros", async () => {
    var doc = await preprocessor.reset().read('testAttributesInMacro.html');
    assert.equal(normalizeText(doc?.toString(false, true)), normalizeText(`<html>
      <head></head><body>
        <div :ok=[[true]]>
          <span :class-ok=[[ok]]></span>
        </div>
      </body>
    </html>`));
  });

  it("should let users extend macros (1)", async () => {
    var doc = await preprocessor.reset().read('testExtendedMacro1.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText(`<html>
      <head>
      </head>
      <body>
        <div class="kit-item">
          <label>
            <input type="radio" />
            Item1
          </label>
          <span class="badge rounded-pill">badge</span>
        </div>

        <div class="kit-item">
          <label>
            <input type="radio" />
            Item2
          </label>
          <span class="badge rounded-pill">badge</span>
        </div>
      </body>
    </html>`));
  });

  it("should limit recursive inclusions", async () => {
    var msg = '';
    try {
      await preprocessor.reset().read('testRecursiveInclude.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'Too many nested includes/imports "testRecursiveInclude.html"');
  });

  it("should limit recursive macros", async () => {
    var msg = '';
    try {
      await preprocessor.reset().read('testRecursiveMacro.html');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'Too many nested macros "DUMMY-TAG"');
  });

  // =========================================================================
  // virtual files
  // =========================================================================

  it("should 'read' virtual files", async () => {
    var prepro = new Preprocessor(preprocessor.rootPath, [{
      fname: 'dummy.html',
      content: '<html><body>Dummy</body></html>'
    }]);
    var doc = await prepro.read('dummy.html');
    assert.isFalse(adjacentTextNodes(doc));
    assert.equal(normalizeText(doc?.toString()), normalizeText(
      `<html><head></head><body>Dummy</body></html>`
    ));
  });

});

// =============================================================================
// util
// =============================================================================

function adjacentTextNodes(doc?:HtmlDocument): boolean {
  var ret = false;
  function f(e:HtmlElement) {
    var prevType = -1;
    for (var n of e.children) {
      if (n.nodeType === TEXT_NODE && n.nodeType === prevType) {
        ret = true;
      }
      if (n.nodeType == ELEMENT_NODE) {
        f(n as HtmlElement);
      }
      if (ret) {
        break;
      }
      prevType = n.nodeType;
    }
  }
  var root = doc?.getFirstElementChild();
  root ? f(root as HtmlElement) : null;
  return ret;
}
