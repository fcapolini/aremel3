import { generate } from "escodegen";
import { compileApp } from "../compiler/compiler";
import { load } from "../compiler/loader";
import * as rt from "../shared/runtime";
import * as k from "../shared/const";
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
    //FIXME: check app.errors
    return new Promise<string>((resolve, reject) => {
      try {
        const doc = app.doc as DomDocument;
        const ast = compileApp(app);
        const src = generate(ast);
        const obj = eval(`(${src})`);
        const run = new rt.App(doc, obj);
        run.refresh();
        const script1 = doc.createElement('script');
        const text = doc.createTextNode(`
          window['${rt.STATE_GLOBAL}'] = ${src};
        `);
        script1.appendChild(text);
        doc.body?.appendChild(script1);
        doc.body?.appendChild(doc.createTextNode('\n'));
        const script2 = doc.createElement('script');
        script2.setAttribute('async', '');
        script2.setAttribute('src', k.AREMEL_CLIENT_JS);
        doc.body?.appendChild(script2);
        doc.body?.appendChild(doc.createTextNode('\n'));
        const out = (doc as HtmlDocument).toString(sort);
        resolve(out);
      } catch (ex: any) {
        reject(ex);
      }      
    });
  }

}
