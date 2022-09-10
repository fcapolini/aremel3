import * as ESTree from "estree";
import { generate } from "escodegen";
import { HtmlDocument } from "./htmldom";

export class Compiler {

  constructor(doc: HtmlDocument) {
    this.docroot = docroot;
  }

  compile(doc: HtmlDocument, err?: CompilerError[]): string {
    const ret: ESTree.Program = {
      type: 'Program',
      sourceType: 'script',
      body: [],
    }
    return generate(ret);
  }

  // ===========================================================================
  // private
  // ===========================================================================

  _compileBody(doc:)

}

export interface CompilerError {
  type: 'error' | 'warning';
}
