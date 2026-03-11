# Changelog

All notable changes to this project will be documented in this file.

## [1.3.3] - 2026-03-11
### Added
- **Phase-Locked Metronome**: Metronome is now synchronized with the actual musical position in the score. Starting playback mid-bar correctly identifies the current beat, eliminating "always starts on beat 1" behavior.
- **Compound Meter Support (3/8, 6/8, 9/8, 12/8)**: Intelligent pulse grouping for compound time signatures. In "quarters" mode, the metronome clicks on each dotted quarter (every 3 eighths). In "eighths" mode, it plays [accent, soft, soft] per pulse group.
- **Sixteenth Note Pattern**: New "16-е" rhythm option with 4 subdivisions per beat (simple meters) or 6 per pulse (compound meters), with hierarchical accents.
- **Collapsible Session Playlist**: The playlist panel on the right can now be collapsed during sessions to maximize notation display space.

### Improved
- **Metronome Reliability**: Rewrote `AudioContext` lifecycle management to prevent metronome from failing to start. Added `stop()` before every `start()` to prevent double-scheduling.
- **Metronome Volume**: Increased base volume factor (0.25) and accent multipliers for better audibility over instruments.
- **Bar Detection**: Fixed MasterBar lookup — AlphaTab's MasterBar has no `length` property, so replaced `.find()` with reverse iteration to correctly identify the current bar.
- **Time Signature Reading**: Metronome now reads the actual `timeSignatureNumerator` and `timeSignatureDenominator` from the current bar instead of always using the first bar's values.

### Fixed
- **Installer**: Changed to one-click installation (`oneClick: true`). User data is now preserved on uninstall by default, with an interactive prompt offering cleanup.

## [1.3.0] - 2026-03-02
### Added
- **Course and Library Pack Imports**: Dedicated UI buttons for importing Courses and Library Packs directly from the app.
- **Strict Course Format**: New `.gcourse` file extension for multi-day programs to differentiate them from `.gpack` library files.
- **Automatic Course Routing**: The backend automatically detects course metadata and routes imported courses to their proper location.


## [1.2.0] - 2026-02-23
### Added
- **REAPER Integration Migration**: Deep integration with REAPER for session management, tracking volume, and track colors.
- **Theory Module Enhancements**: Mandatory key validation for imports and automated folder-based tagging.
- **Improved Routine Generation**: Support for advanced selection strategies (Folder, Key, Tag) and fixed library scanning bugs.
- **Smart Catalog**: Automated metadata normalization ensuring consistent musical key management.

## [1.1.0] - 2026-02-23
### Added
- GitHub Release Automation setup.
- Professional NSIS Installer with customization options.
- Version display in the Sidebar.
- Improved data persistence logic for installed versions.
- AlphaTab support (from roadmap).

## [1.0.0] - 2026-02-21
### Added
- Initial release.
- Base Reaper + GP support.
- Portable build mode.
