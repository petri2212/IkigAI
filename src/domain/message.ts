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

export interface SessionDoc {
        _id?: import("mongodb").ObjectId;
        id: string;
        number_session: string;
        path: string;
        q_and_a: QA[];
        createdAt: Date;
      }

export interface QA {
        question: string;
        answer: string;
        timestamp: Date;
      }