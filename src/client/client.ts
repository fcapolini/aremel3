import { DomDocument } from "../shared/dom";
import * as rt from "../shared/runtime";

export default class Client {
  app: rt.App;

  constructor(window: any) {
    const document = window.document;
    const state = window[rt.STATE_GLOBAL];
    this.app = new rt.App(document as DomDocument, state);
    this.app.refresh();
  }

}
