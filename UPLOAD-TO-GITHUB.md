# How to put KIRO on GitHub

You need a free GitHub account. Pick ONE way.

## Way 1: one double-click (easiest, keeps everything in order)
1. Install Git once: https://git-scm.com/downloads
2. On GitHub: click **New repository**, type a name (for example `kiro-platform`), leave **Add a README** unticked, click **Create repository**. Copy the address it shows (it ends with `.git`).
3. Unzip the download. Open the `kiro-platform` folder.
   - **Windows:** double-click `push-to-github.bat`.
   - **Mac/Linux:** open Terminal in the folder and run `bash push-to-github.sh`.
4. Paste the address when it asks. If GitHub asks you to sign in, do so. If it asks for a password, paste a **personal access token** (GitHub > Settings > Developer settings > Personal access tokens). Normal account passwords no longer work for this.
5. Open the repository page. Everything is there.

## Way 2: upload in the browser (no Git needed)
GitHub's web page takes at most 100 files at a time, so the files are split into 3 batches in the `browser-upload` folder.
1. Create the repository as above, but this time tick **Add a README** (this gives you a page to start from).
2. Click **Add file > Upload files**. Open `batch-1`, select everything inside it and drag it onto the page. Wait for it to finish, then click **Commit changes**.
3. Repeat with `batch-2`, then `batch-3`.
4. Folders keep their structure when you drag them.

**Hidden files:** some files start with a dot (`.gitignore`, `.env.example`). Your computer may hide them, and they would be skipped. On Mac press **Cmd + Shift + .** in Finder. On Windows open **View > Show > Hidden items**. Without `.gitignore`, secret files could be uploaded by mistake later, so make sure it goes up.

## Before you make the repository public
- Check that no real password or key is in any file (there is none now; all keys are listed in `docs/CREDENTIALS.md` and go in server settings, not here).
- Add a `LICENSE` file.
- Prefer a **private** repository until you are ready.
