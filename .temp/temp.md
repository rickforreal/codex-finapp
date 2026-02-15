Alright. Let's continue with documentation. I actually like the idea of having both an ARCHITECTURE.md and an ENGINEERING.md file. The former provides the guidance on the technical "What" and the latter addresses the technical "How".

The ARCHITECTURE should talk about the technical stack, data model, storage, diagrams, qualities of the application like modularity, extensibility, etc.; the testing strategy. It's the artifact that a Technical Architect would write (albeit condensed).

The ENGINEERING doc should should be the Engineering Manager's manifest. The "How". How should the application be built (e.g. in Phases). What each Phase should accomplish. How to validate features before marking them "Done". Using Git / Github - when to commit and commit message guidelines. Dev workflow, testing, linting, scripts, etc. 

Ultimately, the TASKS.md will be derived from the Phases defined in the ENGINEERING.md file, and built with the guidelines specified in the ARCHITECTURE.md. 

Before proceeding, what do you think about this idea? What additions or ommissions would you suggest to these artifacts?