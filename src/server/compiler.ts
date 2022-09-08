import { StringBuf } from "../shared/util";
import { HtmlDocument } from "./htmldom";

export class Compiler {

  static compile(doc: HtmlDocument, err?: CompilerError[]): string {
    return '';
  }

}

export interface CompilerError {
  type: 'error' | 'warning';
}
