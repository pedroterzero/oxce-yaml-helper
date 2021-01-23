import * as P from 'parsimmon';
import { Node } from 'parsimmon';
import { Operations } from './operations';

type Identifier = Node<'Identifier', string>;
interface Declaration {
  primitive: Node<'Primitive', string>,
  identifier: Identifier,
}

interface IfStatement {
  conditionalStatement: ConditionalStatement,
}

interface ConditionalStatement {
  booleanOperator?: Node<'BooleanOperator', string>,
  conditions: Condition[];
}

interface Condition {
  comparisonOperator: Node<'ComparisonOperator', string>,
}

interface Comparison {
  leftIdentifier: Identifier | number,
  rightIdentifier: Identifier | number
}

interface Assignment {
  objectIdentifier: Identifier,
  assigneeIdentifiers: (Identifier | number)[],
  newValue: Node<'Number', number>,
}

interface OperationStatement {
  variableName: Identifier,
  newValue: Node<'Number', number>,
}

interface TagReference {
  tagIdentifier: Identifier,
}

type End = [string[], ';', string[]];

type ReturnStatement = ["return", Identifier[], End];

/**
 * Gets an operation statement with the requested number of variables (number of arguments is linked to name)
 * @param r
 * @param number
 */
const getOperationStatementWithNumberOfArguments = (r: typeof Yscript, number: number) => {
  const base = P.seqObj<OperationStatement>(
    P.alt(...Object.keys(Operations).filter((op) => Operations[op] === number).map(P.string)), // get operation with the requested number of arguments
    r.s1,
    ['variableName', r.Identifier], // always a variable
  );

  if (number === 1) {
    // no arguments
    return base.then(r.End).desc('operation').node('OperationStatement');
  }

  // number of arguments
  return base.then(P.seq(
    r.s1,
    P.alt(r.Identifier, r.SignedNumber).sepBy(r.s1).times(number - 1), // remaining arguments, so 1 less
    r.End
  ).desc('operation').node('OperationStatement'));
};

interface YscriptSpec {
  s0: string;
  s1: string;
  Whitespace: string;
  NotNewline: string;
  Dot: string;
  Comma: string;
  Comment: string;
  End: End;
  _: string[];

  Program: Node<"Program", ReturnStatement>
  Statement: string

  ReturnStatement: ReturnStatement
  EndStatement: ["end", End]
  Declaration:  Node<'Declaration', Declaration>
  Condition: Condition
  ConditionalStatement: ConditionalStatement
  IfStatement: Node<'IfStatement', IfStatement>
  IfElseBody: [string[], ReturnStatement?]
  Assignment: Node<'Assignment', Assignment>
  LogStatement: End
  OperationStatement: Node<'OperationStatement', OperationStatement>

  Tag: Node<'Tag', TagReference>

  QuotedString: string
  SingleQuotedString: string
  DoubleQuotedString: string
  Number: Node<'Number', number>
  SignedNumber: Node<'Number', number>
  Identifier: Identifier
  Primitive: Node<'Primitive', string>
  ComparisonOperator: Node<'ComparisonOperator', string>
  BooleanOperator: Node<'BooleanOperator', string>
}

const getOneOptional = () => {
  return <T>(parser: P.Parser<T>): P.Parser<T | undefined> => {
      return parser.atMost(1).map(parser => parser.length === 1 ? parser[0] : undefined);
  };
};

