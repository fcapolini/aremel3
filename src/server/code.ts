import * as es from "estree";

export function makeFunction(script: es.Program): es.FunctionExpression {
  return {
    type: 'FunctionExpression',
    params: [],
    body: {
      type: 'BlockStatement',
      body: makeFunctionBody(script.body as es.Statement[])
    }
  }
}

function makeFunctionBody(statements: es.Statement[]): es.Statement[] {
  const len = statements.length;
  for (let i = 0; i < len; i++) {
    const node: any = statements[i];
    if (node.type === 'ExpressionStatement' && node.directive) {
      delete node.directive;
    }
    if (i === (len - 1) && node.type === 'ExpressionStatement') {
      statements[i] = {
        type: 'ReturnStatement',
        argument: node.expression
      }
    }
  }
  return statements;
}
