# OXC(E) YAML Helper thingy
Welcome to the OXC(E) YAML Helper thingy. For lack of a better name.

## Features
- Adds 'Go to definition' support for most symbols in OXC(E) rulesets (and FtA). This allows you to jump directly to the definition of most string ids.
- Adds 'Hover' support for most symbols. This means hovering over a string, for example `STR_FOOBAR`, will show the related translation for it, if existing

## How to use it

### Definitions
Go to any (supported) type, for example `STR_FOOBAR`. If it is defined anywhere else, you should be able to jump directly to its definition by CTRL+clicking on it. Or by right-clicking it and clicking 'Go to definition', or by clicking it and pressing F12.

### Hover
Go to any (supported) type, for example `STR_FOOBAR` and hover your mouse on it. If a translation exists for the current locale, it will be shown. The default locale is `en-US`, this can be changed in your settings (CTRL+comma, then type `openxcom` to find settings)

## Troubleshooting
- Is clicking to a definition taking you to a wrong (seemingly random) place in a ruleset? This is because the [YAML parser](https://www.npmjs.com/package/yaml) used assumes UNIX line endings. Therefore this tool may not correctly work on Windows with CRLF files. I have tried to work around this, but I'm not sure yet if it's reliable.

## Todo/ideas
- Implement translations
- Show string translation on hover
- Implement problem finding (missing definitions, missing sprite ids, et cetera)

## Todo/dev
- Look for 0 definitions to find missing types like alienRaces

## Credits
- Inspired (that's not really the right word) by https://github.com/shanehofstetter/rails-i18n-vscode
- Finnik for testing and suggestions
- Everyone else that has anything to do with OpenXCOM or OXCE