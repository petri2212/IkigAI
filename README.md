# IkigAI
Bachelor Thesis

## First Phase - Literature review 

We started by researching scientific articles, ... dealing with the topics to be inherent in our thesis.
We used portals such as Google Scholar, DBPL.org, SemanticScholar, SCOPUS, Web of Science to retrieve:
- PDF of the article
- Title and authors
- Brief summary
- Why it is relevant
- Pros and cons of the solution

## Second Phase - Develop a RAG engine

### Setup

- `git clone https://github.com/petri2212/IkigAI.git`
- `cd` to repo
- `npm install`Crea un file `.env.local` nella root del progetto con il seguente contenuto:
- create `.env.local` in the root of the project with the following environment variables:
```
OPENAI_API_KEY=...
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
MONGODB_URI="..."

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```
- `npm run dev`

### Requirements

- Valid api keys

