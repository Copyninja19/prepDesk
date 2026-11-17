# Prep Desk

Prep Desk is a study workspace for tasks, a focus timer, activity, exams, syllabus progress, and meal logging. The frontend uses HTML, CSS, and JavaScript. The hosted Worker uses the existing Sites sign-in and D1 database.

## Windows setup and checks

Open PowerShell in the extracted folder. Use Node.js 24 or later for the SQLite-backed tests. The build and guest-only static preview have no npm dependencies.

```powershell
node scripts/build.mjs
node --test tests/worker.test.mjs
node tests/preview.mjs --serve
```

Open [the local preview](http://127.0.0.1:8080/). The local server uses temporary in-memory SQLite data. To test authenticated paths locally, open [test account Alice](http://127.0.0.1:8080/__test_signin?actor=alice) or [test account Bob](http://127.0.0.1:8080/__test_signin?actor=bob) in separate browser profiles. The preview sign-in endpoint exists only in the local test server. Stop the server with Ctrl+C.

To run the browser tests with installed Microsoft Edge:

```powershell
npm.cmd install --prefix "$env:TEMP/prepdesk-browser" --no-audit --no-fund playwright-core
$env:PREP_DESK_PLAYWRIGHT = "$env:TEMP/prepdesk-browser/node_modules/playwright-core"
node --test tests/browser.mjs
```

Set `PREP_DESK_EDGE` to the absolute Edge executable path if Edge is installed outside its default location. The tests start and stop their own loopback server.

## Drafts, recovery, and privacy

The browser stores pending edits under the authenticated account's Site-specific scope. The current tab resumes its draft after reload. Other drafts can be found in the recovery panel. Use Retry sync after connectivity returns. If a write committed but the response went missing, replaying the same request acknowledges it while it remains the most recent write. If another write followed it, Prep Desk compares the saved snapshot and keeps a draft when recovery is ambiguous.

If both the saved workspace and draft differ, download both versions before choosing which snapshot to keep. Recovery uses whole workspace snapshots so a record deletion, task reorder, or subject-and-exam edit cannot be silently reversed by a merge. A replacement is conditional on the reviewed revision. A further concurrent save brings the recovery choices back.

Profile can export the synced records and browser drafts, delete the synced workspace, or clear guest records in that browser. A small account-keyed revision and generation marker remains in D1 after deletion to reject stale writes. Older drafts on other browsers can be downloaded or discarded there. Deletion covers current Prep Desk records and this browser's drafts. Downloaded exports, the ChatGPT account, and any provider-managed backups fall outside these controls. Drafts and guest data use browser storage. Use separate browser profiles on shared devices, and clear site data when appropriate. Inter is served with the app under the included OFL license. The optional dietary-reference link opens an external site only when selected.

## Deploy this private release from a Sites-enabled session

The existing project is `appgprj_6afbd470f37c81919ef6139f45bd63c3`, with D1 binding `DB`. Keep the current non-public access policy. The clean release ZIP is for source handoff. The Sites deployment archive comes from the verified remote checkout.

1. In an empty writable folder, resolve and check the source endpoint with `Resolve-DnsName git.chatgpt-team.site -DnsOnly` and `Test-NetConnection git.chatgpt-team.site -Port 443`. If sandbox DNS blocks Git, run the repository workflow in a network-enabled Sites session. Avoid reinitializing the deployment under a new project.
2. Use Sites `get_site` to confirm the existing project and non-public audience, then `create_source_repository_write_credential`. Run the bundled workflow helper from the empty folder, substituting the installed Sites plugin root:

   ```powershell
   node "<sites-plugin-root>/scripts/site-workflow.mjs" --project-id appgprj_6afbd470f37c81919ef6139f45bd63c3
   ```

   When prompted, supply `{"credential": <returned credential object>}` through the helper's hidden stdin. Keep the returned opening result. Never put credentials into shell text, files, or the archive.
3. Overlay `web`, `worker`, `scripts`, `drizzle`, `tests`, `.openai/hosting.json`, `.gitignore`, and `README.md` from the release source into the returned checkout. Review `git diff` and untracked files. Run the Windows checks above from that checkout.
4. Run the same helper again. Supply JSON with `credential`, `source` (the entire opening result), `commands` set to `[["node","scripts/build.mjs"],["node","--test","tests/worker.test.mjs"]]`, and `archivePath` set to an absolute `.tar.gz` path outside the checkout. The helper builds and pushes source and prepares the archive. Sites applies the pending D1 migration before uploading the Worker. If deployment fails after migration, inspect deployment status and migration state before editing migration history.
5. For this project's custom private audience, call Sites `save_site_version` with the returned commit SHA and archive, then `deploy_site_version` with the returned version ID. Preserve the current sharing settings. Check `get_deployment_status` until terminal if needed, then confirm the Site's audience and run the hosted checks below.

Direct Google sign-in requires either a Sites-supported Google identity provider that produces the trusted Sites identity or a separately designed hosting and identity migration. Google OAuth credentials alone do not grant access through the private Sites gateway. Users who created their ChatGPT account with Google can authenticate through ChatGPT using that account. See [OpenAI's Sites sign-in and sharing guide](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites).

## Hosted acceptance and public launch

1. Open the deployed URL in two separate browser profiles with authorized test accounts A and B. Confirm a signed-out browser cannot open the private Site. Within an authorized browser, open `/?guest=1` to verify guest mode works independently of account data.
2. In A, create a uniquely named task, syllabus item, and meal. Check that A sees them in a second browser and B sees none of them. Create a different task in B and confirm it only appears in B.
3. With two A tabs on the same revision, save a change in one and edit or delete the same record in the other. Confirm recovery appears, download both snapshots, then discard the stale draft to recover the synced version. Repeat after taking the draft tab offline and reloading once the site is reachable.
4. Export A’s test data and verify its contents. Delete A’s sacrificial test workspace while a stale A tab is open, then attempt a save in the stale tab. Confirm it can only download or discard the old draft and B’s records remain intact. Verify guest clear leaves A and B’s synced data alone.
5. On Android, check Chrome’s Install or Add to Home screen action and launch the icon. On iPhone, use Safari’s Share > Add to Home Screen and launch the icon. Confirm navigation, sign-in and sync, and light/dark appearance. Local desktop emulation covers viewport layout and manifest assets. Physical install prompts and standalone launch need real devices.
6. Before opening public access, complete the hosted checks, review the in-app privacy text and any public privacy disclosure for your audience, and confirm workspace admin policy allows public Sites. In Sites, use Share > Who has access > Anyone on the internet only when ready. Verify anonymous users land on the app sign-in page and guest mode works in a fresh signed-out browser. Recheck that workspace API access requires authentication. Restore the prior private audience if acceptance fails.
