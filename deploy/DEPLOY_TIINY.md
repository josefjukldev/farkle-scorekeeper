# Deploy Dices with Friends on tiiny.host

You need only the file `dices-with-friends-static.zip` (about 0.5 MB). It is a ready production build. No Node.js or terminal is needed.

## 1. Upload
1. Open https://tiiny.host and choose to upload a file or folder (a zip is fine).
2. Select `dices-with-friends-static.zip`. Do **not** unzip it first and do not zip it again.
   `index.html` is at the top of the zip, which is what the host needs.
3. Pick a link name and publish.
4. Open the https link they give you.

## 2. Check that it works (2 minutes)
On your phone, open the link in Chrome (Android) or Safari (iPhone).
- [ ] The Czech home screen "Dices with Friends" appears. Settings > English switches the language.
- [ ] New game > two names > Start game > Start turn > tap `3×4` then `1`: BANK turns blue.
- [ ] Close the tab mid-turn and reopen the link. The turn is restored.
- [ ] Offline: open the link once, switch on airplane mode, reload. The app still opens.
- [ ] Install: Chrome menu > "Install app" / "Add to Home screen". Safari: Share > "Add to Home Screen".
- [ ] After a finished game > Archive game > Share: the image is shared or downloaded.

If install or offline mode does not work but the game does, the host probably does not serve `sw.js` or `manifest.webmanifest` correctly. The app still works online; see Troubleshooting.

## 3. Share it with testers
Send the link. Everyone's games stay on their own phone, so testers never see each other's data. Anyone who has the link can open the app; check the privacy and password options of your tiiny.host plan if you want to restrict it.

## 4. Update to a new version
```
npm install            # once
npm run package        # builds and creates deploy/dices-with-friends-static.zip
```
Upload the new zip to the same link (replace the site on tiiny.host). Phones that already installed the app show a "New version available · Reload" banner. Saved games are not touched by an update.

## Troubleshooting
| Symptom | Fix |
|---------|-----|
| White page or 404 | The zip was probably nested in a folder. Zip the **contents** of `dist`, not the folder itself (`npm run package` does this). |
| Old version after an update | Close the app fully and reopen, or tap "Reload" in the update banner. Chrome: Settings > Site settings > clear data for the site (this deletes the games on that phone, so export a backup first). |
| No "Install app" option | The page must be opened over https (tiiny.host links are). Try Chrome on Android; iPhone only offers "Add to Home Screen" in Safari. |
| Location or share does not work | Both need https and your permission. They are optional; the game works without them. |
| Games disappeared | Browsers can clear site data when storage is low. Settings > Export file makes a backup that Import restores. |

## Alternatives with the same zip
Netlify (drag the unzipped folder onto the Netlify Drop page) and Cloudflare Pages work the same way and need no changes.
