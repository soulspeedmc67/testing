export interface CaptionWord {
  text: string;
  startSec: number;
  endSec: number;
}

export interface CaptionSegment {
  startSec: number;
  endSec: number;
  words: CaptionWord[];
}

export interface PopUpConfig {
  fromSec: number;
  durationSec: number;
  title?: string;
  subtitle?: string;
}
