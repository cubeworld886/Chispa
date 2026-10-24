# Chispa local snapshot

This folder restores the exact 2026-10-24 local Chispa worktree. All 75 source files are stored under `overlay/` with exact bytes, including files whose Git blobs already match `main`; Git reuses identical blob objects. The project tree at `main` remains unchanged.

- Source files: 75
- Source bytes: 75,469,669
- Files identical to their `main` blobs: 66 (deduplicated by Git)
- Files differing from their `main` blobs: 9
- Manifest: `MANIFIESTO_SHA256.json`

From the repository root, restore the 75-file local worktree with:

```powershell
.\backup-sources\chispa-local-20261024\RESTORE_CHISPA.ps1 -Destination .\Chispa-restored
```

The script verifies SHA-256 and size before and after copying, and refuses a non-empty destination. The snapshot `.gitattributes` disables line-ending conversion for overlay files.

Historical package archive: `archive-original/Chispa.zip` is the exact original distribution ZIP, SHA-256 verified, with a separate member manifest. It is a distinct variant: 61 files and 15 directory entries; 41 files match the current snapshot, 19 differ, 15 current files are absent, and it adds `assets/cosmic/cosmic-event.wav`. CRC passed; no Yuli name/text hit, risky filename, or credential-pattern hit was found.
