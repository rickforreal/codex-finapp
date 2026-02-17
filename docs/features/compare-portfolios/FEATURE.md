I want to brainstorm on next phase of the project (Phase 14). This feature is known as "Compare Portfolio Mode" or "Side by Side (SxS) Mode". The gist is that the user is able to compare two forecast configurations side by side. This is useful if the user wants to see Withdrawal Strategy A compares with Withdrawal Strategy B. 

The core things to consider:
1. For V1, only two portfolio's can compared. We may want to increase the number of portfolio candidates that can be compared later.
2. The key is being able to see the plots of both portfolios plotted on the same chart. 
3. Each portfolio in the comparison will have their own:
  3.1 Stats (whether stats for both portfolios [e.g. Median Monthly Real], appear on the same card or on separate cards is a UX decsion we need to make)
  3.2 Detail Tables
    3.2.1 The width of each table is naturally going to be half the width of the original Detail Table. 
    3.2.2 This also means that 'expanding' the Detail Table is not an option available in SxS mode. Scroll bars are needed.
  3.3 Inputs 
    3.3.1 Instead of having a whole other Input Panel, I'm thinking there's a little switch in the existing Input Panel that lets the user switch b/w the input parameters for each portfolio being compared. 
4. Each portfolio will share the following affordances
  4.1 Chart
  4.2 Stats Cards (maybe?)
  4.3 Stress Test section: Stress Tests apply to both portfolios in the comparison.
5. User should be able to Load a snapshots and compare them SxS. This might change the Load / Save Snapshot feature significantly.
