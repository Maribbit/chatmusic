# Release Process

Use this checklist when preparing a Chrome Web Store release.

## 1. Prepare the Version

1. Choose the release version using numeric `X.Y.Z` format.
2. Update `version` in both [package.json](../package.json) and [manifest.json](../manifest.json).
3. Move relevant [CHANGELOG.md](../CHANGELOG.md) entries from `Unreleased` into a dated release heading.
4. Run `npm run version:check` and fix any mismatch before building.

Chrome extension versions must be one to four dot-separated integers. This project uses synchronized `X.Y.Z` versions for both npm metadata and the Chrome manifest. Do not use npm prerelease strings such as `1.2.3-beta.1` in `manifest.json`.

## 2. Verify Locally

Run the full verification pipeline:

```sh
npm run check
```

Then build the extension:

```sh
npm run build
```

Load `dist/` as an unpacked extension in Chrome and run the [manual QA checklist](manual-qa.md), including:

- ABC blocks are detected.
- Scores render below matching code blocks.
- Playback initializes using bundled piano soundfont samples.
- Popup settings still work.
- No unexpected console errors appear in the content page, popup, or service worker.
- [CHANGELOG.md](../CHANGELOG.md) describes the release in user-facing language.

## 3. Review Store Requirements

Before upload, confirm:

- Icons exist at all required sizes.
- `manifest.json` permissions are minimal and justified.
- [PRIVACY.md](../PRIVACY.md) matches the actual extension behavior.
- Bundled soundfont attribution is included and matches [public/THIRD_PARTY_NOTICES.txt](../public/THIRD_PARTY_NOTICES.txt).
- No private keys, `.env` files, local builds, or unrelated artifacts are included.

## 4. Package

Create the upload archive from the contents of `dist/`:

```sh
npm run release:package
```

The zip file is ignored by Git and should not be committed.

## 5. Publish

1. Upload the zip to the Chrome Web Store Developer Dashboard.
2. Complete the privacy and permission questionnaires.
3. Submit for review.
4. After approval, tag the release in Git if the repository is public:

```sh
git tag vX.Y.Z
git push origin main --tags
```

Do not create tags or publish packages from an AI-assisted session unless the user explicitly requests it.