/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { parseDocument } from "yaml";
import {
  TextDocument,
  Position,
  LanguageService,
  TokenType,
  Range,
} from "./languageModes";

export interface LanguageRange extends Range {
  languageId: string | undefined;
  attributeValue?: boolean;
}

export interface YAMLDocumentRegions {
  getEmbeddedDocument(
    languageId: string,
    ignoreAttributeValues?: boolean
  ): TextDocument;
  getLanguageRanges(range: Range): LanguageRange[];
  getLanguageAtPosition(position: Position): string | undefined;
  getLanguagesInDocument(): string[];
}

export const CSS_STYLE_RULE = "__";

interface EmbeddedRegion {
  languageId: string | undefined;
  start: number;
  end: number;
  attributeValue?: boolean;
}

export function getDocumentRegions(
  languageService: LanguageService,
  document: TextDocument
): YAMLDocumentRegions {
  const regions: EmbeddedRegion[] = [];

  const doc = parseDocument(document.getText());

  let scripts = [];
  try {
    scripts = doc.get("extended").get("scripts").items;
  } catch (error) {
    // return;
  }

  for (const hookType of scripts) {
    // const hookName = hookType.key.value;

    for (const script of hookType.value.items) {
      let codeNode;
      if ((codeNode = script.get("code", true))) {
        regions.push({
          languageId: "y-script",
          start: codeNode.range[0] + 1, // strip off |
          end: codeNode.range[1],
        });
      }
    }
  }

  return {
    getLanguageRanges: (range: Range) =>
      getLanguageRanges(document, regions, range),
    getEmbeddedDocument: (languageId: string, ignoreAttributeValues: boolean) =>
      getEmbeddedDocument(document, regions, languageId, ignoreAttributeValues),
    getLanguageAtPosition: (position: Position) =>
      getLanguageAtPosition(document, regions, position),
    getLanguagesInDocument: () => getLanguagesInDocument(document, regions),
  };
}

function getLanguageRanges(
  document: TextDocument,
  regions: EmbeddedRegion[],
  range: Range
): LanguageRange[] {
  const result: LanguageRange[] = [];
  let currentPos = range ? range.start : Position.create(0, 0);
  let currentOffset = range ? document.offsetAt(range.start) : 0;
  const endOffset = range
    ? document.offsetAt(range.end)
    : document.getText().length;
  for (const region of regions) {
    if (region.end > currentOffset && region.start < endOffset) {
      const start = Math.max(region.start, currentOffset);
      const startPos = document.positionAt(start);
      if (currentOffset < region.start) {
        result.push({
          start: currentPos,
          end: startPos,
          languageId: "yaml",
        });
      }
      const end = Math.min(region.end, endOffset);
      const endPos = document.positionAt(end);
      if (end > region.start) {
        result.push({
          start: startPos,
          end: endPos,
          languageId: region.languageId,
          attributeValue: region.attributeValue,
        });
      }
      currentOffset = end;
      currentPos = endPos;
    }
  }
  if (currentOffset < endOffset) {
    const endPos = range ? range.end : document.positionAt(endOffset);
    result.push({
      start: currentPos,
      end: endPos,
      languageId: "html",
    });
  }
  return result;
}

function getLanguagesInDocument(
  _document: TextDocument,
  regions: EmbeddedRegion[]
): string[] {
  const result = [];
  for (const region of regions) {
    if (region.languageId && result.indexOf(region.languageId) === -1) {
      result.push(region.languageId);
      if (result.length === 2) {
        return result;
      }
    }
  }
  result.push("yaml");
  return result;
}

function getLanguageAtPosition(
  document: TextDocument,
  regions: EmbeddedRegion[],
  position: Position
): string | undefined {
  const offset = document.offsetAt(position);
  for (const region of regions) {
    if (region.start <= offset) {
      if (offset <= region.end) {
        return region.languageId;
      }
    } else {
      break;
    }
  }
  return "html";
}

function getEmbeddedDocument(
  document: TextDocument,
  contents: EmbeddedRegion[],
  languageId: string,
  ignoreAttributeValues: boolean
): TextDocument {
  let currentPos = 0;
  const oldContent = document.getText();
  let result = "";
  let lastSuffix = "";
  for (const c of contents) {
    if (
      c.languageId === languageId &&
      (!ignoreAttributeValues || !c.attributeValue)
    ) {
      result = substituteWithWhitespace(
        result,
        currentPos,
        c.start,
        oldContent,
        lastSuffix,
        getPrefix(c)
      );
      result += oldContent.substring(c.start, c.end);
      currentPos = c.end;
      lastSuffix = getSuffix(c);
    }
  }
  result = substituteWithWhitespace(
    result,
    currentPos,
    oldContent.length,
    oldContent,
    lastSuffix,
    ""
  );
  return TextDocument.create(
    document.uri,
    languageId,
    document.version,
    result
  );
}

function getPrefix(c: EmbeddedRegion) {
  if (c.attributeValue) {
    switch (c.languageId) {
      case "css":
        return CSS_STYLE_RULE + "{";
    }
  }
  return "";
}
function getSuffix(c: EmbeddedRegion) {
  if (c.attributeValue) {
    switch (c.languageId) {
      case "css":
        return "}";
      case "javascript":
        return ";";
    }
  }
  return "";
}

function substituteWithWhitespace(
  result: string,
  start: number,
  end: number,
  oldContent: string,
  before: string,
  after: string
) {
  let accumulatedWS = 0;
  result += before;
  for (let i = start + before.length; i < end; i++) {
    const ch = oldContent[i];
    if (ch === "\n" || ch === "\r") {
      // only write new lines, skip the whitespace
      accumulatedWS = 0;
      result += ch;
    } else {
      accumulatedWS++;
    }
  }
  result = append(result, " ", accumulatedWS - after.length);
  result += after;
  return result;
}

function append(result: string, str: string, n: number): string {
  while (n > 0) {
    if (n & 1) {
      result += str;
    }
    n >>= 1;
    str += str;
  }
  return result;
}

function getAttributeLanguage(attributeName: string): string | null {
  const match = attributeName.match(/^(style)$|^(on\w+)$/i);
  if (!match) {
    return null;
  }
  return match[1] ? "css" : "javascript";
}
