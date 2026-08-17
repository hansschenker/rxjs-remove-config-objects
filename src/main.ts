import './style.css';
import {
  buffer,
  filter,
  fromEvent,
  ignoreElements,
  map,
  merge,
  of,
  repeat,
  scan,
  startWith,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';
import type { Observable } from 'rxjs';
import { onTimeout, shareVia, timeoutEach, timeoutFirst } from './index';

const BEAT = 200; // one Morse beat in ms
const DASH_HOLD = 2 * BEAT; // hold at least this long for a dash
const LETTER_GAP = 3; // beats of silence that close a letter
const WORD_GAP = 7; // beats of silence that end a word

// prettier-ignore
const MORSE: Record<string, string> = {
  '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
  '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
  '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
  '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
  '-.--': 'Y', '--..': 'Z',
  '-----': '0', '.----': '1', '..---': '2', '...--': '3', '....-': '4',
  '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9',
};

const byId = <E extends HTMLElement>(id: string): E => document.getElementById(id) as E;
const pad = byId<HTMLButtonElement>('pad');
const draftEl = byId<HTMLDivElement>('draft');
const messageEl = byId<HTMLDivElement>('message');
const hintEl = byId<HTMLParagraphElement>('hint');
const clearButton = byId<HTMLButtonElement>('clear');
const chartEl = byId<HTMLDivElement>('chart');
const logEl = byId<HTMLOListElement>('log');

// ---- taps ------------------------------------------------------------

const spaceDown$ = fromEvent<KeyboardEvent>(window, 'keydown').pipe(
  filter((event) => event.code === 'Space' && !event.repeat),
  tap((event) => event.preventDefault())
);
const spaceUp$ = fromEvent<KeyboardEvent>(window, 'keyup').pipe(
  filter((event) => event.code === 'Space')
);
const pressStart$ = merge(spaceDown$, fromEvent<PointerEvent>(pad, 'pointerdown'));
const pressEnd$ = merge(spaceUp$, fromEvent<PointerEvent>(window, 'pointerup'));

// Hold length decides the symbol: a dot takes one beat, a dash three —
// so anything held two beats or more counts as a dash. Each tap also
// records its timing for the log.
interface Tap {
  symbol: '.' | '-';
  held: number;
  pauseBefore: number | null;
}

let previousReleaseAt: number | null = null;

const tap$: Observable<Tap> = pressStart$.pipe(
  switchMap(() => {
    const start = performance.now();
    const pauseBefore =
      previousReleaseAt === null ? null : Math.round(start - previousReleaseAt);
    return pressEnd$.pipe(
      take(1),
      map(() => {
        const end = performance.now();
        previousReleaseAt = end;
        const held = Math.round(end - start);
        return {
          symbol: held >= DASH_HOLD ? ('-' as const) : ('.' as const),
          held,
          pauseBefore,
        };
      })
    );
  }),
  shareVia(() => new Subject<Tap>())
);

const symbol$: Observable<'.' | '-'> = tap$.pipe(map((tap) => tap.symbol));

// ---- silence detection -----------------------------------------------
// timeoutEach arms only AFTER a tap, so an idle page never times out —
// exactly the single-purpose semantics this demo needs (the config form
// timeout({each}) would also constrain the wait for the first tap).
// onTimeout turns the elapsed gap into a boundary event, and repeat()
// re-arms the detector for the next burst of taps.
const silenceAfterTaps = (beats: number): Observable<number> =>
  symbol$.pipe(
    timeoutEach(beats * BEAT),
    ignoreElements(),
    onTimeout(() => of(beats)),
    repeat(),
    shareVia(() => new Subject<number>())
  );

const letterClose$ = silenceAfterTaps(LETTER_GAP);
const wordClose$ = silenceAfterTaps(WORD_GAP);

const letter$ = symbol$.pipe(
  buffer(letterClose$),
  filter((symbols) => symbols.length > 0),
  map((symbols) => MORSE[symbols.join('')] ?? '?')
);

// ---- assembling the message ------------------------------------------

type Step = (text: string) => string;

const message$ = merge(
  letter$.pipe(map((char): Step => (text) => text + char)),
  wordClose$.pipe(
    map((): Step => (text) => (text === '' || text.endsWith(' ') ? text : text + ' '))
  ),
  fromEvent(clearButton, 'click').pipe(map((): Step => () => ''))
).pipe(scan((text, step) => step(text), ''), startWith(''));

const draft$ = merge(
  symbol$.pipe(map((symbol): Step => (draft) => draft + (symbol === '.' ? '•' : '—'))),
  letterClose$.pipe(map((): Step => () => ''))
).pipe(scan((draft, step) => step(draft), ''), startWith(''));

// timeoutFirst: its whole purpose is "the first value never arrived" —
// here, nudging a visitor who has not tapped anything after ten seconds.
const hint$: Observable<boolean> = symbol$.pipe(
  timeoutFirst(10_000),
  take(1),
  map(() => false),
  onTimeout(() => of(true))
);

// ---- render ----------------------------------------------------------

message$.subscribe((text) => {
  messageEl.textContent = text === '' ? ' ' : text;
});
draft$.subscribe((draft) => {
  draftEl.textContent = draft === '' ? ' ' : draft;
});
hint$.subscribe((show) => {
  hintEl.hidden = !show;
});
symbol$.subscribe(() => {
  hintEl.hidden = true;
});
pressStart$.subscribe(() => pad.classList.add('pressed'));
pressEnd$.subscribe(() => pad.classList.remove('pressed'));

// ---- timing log ------------------------------------------------------
// Every press logs how long it was held and what it became; every
// silence boundary logs the gap that triggered it — the two timings
// Morse is made of.

const logLine = (html: string): void => {
  const entry = document.createElement('li');
  entry.innerHTML = html;
  logEl.prepend(entry);
  while (logEl.children.length > 30) {
    logEl.lastElementChild?.remove();
  }
};

tap$.subscribe(({ symbol, held, pauseBefore }) => {
  const pauseNote = pauseBefore === null ? '' : `pause ${pauseBefore} ms · `;
  logLine(
    symbol === '.'
      ? `${pauseNote}held ${held} ms (&lt; ${DASH_HOLD} ms) → dot <b>•</b>`
      : `${pauseNote}held ${held} ms (≥ ${DASH_HOLD} ms) → dash <b>—</b>`
  );
});
letterClose$.subscribe(() => logLine(`${LETTER_GAP * BEAT} ms of silence → <b>letter closed</b>`));
wordClose$.subscribe(() => logLine(`${WORD_GAP * BEAT} ms of silence → <b>word break</b>`));

chartEl.innerHTML = Object.entries(MORSE)
  .map(
    ([code, char]) =>
      `<span><b>${char}</b> ${code.replaceAll('.', '•').replaceAll('-', '—')}</span>`
  )
  .join('');
