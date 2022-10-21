import fs from "fs";
import { assert } from "chai";
import { HtmlDocument, HtmlElement } from '../../src/compiler/htmldom';
import { COMMENT_NODE, ELEMENT_NODE, TEXT_NODE } from "../../src/shared/dom";
import HtmlParser, { HtmlException } from "../../src/compiler/htmlparser";

const rootPath = process.cwd() + '/test/compiler/htmlparser';

function countNodes(doc:HtmlDocument): any {
  var ret = {elements: 0, texts:0, comments:0}
  function f(p:HtmlElement) {
    for (var i in p.children) {
      var n = p.children[i];
      if (n.nodeType == ELEMENT_NODE) {
        ret.elements++;
        f(n as HtmlElement);
      } else if (n.nodeType == TEXT_NODE) {
        ret.texts++;
      } else if (n.nodeType == COMMENT_NODE) {
        ret.comments++;
      }
    }
  }
  f(doc);
  return ret;
}

describe("htmlparser", () => {

  it("should parse <html></html>", () => {
    var doc = HtmlParser.parse('<html></html>');
    assert.exists(doc);
    assert.equal(doc.tagName, '#DOCUMENT');
    assert.equal(doc.attributes.size, 0);
    assert.equal(doc.children.length, 1);
    assert.equal(doc.children[0].nodeType, ELEMENT_NODE);
    var e = doc.children[0] as HtmlElement;
    assert.equal(e.tagName, 'HTML');
    assert.equal(e.attributes.size, 0);
    assert.equal(e.children.length, 0);
    assert.equal(doc.toString(), '<html></html>');
  });

  it("should parse <html lang=\"en\"></html>", () => {
    var doc = HtmlParser.parse('<html lang="en"></html>');
    assert.exists(doc);
    assert.equal(doc.tagName, '#DOCUMENT');
    assert.equal(doc.attributes.size, 0);
    assert.equal(doc.children.length, 1);
    assert.equal(doc.children[0].nodeType, ELEMENT_NODE);
    var e = doc.children[0] as HtmlElement;
    assert.equal(e.tagName, 'HTML');
    assert.equal(e.attributes.size, 1);
    assert.equal(e.getAttribute('lang'), 'en');
    assert.equal(e.children.length, 0);
    assert.equal(doc.toString(), '<html lang="en"></html>');
  });

  it("should parse a simple page", () => {
    var html = '<html>\n'
        + '<head>\n'
        + '<title>\n'
        + 'A Simple HTML Document\n'
        + '</title>\n'
        + '</head>\n'
        + '<body>\n'
        + '<p>This is a very simple HTML document</p>\n'
        + '<p>It only has two paragraphs</p>\n'
        + '</body>\n'
        + '</html>';
    var doc = HtmlParser.parse(html);
    assert.exists(doc);
    assert.equal(doc.toString(), html);
  });

  it("should parse <html :lang=\"en\"></html>", () => {
    var doc = HtmlParser.parse('<html :lang="en"></html>');
    assert.exists(doc);
    assert.equal(doc.tagName, '#DOCUMENT');
    assert.equal(doc.attributes.size, 0);
    assert.equal(doc.children.length, 1);
    assert.equal(doc.children[0].nodeType, ELEMENT_NODE);
    var e = doc.children[0] as HtmlElement;
    assert.equal(e.tagName, 'HTML');
    assert.equal(e.attributes.size, 1);
    assert.equal(e.getAttribute(':lang'), 'en');
    assert.equal(e.children.length, 0);
    assert.equal(doc.toString(), '<html :lang="en"></html>');
  });

  it("should parse <html><:mytag/></html>", () => {
    var doc = HtmlParser.parse('<html><:mytag/></html>');
    assert.equal(doc.toString(), '<html><:mytag></:mytag></html>');
  });

  it("should parse <html title=[[a[0]]]></html>", () => {
    var doc = HtmlParser.parse('<html title=[[a[0]]]></html>');
    assert.equal(doc.toString(), '<html title="a[0]"></html>');
  });

  it("should complain about <html></div>", () => {
    var msg = '';
    try {
      HtmlParser.parse('<html></div>');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'literal:1 col 9: Found </DIV> instead of </HTML>');
  });

  it("should complain about <html>", () => {
    var msg = '';
    try {
      HtmlParser.parse('<html>');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'literal:1 col 7: expected </HTML>');
  });

  it("should accept empty attribute", () => {
    var doc = HtmlParser.parse('<html lang></html>');
    assert.exists(doc);
    assert.equal(doc.firstElementChild?.getAttribute('lang'), '');
  });

  it("should complain about unclosed tag", () => {
    var msg = '';
    try {
      var doc = HtmlParser.parse('<html>\n'
        + '	<body>\n'
        + '</html>');
    } catch (ex:any) {
      msg = `${ex}`;
    }
    assert.equal(msg, 'literal:3 col 3: Found </HTML> instead of </BODY>');
  });

  it("should accept literal array in [[...]] attribute", () => {
    var doc = HtmlParser.parse(
      '<div :data=[[ [{list:[1,2]},{list:[\'a\',\'b\']}] ]]></div>'
    );
    var root = doc.getFirstElementChild();
    var v1 = root?.getAttribute(':data');
    var v2 = ' [{list:[1,2]},{list:[\'a\',\'b\']}] ';
    assert.equal(v1, v2);
  });

  it("should accept multiline \"...\" attributes", () => {
    var doc = HtmlParser.parse('<div :data="[[ [\n'
        + '	{list:[1,2]},\n'
        + '	{list:[\'a\',\'b\']}\n'
        + '] ]]"></div>');
    var root = doc.getFirstElementChild() as HtmlElement;
    assert.equal(root?.attributes.get(':data')?.quote, '"');
    var v1 = root?.getAttribute(':data');
    var v2 = '[[ [\n'
        + '	{list:[1,2]},\n'
        + '	{list:[\'a\',\'b\']}\n'
        + '] ]]';
    assert.equal(v1, v2);
  });

  it("should accept multiline [[...]] attributes", () => {
    var doc = HtmlParser.parse('<div :data=[[ [\n'
        + '	{list:[1,2]},\n'
        + '	{list:[\'a\',\'b\']}\n'
        + '] ]]></div>');
    var root = doc.getFirstElementChild() as HtmlElement;
    assert.equal(root?.attributes.get(':data')?.quote, '[');
    var v1 = root?.getAttribute(':data');
    var v2 = ' [\n'
        + '	{list:[1,2]},\n'
        + '	{list:[\'a\',\'b\']}\n'
        + '] ';
    assert.equal(v1, v2);
  });

  it("should parse a big file", () => {
    var text = fs.readFileSync(rootPath + '/google.txt', {encoding: 'utf8'});
    var doc = HtmlParser.parse(text);
    assert.exists(doc);
    var counts = countNodes(doc);
    assert.equal(counts.elements, 148);
    assert.equal(counts.texts, 267);
    assert.equal(counts.comments, 0);
  });

  it("should parse html5-test-page.html", () => {
    var text = fs.readFileSync(rootPath + '/html5-test-page.txt', {encoding: 'utf8'});
    var doc = HtmlParser.parse(text);
    assert.exists(doc);
    var counts = countNodes(doc);
    assert.equal(counts.elements, 581);
    assert.equal(counts.texts, 831);
    assert.equal(counts.comments, 2);
  });

  it("shouldn't escape ampersands in attributes", () => {
    var doc = HtmlParser.parse('<html v="&lt;tag>"></html>');
    var root = doc.getFirstElementChild();
    assert.equal(root?.getAttribute('v'), '&lt;tag>');
    assert.equal(doc.toString(), '<html v="&lt;tag&gt;"></html>');
  });

  it("should accept '<' in attributes", () => {
    var doc = HtmlParser.parse('<html v="<tag>"></html>');
    var root = doc.getFirstElementChild();
    assert.equal(root?.getAttribute('v'), '<tag>');
    assert.equal(doc.toString(), '<html v="&lt;tag&gt;"></html>');
  });

  it("should provide attribute names", () => {
    var doc = HtmlParser.parse('<html c="3" a="1" b="2"/>');
    var root = doc.getFirstElementChild() as HtmlElement;
    var keys1 = root?.getAttributeNames();
    assert.equal(keys1?.length, 3);
    var keys2 = root?.getAttributeNames(true).join();
    assert.equal(keys1?.length, 3);
    assert.equal(keys2, ['a', 'b', 'c'].join());
  });

  it("should handle both the `class` attribute and the `classList` object", () => {
    var doc = HtmlParser.parse('<html class="aaa bbb"></html>');
    var root = doc.firstElementChild;
    root?.classList.add('ccc');
    assert.equal(doc.toString(), '<html class="aaa bbb ccc"></html>');
  });

  it("should handle both the `style` attribute and `style` object", () => {
    var doc = HtmlParser.parse('<html style="display:block"></html>');
    assert.equal(doc.toString(), '<html style="display:block;"></html>');
    var root = doc.firstElementChild;
    root?.style.setProperty('color', 'red');
    assert.equal(doc.toString(), '<html style="display:block;color:red;"></html>');
  });

  it("should remove <!--- comments", () => {
    var doc = HtmlParser.parse('<html><!-- a comment --></html>');
    assert.equal(doc.toString(), '<html><!-- a comment --></html>');
    var doc = HtmlParser.parse('<html><!--- a comment --></html>');
    assert.equal(doc.toString(), '<html></html>');
    var doc = HtmlParser.parse('<html><!-- a comment with a <tag> --></html>');
    assert.equal(doc.toString(), '<html><!-- a comment with a <tag> --></html>');
    var doc = HtmlParser.parse('<html><!--- a comment with a <tag> --></html>');
    assert.equal(doc.toString(), '<html></html>');
  });

  //TODO test innertHTML getter & setter
  //TODO test innerText setter
  //TODO test comments
});
