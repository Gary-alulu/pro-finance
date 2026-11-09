// lib/calculator/arithmetic.js
// Safe, deterministic arithmetic expression evaluator using Decimal.js.
// Strictly avoids eval() or Function constructors.
// Supports: +, -, *, /, %, unary negation (±), parentheses, and decimal precision.

import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const ZERO = new Decimal(0);

/**
 * Tokenize an arithmetic expression string into numbers, operators, and parentheses.
 * Handles negative numbers and unary minus properly.
 */
export function tokenize(expr) {
  if (typeof expr !== "string") return [];
  const clean = expr.replace(/\s+/g, "").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const tokens = [];
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];

    // Numbers (including decimal point)
    if (/[0-9]/.test(char) || (char === "." && i + 1 < clean.length && /[0-9]/.test(clean[i + 1]))) {
      let numStr = "";
      while (i < clean.length && (/[0-9]/.test(clean[i]) || clean[i] === ".")) {
        numStr += clean[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: numStr });
      continue;
    }

    // Unary minus (negative number) check:
    // It's unary minus if at start of expression or preceded by an operator or open parenthesis
    if (char === "-") {
      const prev = tokens[tokens.length - 1];
      const isUnary = !prev || prev.type === "OPERATOR" || (prev.type === "PAREN" && prev.value === "(");
      if (isUnary) {
        // Lookahead to see if immediately followed by number or dot
        if (i + 1 < clean.length && (/[0-9]/.test(clean[i + 1]) || clean[i + 1] === ".")) {
          let numStr = "-";
          i++;
          while (i < clean.length && (/[0-9]/.test(clean[i]) || clean[i] === ".")) {
            numStr += clean[i];
            i++;
          }
          tokens.push({ type: "NUMBER", value: numStr });
          continue;
        } else if (i + 1 < clean.length && clean[i + 1] === "(") {
          // e.g. -(2+3) -> replace with -1 * (2+3)
          tokens.push({ type: "NUMBER", value: "-1" });
          tokens.push({ type: "OPERATOR", value: "*" });
          i++;
          continue;
        }
      }
    }

    // Binary operators
    if (["+", "-", "*", "/", "%"].includes(char)) {
      tokens.push({ type: "OPERATOR", value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === "(" || char === ")") {
      tokens.push({ type: "PAREN", value: char });
      i++;
      continue;
    }

    // Unrecognized character
    throw new Error(`Unexpected character '${char}' in expression.`);
  }

  return tokens;
}

/**
 * Shunting-yard algorithm to convert infix tokens to postfix (RPN).
 */
const PRECEDENCE = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "%": 2,
};

export function infixToPostfix(tokens) {
  const outputQueue = [];
  const operatorStack = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "NUMBER") {
      outputQueue.push(token);
    } else if (token.type === "OPERATOR") {
      while (
        operatorStack.length > 0 &&
        operatorStack[operatorStack.length - 1].type === "OPERATOR" &&
        PRECEDENCE[operatorStack[operatorStack.length - 1].value] >= PRECEDENCE[token.value]
      ) {
        outputQueue.push(operatorStack.pop());
      }
      operatorStack.push(token);
    } else if (token.type === "PAREN" && token.value === "(") {
      operatorStack.push(token);
    } else if (token.type === "PAREN" && token.value === ")") {
      let foundMatching = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop();
        if (top.type === "PAREN" && top.value === "(") {
          foundMatching = true;
          break;
        }
        outputQueue.push(top);
      }
      if (!foundMatching) {
        throw new Error("Mismatched parentheses: missing '('");
      }
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop();
    if (top.type === "PAREN") {
      throw new Error("Mismatched parentheses in expression.");
    }
    outputQueue.push(top);
  }

  return outputQueue;
}

/**
 * Evaluates a Postfix (RPN) token stream safely using Decimal.js.
 */
export function evaluatePostfix(postfix) {
  const stack = [];

  for (const token of postfix) {
    if (token.type === "NUMBER") {
      try {
        stack.push(new Decimal(token.value));
      } catch {
        throw new Error(`Invalid numeric token '${token.value}'.`);
      }
    } else if (token.type === "OPERATOR") {
      if (stack.length < 2) {
        throw new Error(`Malformed expression: insufficient operands for operator '${token.value}'.`);
      }
      const b = stack.pop();
      const a = stack.pop();

      switch (token.value) {
        case "+":
          stack.push(a.plus(b));
          break;
        case "-":
          stack.push(a.minus(b));
          break;
        case "*":
          stack.push(a.times(b));
          break;
        case "/":
          if (b.isZero()) {
            throw new Error("Cannot divide by zero.");
          }
          stack.push(a.dividedBy(b));
          break;
        case "%":
          if (b.isZero()) {
            throw new Error("Cannot calculate modulo by zero.");
          }
          stack.push(a.modulo(b));
          break;
        default:
          throw new Error(`Unsupported operator '${token.value}'.`);
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error("Malformed expression: invalid operator syntax.");
  }

  return stack[0];
}

/**
 * Evaluates an arithmetic string expression safely.
 * Returns { success: boolean, raw: string, formatted: string, error: string|null }
 */
export function evaluateExpression(expr, { decimalPlaces = 4 } = {}) {
  if (!expr || typeof expr !== "string" || !expr.trim()) {
    return {
      success: true,
      raw: "0",
      formatted: "0.00",
      error: null,
    };
  }

  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) {
      return { success: true, raw: "0", formatted: "0.00", error: null };
    }
    const postfix = infixToPostfix(tokens);
    const result = evaluatePostfix(postfix);

    const rawStr = result.toString();
    const fixed = result.toFixed(decimalPlaces);
    const [intPart, decPart] = fixed.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formattedStr = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;

    return {
      success: true,
      raw: rawStr,
      formatted: formattedStr,
      error: null,
    };
  } catch (err) {
    return {
      success: false,
      raw: null,
      formatted: null,
      error: err.message,
    };
  }
}

export const evaluateArithmeticExpression = evaluateExpression;

