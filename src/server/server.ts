import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import fs from "fs";
import * as http from 'http';
import path from "path";
import Delivery from "./delivery";

export interface ServerProps {
  port?: number
  assumeHttps?: boolean
  trustProxy?: boolean
  pageLimit?: TrafficLimit
  sortHtml?: boolean
}

export interface TrafficLimit {
  windowMs: number
	maxRequests: number
}

export default class Server {
  rootpath: string;
  delivery: Delivery;
	server?: http.Server;

  constructor(rootpath: string) {
    this.rootpath = rootpath;
    this.delivery = new Delivery(rootpath);
  }

  async startServer(
    props?: ServerProps,
    init?: (app: Application, props?: ServerProps) => void
  ): Promise<number> {
    const that = this;
		const app = express();

    // init
		app.use(express.json());
		app.use(express.urlencoded({ extended: true }));
    // see https://expressjs.com/en/guide/behind-proxies.html
    props?.trustProxy && app.set('trust proxy', 1);
    props?.pageLimit && this.setLimiter(props.pageLimit, ['*', '*.html'], app);
    // initialize app-specific web services
    init && init(app, props);

    // redirections
    // externally redirect requests for directories to <dir>/index
		// internally redirect requests to files w/o suffix to <file>.html
		app.get("*", (req, res, next) => {
			// this.log(props, 'info', `${this.getTimestamp()}: GET ${req.url}`);
			if (/^[^\.]+$/.test(req.url)) {
				var base = `http://${req.headers.host}`;
				var url = new URL(req.url, base);
				var pathname = path.join(this.rootpath, url.pathname);
				if (fs.existsSync(pathname) && fs.statSync(pathname)?.isDirectory()) {
					if (url.pathname.endsWith('/')) {
						req.url = path.join(req.url, 'index.html');
						next('route');
					} else {
						res.redirect(req.url + '/index');
					}
				} else {
					req.url = req.url + '.html';
					next('route');
				}
			} else {
				next('route');
			}
		});

		// serve pages
		app.get('*.html', (req, res) => {
			var base = `http://${req.headers.host}`;
			var url = new URL(req.url, base);
			url.protocol = (props?.assumeHttps ? 'https' : req.protocol);
			url.hostname = req.hostname;
      that.getPage(url, props).then(html => {
				res.header("Content-Type",'text/html');
				res.send(html);
      }).catch(err => {
        console.error(err);//tempdebug
				res.header("Content-Type",'text/html');
				res.send(`<html><body><p>${err}</p><body></html>`);
				// this.log(props, 'error', `${this.getTimestamp()}: `
				// 	+ `ERROR ${url.toString()}: ${err}`);
      });
		});

    // serve static content
		app.use(express.static(this.rootpath));

    return new Promise<number>((resolve, reject) => {
      const cb = () => {
        const res = this.server?.address();
        (res as any)?.port ? resolve((res as any).port) : reject(res);
      }
      this.server = props?.port ? app.listen(props.port, cb) : app.listen(cb);
    });
  }

  stopServer(cb?: (err: any) => void) {
    this.server?.close(cb);
    this.server = undefined;
  }

  setLimiter(props:TrafficLimit, paths:Array<string>, app:Application) {
		const limiter = rateLimit({
			windowMs: props.windowMs,
			max: props.maxRequests,
			standardHeaders: true,
			legacyHeaders: false,
		});
		for (var path of paths) {
			app.use(path, limiter);
		}
	}

  async getPage(url: URL, props?: ServerProps): Promise<string> {
    //FIXME: fname from url
    return this.delivery.fromSource('index.html');
  }
}
