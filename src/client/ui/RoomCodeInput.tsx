import { useRef, useState } from "react";
import { ROOM_CODE_LENGTH, normalizeRoomCode } from "@party/shared";

interface Props {
  value: string;
  onChange(code: string): void;
  onComplete?(code: string): void;
  autoFocus?: boolean;
  label?: string;
}

/** Four chunky letter tiles backed by one real input (paste, autocapitalise and mobile keyboards just work). */
export function RoomCodeInput({ value, onChange, onComplete, autoFocus, label = "Room code" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div className="code-input" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        enterKeyHint="go"
        maxLength={ROOM_CODE_LENGTH + 2}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const code = normalizeRoomCode(e.target.value);
          onChange(code);
          if (code.length === ROOM_CODE_LENGTH && code !== value) onComplete?.(code);
        }}
      />
      {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`code-tile ${value[i] ? "is-filled" : ""} ${focused && i === Math.min(value.length, ROOM_CODE_LENGTH - 1) && value.length < ROOM_CODE_LENGTH ? "is-active" : ""}`}
        >
          {value[i] ?? ""}
        </div>
      ))}
    </div>
  );
}
