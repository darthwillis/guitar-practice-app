import {
  diatonicChords,
  keyName,
  pentatonicAdditions,
  pretty,
  relativeKey,
  triadOn,
  type MusicalKey,
} from './theory'

export type StepId = 'notes' | 'octaves' | 'triads' | 'scale' | 'improvise' | 'changes'

export interface Exercise {
  id: StepId
  title: string
  instructions: string[]
  metronome: string
  /** Alternate play/rest bars while the metronome runs. */
  callAndResponse?: boolean
}

export function buildExercises(key: MusicalKey, area: string): Exercise[] {
  const tonic = pretty(key.tonic)
  const triad = triadOn(key).map(pretty).join(' – ')
  const adds = pentatonicAdditions(key).map(pretty).join(' and ')
  const chords = diatonicChords(key)
  const primary = [chords[0], chords[3], chords[4]]
  const progression = [chords[0], chords[3], chords[0], chords[4]].map((c) => c.name).join(' – ')
  const thirds = primary.map((c) => `${pretty(c.notes[1])} over ${c.name}`).join(', ')
  const rel = keyName(relativeKey(key))

  return [
    {
      id: 'notes',
      title: 'Find the notes',
      instructions: [
        `Say the seven notes of ${keyName(key)} aloud before revealing them.`,
        `Find every ${tonic} in ${area}. Say the name before you play it.`,
        `Then pick two other notes from the key and find them in random order.`,
      ],
      metronome: 'One note every 4 clicks at 60–70 BPM. Shorten to every 2 clicks when it feels easy.',
    },
    {
      id: 'octaves',
      title: 'Anchor with octaves',
      instructions: [
        `Play each ${tonic} in ${area}, then jump to its octave two strings higher.`,
        'E→D and A→G octaves are two frets up; D→B and G→e are three frets up.',
        'Name the destination note before you land on it.',
      ],
      metronome: 'Root on beat 1, octave on beat 3. Name it out loud.',
    },
    {
      id: 'triads',
      title: 'Triads and intervals',
      instructions: [
        `Find the tonic triad (${triad}) on one string set in ${area}.`,
        'Play root + 3rd as a dyad, then root + 5th, then the full triad.',
        'Arpeggiate root–3rd–5th–3rd and name each chord tone as you play it.',
        `Compare: lower or raise the 3rd and listen to the quality change.`,
      ],
      metronome: 'One voicing per bar on beat 1; use the other beats to find the next inversion.',
    },
    {
      id: 'scale',
      title: 'Connect the scale',
      instructions: [
        `Play the ${keyName(key)} scale in ${area}, starting and ending on ${tonic}.`,
        'Pause on each triad tone; treat the other notes as passing tones.',
        `Notice that ${rel} uses the same notes with a different home base.`,
      ],
      metronome: 'One note per click, then two per click ("1-and, 2-and") at the same tempo.',
    },
    {
      id: 'improvise',
      title: 'Constrained improvisation',
      instructions: [
        `Use only ${triad} in ${area}.`,
        'Play a short phrase for one bar, then rest for one bar.',
        'Repeat the phrase, changing only its rhythm or its last note.',
        `When that feels comfortable, add ${adds} (the pentatonic notes).`,
        'If you freeze, let the bar stay silent and come back in on the next beat 1.',
      ],
      metronome: 'Leave it running. Follow the PLAY / REST indicator below.',
      callAndResponse: true,
    },
    {
      id: 'changes',
      title: 'Land on the changes',
      instructions: [
        `Loop ${progression}, one bar per chord.`,
        `Aim for the 3rd of each chord as it arrives: ${thirds}.`,
        'Pick a chord below to see its tones, or start the metronome to follow the loop.',
      ],
      metronome: 'Four clicks per chord. Land on a chord tone on beat 1.',
    },
  ]
}
