# OXC(E) YAML Helper thingy
Welcome to the OXC(E) YAML Helper thingy. For lack of a better name.

## Features
- Adds 'Go to definition' support for most symbols in OXC(E) rulesets (and FtA). This allows you to jump directly to the definition of
  most string ids.

## Prerequisites
- Because the [YAML parser](https://www.npmjs.com/package/yaml) used assumes UNIX line endings, your rule files need to have them.
  Otherwise you will jump to the wrong place in the file. Hit CTRL+SHIFT+P, type `eol`, then choose `LF`. Then convert your files to LF. On linux, Hit CTRL+SHIFT+\`,
  then type `find -name '*.rul' -exec sed -i 's/^M$//' {} \;`

## Todo/ideas
- Prompt user about CRLF files and offer to fix them
- Show string translation on hover
- Parse all YAML files when the workspace launches and cache them, instead of parsing them every time
- Make ruleset parsing more intelligent. Currently the correctness of definition detection is not guaranteed. Clicking to a definition
  may take you to an 'unrelated' definition if that has the same name. A workaround would be not to share names between different types, if possible.

## Credits
- Inspired (that's not really the right word) by https://github.com/shanehofstetter/rails-i18n-vscode
- Everyone that has anything to do with OpenXCOM or OXCE
