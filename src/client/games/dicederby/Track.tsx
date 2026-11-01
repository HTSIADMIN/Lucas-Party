// The Dice Derby track: 17 spaces from the start gate to the finish flag,
// racers stacked on their spaces (bottom of the stack at the bottom).

import { DD_TRACK, type DdRacer } from "@party/shared";
import { Character } from "../../art/Character";

export function Track({ stacks, highlight }: { stacks: DdRacer[][]; highlight?: DdRacer | null }) {
  return (
    <div className="dd-track">
      {stacks.map((stack, space) => (
        <div key={space} className={`dd-space ${space === 0 ? "is-start" : ""} ${space === DD_TRACK ? "is-finish" : ""}`}>
          <div className="dd-stack">
            {stack.map((racer) => (
              <span key={racer} className={`dd-racer ${highlight === racer ? "is-moving" : ""}`}>
                <Character id={racer} size="2.6em" motion={highlight === racer ? "jump" : "none"} mood={highlight === racer ? "happy" : "idle"} />
              </span>
            ))}
          </div>
          <span className="dd-space-num">{space === 0 ? "GO" : space === DD_TRACK ? "🏁" : space}</span>
        </div>
      ))}
    </div>
  );
}
