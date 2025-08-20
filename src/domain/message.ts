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