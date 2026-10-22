import sys, json
import librosa, numpy as np

out = {}
for tag, path in [("probation", sys.argv[1]), ("moonlight", sys.argv[2])]:
    y, sr = librosa.load(path, sr=44100, mono=True)
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    beat_times = librosa.frames_to_time(beats, sr=sr)
    # tempo unique : si > 160, probablement double
    t = float(np.atleast_1d(tempo)[0])
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    # profil Krumhansl pour la tonalite
    maj = np.array([6.35,2.23,3.59,2.23,4.38,4.09,2.33,3.49,2.29,3.17,4.55,4.09])
    rotation = np.argmax(np.correlate(chroma, maj, mode='full')[len(chroma)-1:])
    pitch_names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
    rms = librosa.feature.rms(y=y).mean()
    out[tag] = {
        "tempo": round(t, 2), "dur": round(len(y)/sr, 1),
        "key_major_est": pitch_names[rotation],
        "energy": round(float(rms), 4),
        "first_beat": round(float(beat_times[0]), 3) if len(beat_times) else 0,
        "beat_count": int(len(beat_times)),
    }
json.dump(out, open("analysis.json", "w"), indent=2)
print(json.dumps(out, indent=2))
