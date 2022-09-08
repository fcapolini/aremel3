
/**
 * Aremel compiler turns augmented HTML pages into JavaScript
 * code for the server and the client.
 */
export class Compiler {
  docroot: string;

  constructor(docroot: string) {
    this.docroot = docroot;
  }

  compile(fname: string): CompilerError[] | null {
    return null;
  }

}

export interface CompilerError {
  type: 'error' | 'warning';
}
