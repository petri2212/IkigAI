// components/pathcard.ts
import { v4 as uuidv4 } from "uuid";

export default function createNewSession(): string {
  return uuidv4();
}
