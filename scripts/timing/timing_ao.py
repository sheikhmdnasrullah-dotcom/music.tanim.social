"""Audio-only timing derivation for sections that have no MIDI reference.

Same pipeline as timing.py, but line boundaries are fitted against syllable
counts (content length ~ syllables) and syllable onsets use a uniform-spacing
anchor instead of a MIDI rhythm anchor.
"""
import json, sys, os
import numpy as np, librosa
import timing as T


def build_audio_only(audio_path, counts):
    y, _ = librosa.load(audio_path, sr=T.SR, mono=True)
    audio_dur = len(y)/T.SR
    sils = T.silences(audio_path)
    seg_units = [float(c) for c in counts]
    seps, scale = T.fit_separators(sils, seg_units, audio_dur)

    spans, cur = [], 0.0
    for (s, e) in seps:
        spans.append((cur, s)); cur = e
    spans.append((cur, audio_dur))

    result, diag = [], []
    for li, (K, (a0, a1)) in enumerate(zip(counts, spans)):
        m_on  = np.arange(K, dtype=float)
        m_off = np.arange(K, dtype=float) + 1.0
        starts, nc = T.select_onsets(y, a0, a1, m_on, m_off)
        mode = 'onsets' if starts is not None else f'linear(nc={nc})'
        span_a = max(a1 - a0, 1e-6)
        if starts is None:
            starts = a0 + (np.arange(K) + 0.5) * (span_a/K)
        starts = np.asarray(starts, dtype=float)
        ends = np.empty(K)
        for i in range(K):
            ends[i] = starts[i+1] if i < K-1 else a1
        ends = np.maximum(ends, starts + 0.06)
        ends = np.minimum(ends, a1)
        for i in range(1, K):
            if starts[i] <= starts[i-1]:
                starts[i] = starts[i-1] + 0.01
            ends[i-1] = min(ends[i-1], float(starts[i]))
            ends[i-1] = max(ends[i-1], float(starts[i-1]) + 0.06)
        ends[-1] = max(ends[-1], float(starts[-1]) + 0.06)
        for i in range(K):
            result.append(dict(line=li, i=i,
                               start=round(float(starts[i]), 3),
                               end=round(float(ends[i]), 3)))
        diag.append(dict(line=li, span=[round(a0, 3), round(a1, 3)],
                         cands=nc, expected=K, mode=mode))
    return dict(audio_duration=round(audio_dur, 3), scale=round(scale, 4),
                separators=[[round(s, 3), round(e, 3)] for s, e in seps],
                lines=diag, notes=result)


if __name__ == '__main__':
    audio_path, out_path = sys.argv[1], sys.argv[2]
    counts = [int(x) for x in sys.argv[3].split(',')]
    r = build_audio_only(audio_path, counts)
    json.dump(r, open(out_path, 'w'), indent=1)
    print(os.path.basename(audio_path), '| audio', r['audio_duration'],
          '| scale/syl', r['scale'], '| seps', r['separators'])
    for l in r['lines']:
        print(f"   line{l['line']:>2} span {str(l['span']):>22}  cands {l['cands']:>3}/{l['expected']} {l['mode']}")