export const Yscript: P.Language = P.createLanguage<YscriptSpec>({
  s0: () => P.regexp(/[ \r\n\t]*/),
  s1: () => P.regexp(/[ \r\n\t]+/),
  Whitespace: () => P.regexp(/[ \n]*/),
  NotNewline: () => P.regexp(/[^\n]*/),
  Dot: () => P.string('.'),
  Comma: () => P.string(','),
  Comment: (r) => P.string('#').then(r.NotNewline).then(P.string("\n")),

  End: (r) => P.seq(
    r.Comment.trim(r.s0).many(),
    P.string(';').trim(r.s0),
    r.Comment.trim(r.s0).many(),
  ),
  _: r => r.Comment.sepBy(r.Whitespace).trim(r.Whitespace),

  Program: r =>
    r.Statement.many()
      .then(r.ReturnStatement)
      .trim(r._)
      .node('Program'),

  Statement: r => P.alt(r.Declaration, r.IfStatement/* , r.EndStatement *//*, r.ReturnStatement*/, r.Assignment, r.LogStatement, r.OperationStatement),

  ReturnStatement: (r) =>
    P.seq(
      P.string('return'),
      r.s1.then(r.Identifier).many(), // TODO: drop whitespace
      r.End
    ),

  EndStatement: (r) =>
    P.seq(
      P.string('end'),
      r.End
    ),

  Condition: (r) => P.seqObj<Condition>(
    r.s1,
    ['comparisonOperator', r.ComparisonOperator],
    r.s1,
    P.alt(
      // at least one needs an identifier, imo
      P.seqObj<Comparison>(
        ['leftIdentifier', r.Identifier],
        r.s1,
        ['rightIdentifier', P.alt(r.Identifier, r.SignedNumber)],
      ),
      P.seqObj<Comparison>(
        ['leftIdentifier', P.alt(r.Identifier, r.SignedNumber)],
        r.s1,
        ['rightIdentifier', r.Identifier],
      )
    )
   ),

  ConditionalStatement: (r) =>
    P.seqObj<ConditionalStatement>(
      ['booleanOperator', r.s1.then(r.BooleanOperator).thru(getOneOptional())], // todo trim whitespace before operator
      ['conditions', r.Condition.atLeast(1)],
    ),

  // maybe true for any construct but Program (where return is NOT optional)
  IfElseBody: (r) => P.seq(
     r.Statement.many(),
     r.ReturnStatement.thru(getOneOptional())
  ),

  // todo: if and/or is set, require multiple conditions
  IfStatement: (r) =>
    P.seqObj<IfStatement>(
      P.string('if'),
      ['conditionalStatement', r.ConditionalStatement],
      r.End,
      r.IfElseBody,
      P.string('else').then(r.ConditionalStatement).then(r.End).then(r.IfElseBody).many(),
      P.string('else').then(r.End).then(r.IfElseBody).atMost(1),
      r.EndStatement
    ).node('IfStatement'),

  Declaration: r =>
    P.seqObj<Declaration>(
      P.string('var'),
      r.s1,
      ['primitive', r.Primitive],
      P.seqObj<{type: Identifier}>( // todo
        r.s1,
        ['type', r.Identifier.lookahead(r.s1)], // identifier followed by a whitespace
      ).thru(getOneOptional()),
      r.s1,
      ['identifier', P.alt(r.Identifier, r.Number)], // todo make it so if it's int, it must be a number, otherwise an identifier
      r.End
    ).node('Declaration'),

  Assignment: r =>
    P.seqObj<Assignment>(
      // object
      ['objectIdentifier', r.Identifier],
      // object properties
      P.string('.'),
      r.Identifier.sepBy(r.Dot),
      r.s1,
      P.alt(
        // tag assignment
        //    unit.setTag Tag.FTAG_ISDAZED 0;#cancel tag
        P.seqObj<Assignment>(
          r.Tag,
          r.s1,
          ['newValue', P.alt(r.Number, r.Identifier)] // int or var
        ),
        // normal assignment:
        //    unit.Stats.setThrowing originalThrowing;
        //    unit.getTag dazeTag Tag.FTAG_ISDAZED;
        //    battle_game.randomRange roll 20 35;
        //    armorRuleset.getTag shieldCapacity Tag.ARMOR_ENERGY_SHIELD_CAPACITY;
        //    itemRuleset.hasCategory catCheck "STR_SNIPER_RIFLES";
        P.seqObj<Assignment>(
          // ['assigneeIdentifiers', P.alt(r.Number, r.Identifier).sepBy1(r.s1)],
          ['assigneeIdentifiers', P.alt(r.Number, r.QuotedString, r.Identifier.skip(P.seq(r.s1, r.Tag).many())).sepBy1(r.s1)], // any number or identifier, until we hit Tag.
          r.Tag.atMost(1),
          // P.seq(r.s1, r.Tag).atMost(1),
        ),
        // string assignment:
        //     battle_game.flashMessage 'STR_TARGET_IS_NOT_DAZED';
        r.QuotedString
      ),
      r.End
    ).node('Assignment'),

  LogStatement: r =>
    P.string('debug_log')
    .then(r.s1)
    .then(
        P.alt(r.Identifier, r.Number, r.QuotedString).sepBy(r.s1)
    )
    .then(r.End).desc('operation'), // lumping in with operations

  OperationStatement: (r) =>
    P.alt(
      ...[...new Set(Object.values(Operations))].map(numberOfArguments => getOperationStatementWithNumberOfArguments(r, numberOfArguments))
    ),

  Tag: r => P.seqObj<TagReference>(
    P.string('Tag.'),
    ['tagIdentifier', r.Identifier]).node('Tag'),

  QuotedString: r => P.alt(r.SingleQuotedString, r.DoubleQuotedString).desc('string'),
  SingleQuotedString: () => P.regexp(/'(?:[^'\\]|\\.)*'/),
  DoubleQuotedString: () => P.regexp(/"(?:[^"\\]|\\.)*"/),
  SignedNumber: () =>
    P.regexp(/-?[0-9]+/)
      .map(Number)
     .node('Number'),
  Number: () =>
    P.regexp(/[0-9]+/)
      .map(Number)
      .node('Number'),
  Identifier: () => P.regexp(/[a-zA-Z][_a-zA-Z0-9]*/).desc('identifier (variable, object, property)').node('Identifier'),
  Primitive: () => P.regexp(/int|ptre|ptr/).node('Primitive'),
  ComparisonOperator: () => P.regexp(/eq|neq|gt|ge|lt|le/).node('ComparisonOperator'),
  BooleanOperator: () => P.regexp(/and|or/).node('BooleanOperator'),
});