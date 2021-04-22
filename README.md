# OpenXcom Ruleset Linker
Welcome to the OpenXcom (Extended) Ruleset Linker. This extension aims to turn Visual Studio code into a ruleset modding IDE!

## Features ([see below for video](#how-to-use-it))
* **[Go to definition](#definitions)** for most things in OXC(E) rulesets (and FtA). This allows you to jump directly to the definition of most string ids.
* **[Y-script syntax highlighting](#y-script-syntax-highlighting)**. Pretty self-explanatory, nice colours for y-script!
* **[Context aware autocomplete](#context-aware-autocomplete)**. Adds additional autocomplete features; only suggests appropriate things, and works across files!
* **[Translation Hover](#translation-hover)**. This means hovering over a string, for example `STR_FOOBAR`, will show the related translation for it, if existing
* **[Reference checking](#reference-checking)** for most things in OXC(E) rulesets. This means the extension will tell you if you've mistyped a string ID or sprite ID, or referred to one that does not exist. This saves a lot of time to test a mod only to have it crash because something is wrong.
* **[Documentation Hover](#documentation-hover)** (currently for most but not all properties). This means hovering over a property, for example `requiresBuy`, will show the documentation for it. This saves some trips to the wiki! Disableable in settings.
* **[Image preview](#image-preview)** for **sprites and images** (through [Image Preview Extension](https://marketplace.visualstudio.com/items?itemName=kisstkondoros.vscode-gutter-preview)).
* **[Duplicate definition checking](#duplicate-definition-checking)** for most things in OXC(E) rulesets. This means that if you have a unit with the same name defined twice for example, it will tell you about it. This is disabled by default and can be enabled in the extension settings.

## How to install VScode and this extension
Please see [this walkthrough guide](https://github.com/pedroterzero/oxce-yaml-helper/blob/main/INSTALL.md)!

## How to use it

### Definitions
Go to any (supported) type, for example `STR_FOOBAR`. If it is defined anywhere else, you should be able to jump directly to its definition by CTRL+clicking on it. Or by right-clicking it and clicking 'Go to definition', or by clicking it and pressing F12.

![Go To Definition Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/go-to-definition.gif)

### Y-script syntax highlighting
Any `.rul` file that has y-script in them, should have them automatically highlighted. You should not have to do anything to get this to work.

![Syntax highlighting](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/syntax-highlighting.png)

### Context aware autocomplete
Go to where you would like to insert a reference to another rule, then type `CTRL+space`. This will you show you approppriate suggestions; for example when adding an item to `requiresBuy` in `items`, it will only show research rules. It will also work across files, making life easier.

![Context aware autocomplete](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/context-aware-autocomplete.gif)

### Reference checking
To use this, open the '**Problems**' view. You can open this from the 'View' menu, then clicking 'Problems'. Any problems that the extension detects will be automatically be shown here. Everytime you save a file, the view will be updated.

![Reference Checking Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/reference-checking.gif)

### Translation Hover
Go to any translation string, for example `STR_FOOBAR` and hover your mouse on it. If a translation exists for the current locale, it will be shown. The default locale is `en-US`, this can be changed in your settings (CTRL+comma, then type `oxc linker` to find settings)

![Translation Hover Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/translation-hover.gif)

### Documentation Hover
Go to any ruleset property, for example `requiresBuy` and hover your mouse on it. If documentation exists for it, it will be shown. If you find this annoying, you can disable it in your settings (CTRL+comma, then type `oxc linker` to find settings)

![Documentation Hover Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/documentation-hover.gif)

### Image preview
Hover over any image reference to get an image preview.

![Image Preview Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/image-preview.gif)

### Duplicate definition checking
To use this, first enable it in settings. Press `CTRL+comma` and copy&paste this in the search box: `findDuplicateDefinitions`. Or navigate to it manually. Then enable the setting.<br />
Then open the '**Problems**' view. You can open this from the 'View' menu, then clicking 'Problems'.<br />
Any duplicate definitions should then be shown in the problems view.

![Duplicate Definition Example](https://raw.githubusercontent.com/pedroterzero/oxce-yaml-helper/main/docs/find-duplicate-definitions.gif)

## Credits
- Inspired (that's not really the right word) by https://github.com/shanehofstetter/rails-i18n-vscode
- [Finnik](https://github.com/Finnik723) and [Filip H](https://github.com/Filip-H) for testing, suggestions/ideas and helping out on ruleset linking rules.
- Everyone else that has anything to do with OpenXCOM or OXCE