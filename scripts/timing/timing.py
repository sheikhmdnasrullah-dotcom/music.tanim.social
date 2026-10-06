"""Derive syllable-level timings aligned to the actual guide-vocal audio.

Pipeline per section:
  1. Parse the section MIDI (note count == syllable count, verified).
  2. Group notes into lyric lines by syllable counts.
  3. Detect breath silences in the vocal audio.
  4. Grid-search a global time-scale, then DP-pick the (nLines-1) silences that
     make every line's audio length proportional to its MIDI length, while
     strongly preferring the longest (inter-line) breaths.
  5. Inside each line, DP-select exactly K syllable onsets from a permissive
     candidate set, scored by onset strength + deviation from the MIDI rhythm
     shape. Fall back to linear stretch when candidates are too sparse.
"""
import struct, json, sys, os, re, subprocess
import numpy as np, librosa, warnings
warnings.filterwarnings('ignore')

HOP = 256
SR = 22050

# ---------------------------------------------------------------- MIDI ----
def read_varlen(d, i):
    v = 0
    while True:
        b = d[i]; i += 1
        v = (v << 7) | (b & 0x7f)
        if not (b & 0x80): break
    return v, i

def parse_midi(path):
    d = open(path, 'rb').read()
    i = 14; tempo = 500000; notes = []
    while i < len(d):
        if d[i:i+4] != b'MTrk': break
        ln = struct.unpack('>I', d[i+4:i+8])[0]
        end = i + 8 + ln; j = i + 8; tick = 0; status = 0; pending = {}
        while j < end:
            delta, j = read_varlen(d, j); tick += delta
            b = d[j]
            if b & 0x80: status = b; j += 1
            if status == 0xFF:
                mtype = d[j]; j += 1
                l, j = read_varlen(d, j); data = d[j:j+l]; j += l
                if mtype == 0x51: tempo = int.from_bytes(data, 'big')
            elif status in (0xF0, 0xF7):
                l, j = read_varlen(d, j); j += l
            else:
                hi = status & 0xF0
                if hi in (0x80, 0x90, 0xA0, 0xB0, 0xE0):
                    d1 = d[j]; d2 = d[j+1]; j += 2
                    if hi == 0x90 and d2 > 0:
                        pending.setdefault(d1, []).append((tick, d2))
                    elif hi == 0x80 or (hi == 0x90 and d2 == 0):
                        if pending.get(d1):
                            st, vel = pending[d1].pop(0)
                            notes.append((st, tick, d1, vel))
                elif hi in (0xC0, 0xD0):
                    j += 1
        i = end
    spt = tempo / 1e6 / struct.unpack('>H', d[12:14])[0]
    notes.sort()
    return [(st*spt, en*spt, p) for st, en, p, v in notes]

# ---------------------------------------------------------------- silence --
def silences(path, noise_db=-34, min_dur=0.2):
    p = subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',path,
                        '-af',f'silencedetect=noise={noise_db}dB:d={min_dur}',
                        '-f','null','-'], capture_output=True, text=True)
    starts = [float(m) for m in re.findall(r'silence_start: ([\d.]+)', p.stderr)]
    ends   = [float(m) for m in re.findall(r'silence_end: ([\d.]+)', p.stderr)]
    out = []
    for k, s in enumerate(starts):
        e = ends[k] if k < len(ends) else None
        if e is None: continue
        if s <= 0.02: continue            # leading silence
        out.append((s, e))
    return out

def group_lines(notes, counts):
    lines, i = [], 0
    for c in counts:
        lines.append(notes[i:i+c]); i += c
    if i != len(notes):
        raise SystemExit(f"midi/syllable count mismatch: {i} != {len(notes)}")
    return lines

