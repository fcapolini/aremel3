import fs, { promises as fsPromises } from "fs"; // node >= 10.1
// import fsPromises from "fs/promises"; // node >= 14
import { program } from 'commander';
import Server, { ServerProps } from "./server/server";

program
  .argument('<docroot>', 'document root path name')
  .option('-p, --port', 'port number', '3000')
  .option('-s, --assumeHTTPS', 'assume HTTPS')
  .option('-x, --trustProxy', 'trust proxy')
  .option('-m, --muteLogging', 'mute logging')
  .action(async (docroot, options) => {
    let stat: fs.Stats | undefined;
    try { stat = await fsPromises.stat(docroot); } catch (ignored) {}
    if (!stat?.isDirectory()) {
      console.error('invalid docroot "' + docroot + '"');
      return;
    }
    const props: ServerProps = {}
    options.port && (props.port = parseInt(options.port));
    options.assumeHTTPS && (props.assumeHttps = true);
    options.trustProxy && (props.trustProxy = true);
    options.muteLogging && (props.mute = true);
    const port = await new Server(docroot).startServer(props);
    console.log('http://localhost:' + port + '/');
  })
  .parse();
