import { generate } from "escodegen";
import { compileApp } from "../compiler/compiler";
import { load } from "../compiler/loader";
import * as rt from "../shared/runtime";
import { DomDocument } from "../shared/dom";
import { HtmlDocument } from "../compiler/htmldom";
import Preprocessor from "../compiler/preprocessor";

export default class Delivery {
  rootpath: string;

  constructor(rootpath: string) {
    this.rootpath = rootpath;
  }

  async fromSource(fname: string, sort = false): Promise<string> {
    const pre = new Preprocessor(this.rootpath);
    const app = await load(fname, pre);
    return new Promise<string>((resolve, reject) => {
      try {
        const doc = app.doc as DomDocument;
        const ast = compileApp(app);
        const src = generate(ast);
        const obj = eval(`(${src})`);
        const run = new rt.App(doc, obj);
        run.refresh();
        const script = doc.createElement('script');
        const text = doc.createTextNode(`
          window['${rt.STATE_GLOBAL}'] = ${src};
        `);
        script.appendChild(text);
        doc.body?.appendChild(script);
        doc.body?.appendChild(doc.createTextNode('\n'));
        const out = (doc as HtmlDocument).toString(sort);
        resolve(out);
      } catch (ex: any) {
        reject(ex);
      }      
    });
  }

}
