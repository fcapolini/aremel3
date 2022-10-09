import { assert } from "chai";
import { generate } from "escodegen";
import { parseScript } from "esprima";
import { makeFunction } from "../../src/server/code";
import { normalizeSpace } from "../../src/shared/util";

describe("code", () => {

  it(`empty script`, () => {
    const ast = makeFunction(parseScript(''));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
    }`));
  });

  it(`empty statement`, () => {
    const ast = makeFunction(parseScript(';'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      ;
    }`));
  });

  it(`value reference`, () => {
    const ast = makeFunction(parseScript(`x + 1`));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      return this.x + 1;
    }`));
  });

  it(`local var reference 1`, () => {
    const ast = makeFunction(parseScript(`var x; x + 1`));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x; return x + 1;
    }`));
  });

  it(`local var reference 2`, () => {
    const ast = makeFunction(parseScript(`var x = 0; x + 1`));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x = 0; return x + 1;
    }`));
  });

  it(`local var reference 3`, () => {
    const ast = makeFunction(parseScript(`var x = 0, y; x + y + 1`));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x = 0, y; return x + y + 1;
    }`));
  });

  it(`local var reference 4`, () => {
    const ast = makeFunction(parseScript(`
      var x = 0, y = 1;
      { var z; }
      x + y + z + 1;
    `));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x = 0, y = 1; { var z; } return x + y + z + 1;
    }`));
  });

  it(`local let/const reference 1`, () => {
    const ast = makeFunction(parseScript(`let x; x + 1`));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x; return x + 1;
    }`));
  });

  it(`local let/const reference 2`, () => {
    const ast = makeFunction(parseScript(`let x = 0; x + 1`));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0; return x + 1;
    }`));
  });

  it(`local let/const reference 3`, () => {
    const ast = makeFunction(parseScript(`let x = 0, y; x + y + 1`));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y; return x + y + 1;
    }`));
  });

  it(`local let/const reference 4`, () => {
    const ast = makeFunction(parseScript(`
      let x = 0, y = 1;
      { let z; }
      x + y + z + 1;
    `));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y = 1; { let z; } return x + y + this.z + 1;
    }`));
  });

  it(`local let/const reference 5`, () => {
    const ast = makeFunction(parseScript(`
      let x = 0, y = 1;
      if (true) { let z = 1; }
      x + y + z + 1;
    `));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y = 1; if (true) { let z = 1; } return x + y + this.z + 1;
    }`));
  });

  it(`local let/const reference 6`, () => {
    const ast = makeFunction(parseScript(`
      let x = 0, y = 1;
      for (let z = 0; z < 10; z++) console.log(z);
      x + y + z + 1;
    `));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y = 1;
      for (let z = 0; z < 10; z++) console.log(z);
      return x + y + this.z + 1;
    }`));
  });

  it(`local function 1`, () => {
    const ast = makeFunction(parseScript(`
      let x = 2;
      function f1(a1) {
        return a1 + x + y;
      }
      f1(1) + f2() + x + y;
    `));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 2;
      function f1(a1) {
        return a1 + x + this.y;
      }
      return f1(1) + this.f2() + x + this.y;
    }`));
  });

});
