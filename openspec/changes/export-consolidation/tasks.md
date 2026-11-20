# Tasks

## 1. Inventory and map

- [ ] 1.1 Inventory every place that saves a file, copies to the clipboard or opens a data door (search the web app for the file port, the clipboard port and the dialogs), write `docs/export-map.md` (entry point, content, format, icon, wording, rights, destination door) and the target map of three doors; verify the document lists every hit of the search, `pnpm docs:check`, and that the owner approves the map in the pull request before group 2 starts

## 2. One save path

- [ ] 2.1 Shared `ExportAction.vue` and one file-type icon set (name, format, size, preview, encrypted or not, success and error messages, keyboard path), file names `<board>-<date>.<ext>`; verify unit tests of the naming and component tests of the states, the design token test, axe, and a guard test that fails when a component calls the file-save port outside the shared action
- [ ] 2.2 Migrate the export hub, the report, the settings file and the team file to `ExportAction` without changing any file content; verify that the exporters' snapshot tests and the existing export e2e specs pass unchanged apart from their entry points

## 3. Three doors

- [ ] 3.1 Export dialog: the report as a destination of the hub (no second dialog), "actions only" as a filter on every destination, the board file and its restore in the same dialog; verify e2e of each destination, the pseudo-locale overflow check and the phone to TV layouts
- [ ] 3.2 "My data" in Profile: settings, teams (file and link moved from `TeamShare.vue`), the library, and a slot for the sealed vault file of `sync-ux`; the recovery key stays in Sync; verify e2e (export and import settings, export and open a team file, the old team entry points redirect for one release) and axe
- [ ] 3.3 Share dialog carries people and links only; old entry points removed or turned into a link to their new place, shortcuts and `data-testid` hooks migrated; verify the whole e2e suite for changed hooks and `pnpm e2e:core`

## 4. Guide and open changes

- [ ] 4.1 Guide chapters on exporting and teams updated (fr and en), manifest, `pnpm docs:tour && pnpm docs:guide`; update the task text of `export-destinations-v2` and `local-data-durability` 2.2 to name the door each uses; verify `pnpm docs:check` and `openspec validate --all --strict`
