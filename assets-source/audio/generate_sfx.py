#!/usr/bin/env python3
"""Generate Party Night procedural SFX as 44.1 kHz / 16-bit / mono WAV files.

Compatible with Python 3.9.x. Requires NumPy and SciPy.
"""

from pathlib import Path
import argparse

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, chirp, sosfilt

SAMPLE_RATE = 44100
SEED = 20260810


def _bandpass(signal, low_hz, high_hz):
    sos = butter(3, [low_hz, high_hz], btype="bandpass", fs=SAMPLE_RATE, output="sos")
    return sosfilt(sos, signal)


def _finalize(signal):
    signal = np.asarray(signal, dtype=np.float64)
    peak = float(np.max(np.abs(signal))) if signal.size else 0.0
    if peak > 0.0:
        signal = signal / peak
    signal = np.tanh(signal * 1.15) / np.tanh(1.15)
    signal *= 0.82

    fade_in = min(signal.size, int(SAMPLE_RATE * 0.0015))
    fade_out = min(signal.size, int(SAMPLE_RATE * 0.012))
    if fade_in > 1:
        signal[:fade_in] *= np.linspace(0.0, 1.0, fade_in, endpoint=True)
    if fade_out > 1:
        signal[-fade_out:] *= np.linspace(1.0, 0.0, fade_out, endpoint=True)

    return np.int16(np.clip(signal, -1.0, 1.0) * 32767)


def make_footstep(rng):
    duration = 0.24
    count = int(SAMPLE_RATE * duration)
    t = np.arange(count, dtype=np.float64) / SAMPLE_RATE

    thump = chirp(t, f0=105.0, f1=58.0, t1=duration, method="quadratic")
    thump *= np.exp(-t * 18.0) * 0.86

    grit = _bandpass(rng.standard_normal(count), 190.0, 1450.0)
    grit *= np.exp(-t * 24.0) * 0.30

    sole = _bandpass(rng.standard_normal(count), 850.0, 3200.0)
    sole *= np.exp(-t * 55.0) * 0.12

    # Small secondary sole contact keeps the sound readable on phone speakers.
    offset = int(SAMPLE_RATE * 0.055)
    secondary = np.zeros(count, dtype=np.float64)
    if offset < count:
        tail_t = t[: count - offset]
        secondary[offset:] = 0.15 * np.sin(2.0 * np.pi * 135.0 * tail_t) * np.exp(-tail_t * 38.0)

    return _finalize(thump + grit + sole + secondary)


def make_hit(rng):
    duration = 0.18
    count = int(SAMPLE_RATE * duration)
    t = np.arange(count, dtype=np.float64) / SAMPLE_RATE

    body = chirp(t, f0=150.0, f1=62.0, t1=duration, method="quadratic")
    body *= np.exp(-t * 22.0) * 0.82

    crack = _bandpass(rng.standard_normal(count), 420.0, 5200.0)
    crack *= np.exp(-t * 34.0) * 0.42

    snap = _bandpass(rng.standard_normal(count), 2600.0, 8200.0)
    snap *= np.exp(-t * 95.0) * 0.17

    return _finalize(body + crack + snap)


def write_outputs(output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)
    outputs = {
        "footstep.wav": make_footstep(rng),
        "hit.wav": make_hit(rng),
    }
    for filename, samples in outputs.items():
        wavfile.write(str(output_dir / filename), SAMPLE_RATE, samples)
        print("wrote {} ({} samples, {:.3f}s)".format(
            output_dir / filename,
            len(samples),
            len(samples) / float(SAMPLE_RATE),
        ))


def main():
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description="Generate Party Night procedural WAV SFX")
    parser.add_argument(
        "--output",
        type=Path,
        default=project_root / "src" / "assets" / "sfx",
        help="output directory (default: src/assets/sfx)",
    )
    args = parser.parse_args()
    write_outputs(args.output)


if __name__ == "__main__":
    main()
