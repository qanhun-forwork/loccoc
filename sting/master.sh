#!/usr/bin/env bash
# Master raw.wav to -14 LUFS integrated, -1 dBTP, 60 ms tail fade, exactly 12.075 s.
set -euo pipefail
cd "$(dirname "$0")"
python3 audio.py
m=$(ffmpeg -hide_banner -i raw.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$m" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -hide_banner -loglevel error -i raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset),aresample=48000,alimiter=limit=0.84:level=false:attack=1:release=40,afade=t=out:st=12.015:d=0.06,atrim=0:12.075" -ar 48000 -c:a pcm_s24le music.wav
ffmpeg -hide_banner -i music.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|Peak:)"
