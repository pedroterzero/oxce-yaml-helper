# v1.2.7
- Updated ruleset documentation
- Bump package versions

# v1.2.6
- Added recognition for items.scripts.inventorySpriteOverlay

# v1.2.5
- increased maxAliasCount for CSV converter

# v1.2.4
- allow sorting of documentation attributes
- allow hiding of documentation attributes in table of contents

# v1.2.3
- restore parentMods configuration setting

# v1.2.2
- Updated ruleset documentation
- Add ruleset documentation to extension

# v1.2.1
- Security updates

# v1.2.0
- Optionally check for STR_ with missing translation

# v1.1.0
- Add support for sub-(sub-(sub-))mods

# v1.0.0
- Added spreadsheet (csv) editor functionality
- Remove check on manufacture.category
- Don't check ufopaedia articles with section: STR_NOT_AVAILABLE
- manufacture.producedItems, allow crafts
- Don't check waves for operationType=3, objective=2
- Add a whole bunch of types to ignore (submod stuff, scripts, and others)
- Add a whole bunch of translation types
- Add more builtin types
- Remove all FtA references and make them accessible to linker.yml
- Switch to esbuild for building packages
- Ignore mapScripts group checking for baseTerrain
- Pass metadata from higher entries to lower (fixes .groups vs .groups[] existing simultaneously)
- Add some missing builtin types for facilities.verticalLevels[].type

# v0.8.5
- Fix with alienDeployment logic checker (respect refNodes)
- Update documentation

# v0.8.4
- Some small documentation hover fixes (fix import from wiki)

# v0.8.3
- Add sprite index checking with subX/subY for more sprite types (HANDOB)
- Added helpful hint for multi sprites

# v0.8.2
- Added missing vanilla armor sprites
- Fix sprite index checking with subX/subY for more sprite types (INTICON)
- Do not retrieve keys from aliases (they only need checking once), fixes problems
- Store logic data for vanilla assets (but don't check them), prevents false positives when checking them
- Improved message in case of mapblock that does not cause segfault but will just cause block to be ignored
- Fix autocomplete for line that is also start of an array entry
- Improve duplicate error message (use related information, #35)
- Fix relatedlogic fields overwriting existing typeLinks
- Added missing type link for alienMissions.waves[].ufo
- Added missing lt & le in y-script highlighting
- manufacture.requiredItems add crafts as valid type
- Added missing stringType (alienDeployments.objectiveFailed)
- Combine alienMissions data from multiple files
- Ufopaedia image no longer required for type 3, apparently
- Parse comments in extraSprites/extraSounds (so duplicates can be ignored)
- Enable subX/subY for BIGOBS and FLOOROBS
- Add hitMissSound vanilla ids
- No longer check ufopaedia.weapon (it's a translatable string)
- Properly handle refNodes in logic checkers may need to add in other positions)
- Reload Language/*.yml on changes, so translations get picked up #26

# v0.8.1
- Added syntax highlighting for y-script loop statements

# v0.8.0
- Added context aware autocomplete
- Removed FtA logic and made rules extendable through linker.yml
- Fixed subcategories in documentation hovering
- mapScripts check terrain: now
- Some other minor fixes

# v0.7.0
- Added Y-script syntax highlighting
- Added vanilla `alienMissions.rul` (it was causing false positives)

# v0.6.0
- New logic checks: detect common and uncommon segmentation faults and other problems

# v0.5.1
- Fix missing inventories

# v0.5.0
- Add support for linking global variables, see https://github.com/pedroterzero/oxce-yaml-helper/issues/5
- Under the hood: use async fs functions

# v0.4.0
Too much to name, but biggest new features are:
- Reference checking
- Translation hover
- Duplicate definition checking.
- Under the hood almost everything was rewritten.

# v0.3.7
- Fix documentation hover
- No longer offer 'go to definition' for numeric properties that are not linked

# v0.3.6
- Added `*.rul` language hint

# v0.3.5
- Added option to show short documentation hovers only (only first line)

# v0.3.4
- Fixed examples to work in marketplace

# v0.3.3
- No functionality, expanded readme with visual examples

# v0.3.2
- Fixed ufopaedia links

# v0.3.1
- Added more robust documentation support

# v0.3.0
- Added initial documentation hover support (not complete yet)

# v0.2.3
- Broke stuff with bad version

# v0.2.2
- Added links for a lot of sounds to extraSounds.BATTLE.CAT.files

# v0.2.1
- Fixed bug with custom logic handlers not working
