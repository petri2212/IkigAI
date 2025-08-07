//messages types
export interface Message {
  _id: string;          // string used like _id
  number_session: string;
  q_and_a?: {
    question: string;
    answer: string;
    timestamp?: Date;
  }[];
}