# ------------------------------------------------- separator selection ----
def fit_separators(sils, seg_units, audio_dur):
    """seg_units: relative length of each lyric line (MIDI seconds, or syllable count)."""
    cand = [(s, e) for (s, e) in sils if (e - s) >= 0.18]
    L = len(seg_units)
    need = L - 1
    if need == 0:
        return [], audio_dur / max(seg_units[0], 1e-6)
    if not cand:
        raise SystemExit("no candidate silences")

    m_seg = [float(x) for x in seg_units]
    scale0 = audio_dur / max(sum(m_seg), 1e-6)

    def spen(dur):                       # prefer inter-line breaths (~0.55s+)
        return 3.0 * max(0.0, 0.55 - dur)

    def solve(scale):
        C = len(cand); INF = float('inf')
        dp  = [[INF]*C for _ in range(need+1)]
        par = [[-1]*C for _ in range(need+1)]
        for c, (s, e) in enumerate(cand):
            adur = s
            if adur <= 0.08: continue
            dp[1][c]  = (adur - scale*m_seg[0])**2 + spen(e-s)
            par[1][c] = -1
        for k in range(2, need+1):
            for c in range(C):
                s, e = cand[c]
                best, bpar = INF, -1
                for p in range(c):
                    ps, pe = cand[p]
                    if dp[k-1][p] == INF: continue
                    adur = s - pe
                    if adur <= 0.08: continue
                    cost = dp[k-1][p] + (adur - scale*m_seg[k-1])**2 + spen(e-s)
                    if cost < best: best, bpar = cost, p
                dp[k][c], par[k][c] = best, bpar
        best, bsel = INF, -1
        for c in range(C):
            if dp[need][c] == INF: continue
            s, e = cand[c]
            adur = audio_dur - e
            if adur <= 0.08: continue
            cost = dp[need][c] + (adur - scale*m_seg[-1])**2
            if cost < best: best, bsel = cost, c
        if bsel < 0: return None, None
        picks, c = [], bsel
        for k in range(need, 0, -1):
            picks.append(cand[c]); c = par[k][c]
        picks.reverse()
        return best, picks

    best_scale, best_cost, best_picks = scale0, None, None
    for scale in scale0 * np.arange(0.35, 2.0, 0.02):
        cost, picks = solve(float(scale))
        if picks is None: continue
        if best_cost is None or cost < best_cost:
            best_cost, best_picks, best_scale = cost, picks, float(scale)
    if best_picks is None:
        raise SystemExit("separator fit failed")
    return best_picks, best_scale

# ------------------------------------------------------- onset selection --
def onset_env(y, lo, hi):
    seg = y[int(lo*SR):int(hi*SR)]
    if len(seg) < SR//6: return None, 0.0
    env = librosa.onset.onset_strength(y=seg, sr=SR, hop_length=HOP)
    t = librosa.times_like(env, sr=SR, hop_length=HOP) + lo
    m = env.max()
    if m <= 0: return None, 0.0
    return (t, env/m), m

def candidates(env, merge=7, nmin=0.03):
    """Permissive local maxima as candidate syllable onsets."""
    out = [i for i in range(1, len(env)-1)
           if env[i] >= env[i-1] and env[i] > env[i+1] and env[i] >= nmin]
    keep = []
    for i in out:
        if keep and (i - keep[-1]) < merge:
            if env[i] > env[keep[-1]]: keep[-1] = i
        else:
            keep.append(i)
    return keep

def select_onsets(y, a0, a1, m_on, m_off):
    """Pick exactly K onsets in [a0,a1) scored by strength + MIDI-shape fit."""
    K = len(m_on)
    oe, _ = onset_env(y, a0, a1)
    if oe is None: return None, 0
    t, env = oe
    ms, me = m_on[0], m_off[-1]
    span_m = max(me - ms, 1e-6)
    span_a = max(a1 - a0, 1e-6)
    # target audio time for each midi note under a linear map
    tgt = a0 + (np.asarray(m_on) - ms) * (span_a/span_m)

    cands = candidates(env, merge=7, nmin=0.03)
    if len(cands) < K: return None, len(cands)

    INF = float('inf')
    n = len(cands)
    cidx = np.array(cands)
    cenv = env[cidx]
    W_STR, W_ANCH = 0.5, 60.0
    dev = ((t[cidx][None, :] - tgt[:, None]) / span_a) ** 2   # (K, n)

    dp  = [[INF]*n for _ in range(K+1)]
    par = [[-1]*n for _ in range(K+1)]
    for c in range(n):
        if n - c < K: continue                       # too few picks left
        dp[1][c] = -W_STR*cenv[c] + W_ANCH*dev[0, c]
        par[1][c] = -1
    for k in range(2, K+1):
        for c in range(n):
            if n - c < K - k: continue
            best, bpar = INF, -1
            for p in range(k-2, c):
                if dp[k-1][p] == INF: continue
                cost = dp[k-1][p] - W_STR*cenv[c] + W_ANCH*dev[k-1, c]
                if cost < best: best, bpar = cost, p
            dp[k][c], par[k][c] = best, bpar
    best, bsel = INF, -1
    for c in range(n):
        if dp[K][c] == INF: continue
        if dp[K][c] < best: best, bsel = dp[K][c], c
    if bsel < 0: return None, len(cands)
    sel, c = [], bsel
    for k in range(K, 0, -1):
        sel.append(c); c = par[k][c]
    sel.reverse()
    starts = t[cidx[np.array(sel)]].astype(float)
    if np.any(np.diff(starts) <= 0): return None, len(cands)
    return starts, len(cands)

