// https://swc.rs/docs/usage/bundling#multiple-entries-support

const { config } = require("@swc/core/spack");

module.exports = config({
  entry: {
    client: __dirname + "/src/client.ts",
  },
  output: {
    path: __dirname + "/build/client",
  },
  module: {},
});
