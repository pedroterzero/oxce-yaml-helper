/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Diagnostic } from 'vscode-languageclient';
import { YAMLDocumentRegions } from '../embeddedSupport';
import { LanguageModelCache } from '../languageModelCache';
import { LanguageMode, Range, TextDocument } from '../languageModes';
import { Yscript } from '../yscript/yscript';

export function getYScriptMode(
	// cssLanguageService: CSSLanguageService,
	documentRegions: LanguageModelCache<YAMLDocumentRegions>
): LanguageMode {
	return {
		getId() {
			return 'y-script';
		},
		doValidation(document: TextDocument) {
			// Get virtual CSS document, with all non-CSS code replaced with whitespace
			// const embedded = documentRegions.get(document).getEmbeddedDocument('y-script');
			const fullDocumentRange = {
				start: {line: 0, character: 0},
				end: document.positionAt(document.getText().length),
			};

			const scripts = documentRegions.get(document).getLanguageRanges(fullDocumentRange).filter(range => range.languageId === 'y-script');
			const diagnostics: Diagnostic[] = [];

			for (const script of scripts) {
				const scriptStartOffset = document.offsetAt(script.start);
				const scriptText = document.getText().slice(scriptStartOffset, document.offsetAt(script.end));
				console.log(scriptText);
				const parsed = Yscript.Program.parse(scriptText);
				if (parsed.status === true) {
					continue;
				}

				const problemOffset = parsed.index.offset + scriptStartOffset;

				diagnostics.push(
					{
						range: {
							start: document.positionAt(problemOffset),
							end: document.positionAt(problemOffset + 1)
						},
						message: `Expected one of: ${parsed.expected.join(', ')}`
					},
				);
			}

			return diagnostics;
		},
		// doComplete(document: TextDocument, position: Position) {
			// Get virtual CSS document, with all non-CSS code replaced with whitespace
			// const embedded = documentRegions.get(document).getEmbeddedDocument('css');
			// const stylesheet = cssLanguageService.parseStylesheet(embedded);
			// return cssLanguageService.doComplete(embedded, position, stylesheet);
		// },
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		onDocumentRemoved(_document: TextDocument) {},
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		dispose() {}
	};
}
