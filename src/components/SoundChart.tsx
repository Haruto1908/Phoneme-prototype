import { useEffect, useState } from 'react'
import type { Manifest } from '../types'
import { Tile } from './Tile'
import * as audio from '../lib/audio'

interface SoundChartProps {
  manifest: Manifest
  symbolSystem: string
}

/**
 * The seven-tile chart: six sounds plus the "cat" word tile.
 * Tapping a tile plays its audio (the word tile plays its sounds in sequence).
 * The mouth close-up and tongue view that follow a tap are the next build step and hook in at onPress.
 */
export function SoundChart({ manifest, symbolSystem }: SoundChartProps) {
  const [playingId, setPlayingId] = useState<string | null>(null)

  // Preload every clip once so the first tap is instant on iPad.
  useEffect(() => {
    audio.preload([...manifest.sounds.map((s) => s.audio), ...manifest.words.map((w) => w.audio)])
    return () => audio.stop()
  }, [manifest])

  const soundById = new Map(manifest.sounds.map((s) => [s.id, s]))

  async function press(id: string) {
    const sound = soundById.get(id)
    const word = manifest.words.find((w) => w.id === id)
    const clipOf = (s?: { audio: string | null; audioWindow?: [number, number] | null }): audio.Clip[] =>
      s?.audio ? [{ src: s.audio, window: s.audioWindow }] : []
    const clips: audio.Clip[] = sound
      ? clipOf(sound)
      : word
        ? [...word.sequence.flatMap((sid) => clipOf(soundById.get(sid))), ...clipOf(word)]
        : []

    setPlayingId(id)
    await audio.play(clips)
    setPlayingId((cur) => (cur === id ? null : cur))
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-4" role="group" aria-label="Sound chart">
      {manifest.sounds.map((s) => (
        <Tile
          key={s.id}
          id={s.id}
          symbol={s.symbols[symbolSystem] ?? s.symbols[manifest.defaultSymbolSystem] ?? s.ipa}
          detail={`/${s.ipa}/`}
          cue={s.cue}
          color={s.color}
          playing={playingId === s.id}
          voiced={s.voiced}
          ariaLabel={`${s.exampleWord} sound, ${s.ipa}`}
          onPress={press}
        />
      ))}
      {manifest.words.map((w) => (
        <Tile
          key={w.id}
          id={w.id}
          symbol={w.word}
          detail={w.sequence.map((sid) => soundById.get(sid)?.symbols[symbolSystem] ?? sid).join(' · ')}
          cue={w.cue}
          color={w.color}
          playing={playingId === w.id}
          wide
          ariaLabel={`the word ${w.word}`}
          onPress={press}
        />
      ))}
    </div>
  )
}
