import { DomDocument } from "./shared/dom";
import * as rt from "./shared/runtime";

(function() {
    const state: rt.AppState = (window as any)[rt.STATE_GLOBAL];
    const app = new rt.App(window.document as unknown as DomDocument, state);
    app.refresh();
    (window as any)[rt.APP_GLOBAL] = app;
})();
