
export type ScopeProps = {
  html: string,
  attr?: { [key: string]: any },
  cb?: (p: Scope) => void,
}

export class Scope {
  document: Document;
  parent: Scope | null;
  props: ScopeProps;

  constructor(parent: Scope | Document, props: ScopeProps) {
    if (parent instanceof Scope) {
      this.document = parent.document;
      this.parent = parent;
    } else {
      this.document = parent;
      this.parent = null;
    }
    this.props = props;
  }
}
