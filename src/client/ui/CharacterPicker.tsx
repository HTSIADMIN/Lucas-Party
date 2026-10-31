import { CHARACTERS, CHARACTER_IDS, type CharacterId } from "@party/shared";
import { Character } from "../art/Character";

interface Props {
  value: CharacterId | null;
  onChange(id: CharacterId): void;
  taken?: CharacterId[];
  size?: number;
}

export function CharacterPicker({ value, onChange, taken = [], size = 64 }: Props) {
  return (
    <div className="char-picker" role="radiogroup" aria-label="Pick your character">
      {CHARACTER_IDS.map((id) => {
        const isTaken = taken.includes(id) && id !== value;
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${CHARACTERS[id].name}${isTaken ? " (taken)" : ""}`}
            disabled={isTaken}
            className={`char-option ${selected ? "is-selected" : ""}`}
            style={{ ["--char-color" as string]: CHARACTERS[id].color }}
            onClick={() => onChange(id)}
          >
            <Character id={id} size={size} mood={selected ? "happy" : "idle"} motion={selected ? "bob" : "none"} dim={isTaken} />
            <span className="char-option-name">{CHARACTERS[id].name}</span>
          </button>
        );
      })}
    </div>
  );
}
