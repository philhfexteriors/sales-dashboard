/**
 * Safe expression evaluator for bid template quantity formulas.
 * No eval() — uses a recursive descent parser.
 *
 * Supported: +, -, *, /, parentheses, ROUNDUP(expr), SUM(expr, ...), numeric literals, variable names.
 * Returns 0 on errors (no throw).
 */

export interface FormulaContext {
  [variable: string]: number
}

// ---------- Tokenizer ----------

type TokenType = 'number' | 'variable' | 'operator' | 'lparen' | 'rparen' | 'comma' | 'function'

interface Token {
  type: TokenType
  value: string | number
}

const FUNCTIONS = new Set(['ROUNDUP', 'SUM', 'roundup', 'sum'])

function tokenize(formula: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < formula.length) {
    const ch = formula[i]

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++
      continue
    }

    // Number (integer or decimal)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < formula.length && /\d/.test(formula[i + 1]))) {
      let num = ''
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
        num += formula[i++]
      }
      tokens.push({ type: 'number', value: parseFloat(num) })
      continue
    }

    // Identifier (variable or function name)
    if (/[a-zA-Z_]/.test(ch)) {
      let name = ''
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        name += formula[i++]
      }
      if (FUNCTIONS.has(name)) {
        tokens.push({ type: 'function', value: name.toUpperCase() })
      } else {
        tokens.push({ type: 'variable', value: name })
      }
      continue
    }

    // Operators
    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch })
      i++
      continue
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' })
      i++
      continue
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ')' })
      i++
      continue
    }

    if (ch === ',') {
      tokens.push({ type: 'comma', value: ',' })
      i++
      continue
    }

    // Unknown character — skip
    i++
  }

  return tokens
}

// ---------- Parser (recursive descent) ----------

type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode }
  | { type: 'call'; name: string; args: ASTNode[] }

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private consume(): Token {
    return this.tokens[this.pos++]
  }

  private expect(type: TokenType): Token {
    const tok = this.consume()
    if (!tok || tok.type !== type) {
      throw new Error(`Expected ${type}`)
    }
    return tok
  }

  // expression = term (('+' | '-') term)*
  parseExpression(): ASTNode {
    let left = this.parseTerm()

    while (this.peek()?.type === 'operator' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value as string
      const right = this.parseTerm()
      left = { type: 'binary', op, left, right }
    }

    return left
  }

  // term = unary (('*' | '/') unary)*
  private parseTerm(): ASTNode {
    let left = this.parseUnary()

    while (this.peek()?.type === 'operator' && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
      const op = this.consume().value as string
      const right = this.parseUnary()
      left = { type: 'binary', op, left, right }
    }

    return left
  }

  // unary = ('-' unary) | primary
  private parseUnary(): ASTNode {
    if (this.peek()?.type === 'operator' && this.peek()!.value === '-') {
      this.consume()
      const operand = this.parseUnary()
      return { type: 'unary', op: '-', operand }
    }
    return this.parsePrimary()
  }

  // primary = number | variable | function_call | '(' expression ')'
  private parsePrimary(): ASTNode {
    const tok = this.peek()
    if (!tok) throw new Error('Unexpected end of expression')

    // Number
    if (tok.type === 'number') {
      this.consume()
      return { type: 'number', value: tok.value as number }
    }

    // Function call
    if (tok.type === 'function') {
      const name = this.consume().value as string
      this.expect('lparen')
      const args: ASTNode[] = []
      if (this.peek()?.type !== 'rparen') {
        args.push(this.parseExpression())
        while (this.peek()?.type === 'comma') {
          this.consume()
          args.push(this.parseExpression())
        }
      }
      this.expect('rparen')
      return { type: 'call', name, args }
    }

    // Variable
    if (tok.type === 'variable') {
      this.consume()
      return { type: 'variable', name: tok.value as string }
    }

    // Grouped expression
    if (tok.type === 'lparen') {
      this.consume()
      const expr = this.parseExpression()
      this.expect('rparen')
      return expr
    }

    throw new Error(`Unexpected token: ${tok.type}`)
  }
}

// ---------- Evaluator ----------

function evaluate(node: ASTNode, context: FormulaContext): number {
  switch (node.type) {
    case 'number':
      return node.value

    case 'variable':
      return context[node.name] ?? 0

    case 'binary': {
      const left = evaluate(node.left, context)
      const right = evaluate(node.right, context)
      switch (node.op) {
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/': return right !== 0 ? left / right : 0
        default: return 0
      }
    }

    case 'unary':
      return -evaluate(node.operand, context)

    case 'call': {
      const args = node.args.map(a => evaluate(a, context))
      switch (node.name) {
        case 'ROUNDUP':
          return Math.ceil(args[0] ?? 0)
        case 'SUM':
          return args.reduce((sum, v) => sum + v, 0)
        default:
          return 0
      }
    }

    default:
      return 0
  }
}

// ---------- Public API ----------

export function evaluateFormula(formula: string, context: FormulaContext): number {
  try {
    const tokens = tokenize(formula)
    if (tokens.length === 0) return 0
    const parser = new Parser(tokens)
    const ast = parser.parseExpression()
    return evaluate(ast, context)
  } catch {
    console.warn(`Formula evaluation failed: "${formula}"`)
    return 0
  }
}
