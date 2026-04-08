/**
 * Grammar 自動生成スクリプト
 *
 * keywords.ts (semanticSchema 由来) を Single Source of Truth として
 * syntaxes/railsim2.tmLanguage.json を生成する。
 */

import { resolve, join, dirname } from "node:path";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  OBJECT_NAMES,
  CONTROL_KEYWORDS,
  PROPERTY_NAMES,
  CONSTANTS,
} from "@lollipop-onl/railsim2-language-server/keywords";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTPUT_PATH = join(ROOT, "syntaxes/railsim2.tmLanguage.json");

// ---------------------------------------------------------------------------
// Regex ヘルパー
// ---------------------------------------------------------------------------

function buildAlternation(words: readonly string[]): string {
  return words.join("|");
}

// ---------------------------------------------------------------------------
// Grammar 組み立て
// ---------------------------------------------------------------------------

function generateGrammar(): object {
  const objectNamesRegex = buildAlternation(OBJECT_NAMES);
  const controlRegex = buildAlternation(CONTROL_KEYWORDS);
  const propertyNamesRegex = buildAlternation(PROPERTY_NAMES);
  // yes/no は別ルールで扱うため、constants からは除外
  const constantsWithoutYesNo = CONSTANTS.filter((c) => c !== "yes" && c !== "no");
  const constantRegex = buildAlternation(constantsWithoutYesNo);

  return {
    $schema:
      "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
    name: "RailSim2",
    fileTypes: [
      "Rail2.txt",
      "Tie2.txt",
      "Girder2.txt",
      "Pier2.txt",
      "Line2.txt",
      "Pole2.txt",
      "Train2.txt",
      "Station2.txt",
      "Struct2.txt",
      "Surface2.txt",
      "Env2.txt",
      "Skin2.txt",
    ],
    patterns: [
      { include: "#comment-line" },
      { include: "#comment-block" },
      { include: "#sym-objects" },
    ],
    repository: {
      "comment-line": {
        name: "comment.line.double-slash.rs2",
        match: "//.*$",
      },
      "comment-block": {
        name: "comment.block.rs2",
        begin: "/\\*",
        end: "\\*/",
      },
      "punctuation-semicolon": {
        name: "punctuation.terminator.statement.rs2",
        match: ";",
      },
      numeric: {
        patterns: [
          {
            name: "constant.numeric.signature.rs2",
            match: "-(?=[0-9])",
          },
          {
            name: "constant.numeric.decimal.rs2",
            match: "\\b[0-9]+(\\.[0-9]+)?\\b",
          },
        ],
      },
      alphabet: {
        name: "support.variable.alphabet.rs2",
        match: "\\b[_A-Za-z]+\\b",
      },
      string: {
        name: "string.quoted.double.rs2",
        begin: "\"",
        end: "\"",
        patterns: [
          {
            name: "constant.character.escape.rs2",
            match: "\\\\.",
          },
        ],
      },
      constant: {
        name: "support.constant.rs2",
        match: `\\b(${constantRegex})\\b`,
      },
      color: {
        name: "constant.other.color.rs2",
        match: "#[0-9A-Fa-f]{8}\\b",
      },
      "yes-no": {
        match: "\\b(yes|no)\\b",
        captures: {
          "0": {
            name: "constant.language.boolean.yes-no.rs2",
          },
        },
      },
      literal: {
        patterns: [
          { include: "#constant" },
          { include: "#yes-no" },
          { include: "#alphabet" },
          { include: "#string" },
          { include: "#color" },
          { include: "#numeric" },
        ],
      },
      expression: {
        patterns: [
          {
            name: "keyword.operator.rs2",
            match:
              "<<|>>|<=|>=|==|!=|&&|\\|\\||\\?:|\\(|\\)|\\+|-|!|~|\\*|\\/|%|<|>|\\^|&|\\|",
          },
          { include: "#literal" },
        ],
      },
      "sym-assignment-ops": {
        begin: "=",
        beginCaptures: {
          "0": {
            name: "punctuation.separator.dictionary.key-value.json",
          },
        },
        end: "(?=;)",
        endCaptures: {
          "0": {
            name: "punctuation.separator.dictionary.pair.json",
          },
        },
        patterns: [{ include: "#sym-assignable-vars" }],
      },
      "sym-assignable-vars": {
        patterns: [
          { include: "#literal" },
          {
            name: "punctuation.separator.parameter.rs2",
            match: ",",
          },
          {
            name: "punctuation.definition.parameters.rs2",
            match: "\\(|\\)",
          },
        ],
      },
      "sym-objects": {
        begin: `\\b((${objectNamesRegex})|(${controlRegex}))\\b`,
        beginCaptures: {
          "2": {
            name: "storage.type.object-name.rs2",
          },
          "3": {
            name: "keyword.control.object-name.rs2",
          },
        },
        end: "}",
        endCaptures: {
          "0": {
            name: "punctuation.definition.block.rs2",
          },
        },
        patterns: [
          { include: "#expression" },
          { include: "#string" },
          {
            begin: "{",
            beginCaptures: {
              "0": {
                name: "punctuation.definition.block.rs2",
              },
            },
            end: "(?=})",
            patterns: [
              { include: "#comment-line" },
              { include: "#comment-block" },
              { include: "#punctuation-semicolon" },
              { include: "#sym-objects" },
              { include: "#sym-case-clause" },
              { include: "#sym-properties" },
            ],
          },
        ],
      },
      "sym-case-clause": {
        begin: "\\b(Case|Default(?= *:))",
        beginCaptures: {
          "1": {
            name: "keyword.control.switch.rs2",
          },
        },
        end: ":",
        endCaptures: {
          "0": {
            name: "punctuation.definition.section.case-statement.rs2",
          },
        },
        patterns: [
          { include: "#expression" },
          {
            name: "punctuation.separator.parameter.rs2",
            match: ",",
          },
        ],
      },
      "sym-properties": {
        begin: `\\b(${propertyNamesRegex})\\b`,
        beginCaptures: {
          "0": {
            name: "variable.parameter.property.rs2",
          },
        },
        end: "(?=;)",
        patterns: [{ include: "#sym-assignment-ops" }],
      },
    },
    scopeName: "source.rs2",
  };
}

// ---------------------------------------------------------------------------
// 出力
// ---------------------------------------------------------------------------

const grammar = generateGrammar();
const json = JSON.stringify(grammar, null, 2) + "\n";
writeFileSync(OUTPUT_PATH, json, "utf-8");

console.log(`✅ Generated ${OUTPUT_PATH}`);
console.log(`   Objects: ${OBJECT_NAMES.length}`);
console.log(`   Properties: ${PROPERTY_NAMES.length}`);
console.log(`   Constants: ${CONSTANTS.length}`);
