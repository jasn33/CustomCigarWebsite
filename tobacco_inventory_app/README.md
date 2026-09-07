# Cigar Tobacco Inventory & Blend Manager

A phone-friendly Tkinter app for managing cigar tobacco inventory, building
blends out of any combination of wrapper, binder, and filler leaves, and
estimating how much of each leaf a production batch will need.

It's a single file (`cigar_inventory.py`) using only the Python standard
library (`tkinter` + `sqlite3`), so it runs on a desktop and inside **Pydroid
3** on Android with no extra pip installs.

## Features

- **Inventory tab** — add/edit/delete tobacco leaves. Each leaf has a name,
  type (Wrapper / Binder / Filler), origin, quantity on hand (grams), cost
  per gram, and notes.
- **Blends tab** — create named blends and add any number of components to
  them, each pulled from your inventory and tagged as a wrapper, binder, or
  filler, with a grams-per-cigar amount. A blend isn't limited to one leaf
  per role — mix multiple wrappers, binders, or fillers freely.
- **Batch Estimate tab** — pick a blend and a number of cigars, and it
  calculates total grams needed per leaf, compares it against current stock,
  highlights shortfalls in red, and totals the estimated tobacco cost. A
  "Deduct Needed Amounts From Inventory" button lets you subtract the batch
  from stock once you've actually rolled it.

Data is stored in `cigar_inventory.db` (SQLite), created next to the script
the first time you run it, so everything persists between sessions.

## Running on your phone with Pydroid 3

1. Install **Pydroid 3** from the Play Store (it's free).
2. Open Pydroid 3. `tkinter` and `sqlite3` ship with Pydroid's Python
   already — if a run ever complains `tkinter` is missing, open Pydroid's
   menu → **Pydroid repository plugin** (also on the Play Store) and install
   it; that adds Tkinter support.
3. Get `cigar_inventory.py` onto your phone — e.g. copy it via Google Drive,
   USB, email, or `git clone` this repo — then open it from Pydroid's file
   browser (or paste its contents into a new file in Pydroid's editor).
4. Tap the ▶ Run button at the bottom right.
5. The app window opens sized for a phone screen. Use the tabs at the top
   (Inventory / Blends / Batch Estimate) to move between features.

The database file is created in the same folder as the script, so keep them
together if you move the app around.

## Running on desktop

```bash
python3 cigar_inventory.py
```

Requires Python 3 with Tkinter (already included on Windows/macOS
installers; on Linux install your distro's `python3-tk` package).

## Typical workflow

1. On the **Inventory** tab, enter your wrapper, binder, and filler leaves
   with how much of each you have on hand and what it costs per gram.
2. On the **Blends** tab, create a blend (e.g. "Robusto House Blend") and
   add components — pick a role, pick a leaf of that role from your
   inventory, and enter how many grams of it go into a single cigar.
3. On the **Batch Estimate** tab, select that blend, enter how many cigars
   you plan to roll, and hit **Calculate Needs** to see exactly how much of
   each leaf you need, whether you have enough, and the total tobacco cost.
   After rolling, use **Deduct Needed Amounts From Inventory** to update
   your stock levels.
