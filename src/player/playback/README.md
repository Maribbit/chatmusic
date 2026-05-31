# Player Playback

This folder contains playback-adjacent logic that can be tested without rendering the full player view.

Use this folder for abcjs synth setup, playback progress seeking, tempo calculations, duration formatting and warp math, local soundfont asset setup, source-highlight range mapping, abcjs timing-event lookup, score/keyboard highlight synchronization, and small helpers around abcjs audio behavior. UI controls that display or mutate playback state belong in `../components/`.