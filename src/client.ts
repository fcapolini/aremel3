import Client from "./client/client";
import * as rt from "./shared/runtime";

(window as any)[rt.APP_GLOBAL] = new Client(window);
