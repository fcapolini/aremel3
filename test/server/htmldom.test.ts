import { assert } from "chai";
import HtmlParser from "../../src/server/htmlparser";
import { normalizeText } from "../../src/shared/util";

describe('htmldom', () => {

  it('clone', () => {
    const doc = HtmlParser.parse(`<html>
      <body>
        <section id="text">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>
      </body>
    </html>`);
    const html = doc.firstElementChild;
    const body = html?.firstElementChild;
    const orig = body?.firstElementChild;
    const copy = orig?.cloneNode(false);
    copy && body?.appendChild(copy);
    body?.appendChild(doc.createTextNode('\n'));
    orig?.setAttribute('id', 'origText');
    assert.equal(
      normalizeText(body?.outerHTML),
      normalizeText(`<body>
        <section id="origText">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>

        <section id="text"></section>
      </body>`)
    );
  });

  it('deep clone', () => {
    const doc = HtmlParser.parse(`<html>
      <body>
        <section id="text">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>
      </body>
    </html>`);
    const html = doc.firstElementChild;
    const body = html?.firstElementChild;
    const orig = body?.firstElementChild;
    const copy = orig?.cloneNode(true);
    copy && body?.appendChild(copy);
    body?.appendChild(doc.createTextNode('\n'));
    orig?.setAttribute('id', 'origText');
    assert.equal(
      normalizeText(body?.outerHTML),
      normalizeText(`<body>
        <section id="origText">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>

        <section id="text">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>
      </body>`)
    );
  });

});
