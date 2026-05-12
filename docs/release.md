# Release Process

Use this checklist when preparing a Chrome Web Store release.

## 1. Prepare the Version

1. Choose the release version.
2. Update `version` in both [package.json](../package.json) and [manifest.json](../manifest.json).
3. Update release notes or changelog if the project adds one.

## 2. Verify Locally

Run the full verification pipeline:

```sh
npm run check
```

Then build the extension:

```sh
npm run build
```

Load `dist/` as an unpacked extension in Chrome and manually verify:

- ABC blocks are detected.
- Scores render below matching code blocks.
- Playback initializes and uses the expected soundfont host.
- Popup settings still work.
- No unexpected console errors appear in the content page, popup, or service worker.

## 3. Review Store Requirements

Before upload, confirm:

- Icons exist at all required sizes.
- `manifest.json` permissions are minimal and justified.
- [PRIVACY.md](../PRIVACY.md) matches the actual extension behavior.
- The Chrome Web Store listing explains soundfont network requests.
- No private keys, `.env` files, local builds, or unrelated artifacts are included.

## 4. Package

Create the upload archive from the contents of `dist/`:

```sh
cd dist
zip -r ../chatmusic-vX.Y.Z.zip .
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