# OXC(E) YAML Helper thingy
Hi.

## Prerequisites
- Because the [YAML parser](https://www.npmjs.com/package/yaml) used assumes UNIX line endings, your rule files need to have them.
  Otherwise you will jump to the wrong place in the file. Hit CTRL+SHIFT+P, type `eol`, then choose `LF`. Then convert your files to LF. On linux, Hit CTRL+SHIFT+\`,
  then type `find -name '*.rul' -exec sed -i 's/^M$//' {} \;`

## Credits
- Inspired (that's not really the right word) by https://github.com/shanehofstetter/rails-i18n-vscode
- Everyone that has anything to do with OpenXCOM or OXCE