def build(midi_path, audio_path, counts):
    notes = parse_midi(midi_path)
    y, _ = librosa.load(audio_path, sr=SR, mono=True)
    audio_dur = len(y)/SR
    sils = silences(audio_path)
    midi_lines = group_lines(notes, counts)
    seg_units = [ln[-1][1] - ln[0][0] for ln in midi_lines]
    seps, scale = fit_separators(sils, seg_units, audio_dur)

    spans, cur = [], 0.0
    for (s, e) in seps:
        spans.append((cur, s)); cur = e
    spans.append((cur, audio_dur))

    result, diag = [], []
    for li, (mnotes, (a0, a1)) in enumerate(zip(midi_lines, spans)):
        m_on  = [n[0] for n in mnotes]
        m_off = [n[1] for n in mnotes]
        K = len(mnotes)
        ms, me = m_on[0], m_off[-1]
        lin = lambda tt: a0 + (tt - ms) * ((a1 - a0)/max(me - ms, 1e-6))

        starts, nc = select_onsets(y, a0, a1, m_on, m_off)
        mode = 'onsets' if starts is not None else f'linear(nc={nc})'
        if starts is None:
            starts = np.array([lin(tt) for tt in m_on])
        # ends: next start, or mapped midi off, clipped to line end
        ends = []
        for i in range(K):
            if i < K-1:
                e = float(starts[i+1])
            else:
                e = float(lin(m_off[-1]))
            e = max(e, float(starts[i]) + 0.06)
            ends.append(min(e, a1))
        ends = np.array(ends, dtype=float)
        for i in range(1, K):
            if starts[i] <= starts[i-1]:
                starts[i] = starts[i-1] + 0.01
            ends[i-1] = min(ends[i-1], float(starts[i]))
            ends[i-1] = max(ends[i-1], float(starts[i-1]) + 0.06)
        ends[-1] = max(ends[-1], float(starts[-1]) + 0.06)

        for i in range(K):
            result.append(dict(line=li, i=i,
                               start=round(float(starts[i]),3),
                               end=round(float(ends[i]),3),
                               midi=int(mnotes[i][2]),
                               m_start=round(mnotes[i][0],3),
                               m_end=round(mnotes[i][1],3)))
        diag.append(dict(line=li, span=[round(a0,3), round(a1,3)],
                         midi=[round(ms,3), round(me,3)],
                         cands=nc, expected=K, mode=mode))
    return dict(audio_duration=round(audio_dur,3), scale=round(scale,4),
                separators=[[round(s,3), round(e,3)] for s, e in seps],
                lines=diag, notes=result)

if __name__ == '__main__':
    midi_path, audio_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    counts = [int(x) for x in sys.argv[4].split(',')]
    r = build(midi_path, audio_path, counts)
    json.dump(r, open(out_path, 'w'), indent=1)
    print(os.path.basename(audio_path), '| audio', r['audio_duration'], '| scale', r['scale'],
          '| seps', r['separators'])
    for l in r['lines']:
        print(f"   line{l['line']:>2} span {str(l['span']):>22}  midi {str(l['midi']):>20}  cands {l['cands']:>3}/{l['expected']} {l['mode']}")
