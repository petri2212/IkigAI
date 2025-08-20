import { v4 as uuidv4 } from "uuid";

//creates new session uid
export default function createNewSession(): string {
  return uuidv4();
}
