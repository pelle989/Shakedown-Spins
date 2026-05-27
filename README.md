# Shakedown Spins

This product formulated from my wife and I's need to easily randomize our record collection. We store everything in Discogs (format) and really appreciated the randomizer contained in the Discogs Apple App. However, over time app authentication and bloat have disturbed this pleasure and inspired a new creation, Shakedown Spins.

It's simple, connect in your source: 1) Discogs account, 2) copy in your personal token key, or 3) import your Discogs or personal collection CSV file.

'Load' the stash collection and press Random.

Primary Features:
	- View last 5 selection history.
		- Undecided on album selection, my wife and I will roll 3 times and select one.
	- View additional cover art.
  - View wikipedia details inside the album year.
	- Share personal stash collections with a friend.
		- Load only albums that both your friend and you own.
	- Filter by Genre and Decade


## Codex Product Description

Shakedown Spins turns a record collection into a fast listening ritual. Load a stash, press `Random`, and let the app pick the next album instead of scrolling through a spreadsheet or library view.

## Current Product

- `Street Feed`: the latest 10 public CSV stashes.
- `My Stash`: signed-in private CSV uploads and Discogs imports.
- `Friends Stash`: accepted shared collections from other members.
- `Messages`: internal member inbox for sending and accepting shared stashes.
- `Matching Albums`: compare a friend's shared stash against one of your own stashes and randomize only through the albums you both have.
- `Discogs`: personal-token connection, import, manual refresh, and reset flow.
- `CSV Replace`: update an existing private CSV stash while preserving its identity, share state, and friend links.
- `Album Art`: Discogs image lookup first, then MusicBrainz / Cover Art Archive, then iTunes fallback.
- `Pop-Up Facts`: short album or artist context from Wikipedia, with source links when text is truncated.



## CSV Format

Required columns:

- `Artist`
- `Title`

Optional columns:

- `Year`
- `Genre`
- `Label`
- `Format`
- `Discogs ID`
- `Notes`

The importer is forgiving about common header variants, but `Artist` and `Title` are required.

Example Discogs-style CSV:

```csv
Catalog#,Artist,Title,Label,Format,Rating,Released,release_id,CollectionFolder,Date Added,Collection Media Condition,Collection Sleeve Condition,Collection Notes
R1 186569,Aretha Franklin,I Never Loved a Man the Way I Love You,"Atlantic, Rhino Records (2)","LP, Album, Reissue, Stereo",5,1967,16972656,Favorites,2026-05-01,Near Mint (NM or M-),Very Good Plus (VG+),Soul classic
MOVLP 279,Talking Heads,Remain in Light,Music On Vinyl,"LP, Album, Reissue",4,1980,1146804,Main Room,2026-05-02,Very Good Plus (VG+),Very Good Plus (VG+),
```



## Notes

- Accepted friend stashes persist until the recipient removes them.
- The public `Street Feed` remains capped at the latest 10 public stashes.


