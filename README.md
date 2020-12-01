# OXC(E) YAML Helper thingy
Welcome to the OXC(E) YAML Helper thingy. For lack of a better name.

## Features ([see below for video](#how-to-use-it))
* Adds **'Reference checking' support for most things in OXC(E) rulesets. This means the extension will tell you if you've mistyped a string ID, or referred to one that does not exist. This saves a lot of time to test a mod only to have it crash because something is wrong.
* Adds **'Go to definition' support** for most things in OXC(E) rulesets (and FtA). This allows you to jump directly to the definition of most string ids.
* Adds **'Hover' support for translations strings**. This means hovering over a string, for example `STR_FOOBAR`, will show the related translation for it, if existing
* Adds **'Documentation Hover' support** (currently for most but not all properties). This means hovering over a property, for example `requiresBuy`, will show the documentation for it. This saves some trips to the wiki! Disableable in settings.
* Adds **'Image preview' support for sprites and images** (through [Image Preview Extension](https://marketplace.visualstudio.com/items?itemName=kisstkondoros.vscode-gutter-preview)).
* Adds **'Duplicate definition checking' support for most things in OXC(E) rulesets. This means that if you have a unit with the same name defined twice for example, it will tell you about it. This is disabled by default and can be enabled in settings.

## How to install VScode and this extension
Please see [this walkthrough guide](https://github.com/pedroterzero/oxce-yaml-helper/blob/main/INSTALL.md)!

## How to use it

### Definitions
Go to any (supported) type, for example `STR_FOOBAR`. If it is defined anywhere else, you should be able to jump directly to its definition by CTRL+clicking on it. Or by right-clicking it and clicking 'Go to definition', or by clicking it and pressing F12.

![Go To Definition Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/go-to-definition.gif)

### Translation Hover
Go to any translation string, for example `STR_FOOBAR` and hover your mouse on it. If a translation exists for the current locale, it will be shown. The default locale is `en-US`, this can be changed in your settings (CTRL+comma, then type `oxc helper` to find settings)

![Translation Hover Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/translation-hover.gif)

### Documentation Hover
Go to any ruleset property, for example `requiresBuy` and hover your mouse on it. If documentation exists for it, it will be shown. If you find this annoying, you can disable it in your settings (CTRL+comma, then type `oxc helper` to find settings)

![Documentation Hover Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/documentation-hover.gif)

### Image preview
Hover over any image reference to get an image preview.

![Image Preview Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/image-preview.gif)

## Troubleshooting
- Is clicking to a definition taking you to a wrong (seemingly random) place in a ruleset? This is because the [YAML parser](https://www.npmjs.com/package/yaml) used assumes UNIX line endings. Therefore this tool may not correctly work on Windows with CRLF files. I have tried to work around this, but I'm not sure yet if it's reliable.

## Todo/ideas
- Implement missing translation keys
- Implement missing files
- Preview Vanilla resources?
- Fix for TFTD
- Unused definition warnings
- Find references
- More complex reference checking (like is an item actually an HWP, etc)

## Todo/dev
- List all distinct types so we can see ones we need to veto
- Fix changes outside of vscode (reloading gets the editor state, not the fs state)
- Use virtual documents for vanilla assets: https://code.visualstudio.com/api/extension-guides/virtual-documents
- Check `typedProperties.addTypeLinks` for correct splitting?

## Credits
- Inspired (that's not really the right word) by https://github.com/shanehofstetter/rails-i18n-vscode
- Finnik for testing, suggestions/ideas and helping out on ruleset linking rules
- Everyone else that has anything to do with OpenXCOM or OXCE