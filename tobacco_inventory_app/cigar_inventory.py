"""
Cigar Tobacco Inventory & Blend Manager
========================================
A single-file Tkinter app for tracking wrapper/binder/filler tobacco
inventory, building cigar blends from any combination of leaves, and
estimating how much of each leaf a production batch will need.

Runs on desktop Python 3 as well as inside Pydroid 3 on Android
(tkinter + sqlite3 are both part of the Python standard library, so no
extra pip installs are required).

Data is stored in a SQLite file (cigar_inventory.db) created next to
this script, so your inventory and blends persist between runs.
"""

import os
import shutil
import sqlite3
import tkinter as tk
import uuid
from tkinter import ttk, messagebox, filedialog

try:
    from PIL import Image, ImageTk
except ImportError:
    Image = None
    ImageTk = None

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "cigar_inventory.db")
PHOTOS_DIR = os.path.join(APP_DIR, "photos")

ROLES = ("Wrapper", "Binder", "Filler")
THUMBNAIL_SIZE = (140, 140)


# ---------------------------------------------------------------------------
# Data layer
# ---------------------------------------------------------------------------
class Database:
    def __init__(self, path):
        self.conn = sqlite3.connect(path)
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS tobacco (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('Wrapper', 'Binder', 'Filler')),
                origin TEXT DEFAULT '',
                quantity_g REAL NOT NULL DEFAULT 0,
                cost_per_g REAL NOT NULL DEFAULT 0,
                notes TEXT DEFAULT '',
                photo TEXT DEFAULT ''
            )
            """
        )
        existing_columns = {row["name"] for row in cur.execute("PRAGMA table_info(tobacco)")}
        if "photo" not in existing_columns:
            cur.execute("ALTER TABLE tobacco ADD COLUMN photo TEXT DEFAULT ''")
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS blends (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                notes TEXT DEFAULT ''
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS blend_components (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                blend_id INTEGER NOT NULL REFERENCES blends(id) ON DELETE CASCADE,
                tobacco_id INTEGER NOT NULL REFERENCES tobacco(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK(role IN ('Wrapper', 'Binder', 'Filler')),
                grams_per_cigar REAL NOT NULL DEFAULT 0
            )
            """
        )
        self.conn.commit()

    # -- tobacco -----------------------------------------------------------
    def list_tobacco(self, type_filter=None):
        cur = self.conn.cursor()
        if type_filter:
            cur.execute("SELECT * FROM tobacco WHERE type=? ORDER BY name", (type_filter,))
        else:
            cur.execute("SELECT * FROM tobacco ORDER BY type, name")
        return cur.fetchall()

    def get_tobacco(self, tobacco_id):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM tobacco WHERE id=?", (tobacco_id,))
        return cur.fetchone()

    def add_tobacco(self, name, type_, origin, quantity_g, cost_per_g, notes, photo=""):
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO tobacco (name, type, origin, quantity_g, cost_per_g, notes, photo) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name, type_, origin, quantity_g, cost_per_g, notes, photo),
        )
        self.conn.commit()
        return cur.lastrowid

    def update_tobacco(self, tobacco_id, name, type_, origin, quantity_g, cost_per_g, notes, photo=""):
        self.conn.execute(
            "UPDATE tobacco SET name=?, type=?, origin=?, quantity_g=?, cost_per_g=?, notes=?, photo=? "
            "WHERE id=?",
            (name, type_, origin, quantity_g, cost_per_g, notes, photo, tobacco_id),
        )
        self.conn.commit()

    def delete_tobacco(self, tobacco_id):
        self.conn.execute("DELETE FROM tobacco WHERE id=?", (tobacco_id,))
        self.conn.commit()

    def adjust_stock(self, tobacco_id, delta_g):
        self.conn.execute(
            "UPDATE tobacco SET quantity_g = quantity_g + ? WHERE id=?",
            (delta_g, tobacco_id),
        )
        self.conn.commit()

    # -- blends --------------------------------------------------------------
    def list_blends(self):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM blends ORDER BY name")
        return cur.fetchall()

    def get_blend(self, blend_id):
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM blends WHERE id=?", (blend_id,))
        return cur.fetchone()

    def add_blend(self, name, notes=""):
        cur = self.conn.cursor()
        cur.execute("INSERT INTO blends (name, notes) VALUES (?, ?)", (name, notes))
        self.conn.commit()
        return cur.lastrowid

    def update_blend(self, blend_id, name, notes):
        self.conn.execute(
            "UPDATE blends SET name=?, notes=? WHERE id=?", (name, notes, blend_id)
        )
        self.conn.commit()

    def delete_blend(self, blend_id):
        self.conn.execute("DELETE FROM blends WHERE id=?", (blend_id,))
        self.conn.commit()

    # -- blend components -----------------------------------------------------
    def list_components(self, blend_id):
        cur = self.conn.cursor()
        cur.execute(
            """
            SELECT bc.id, bc.role, bc.grams_per_cigar, t.id AS tobacco_id,
                   t.name AS tobacco_name, t.quantity_g, t.cost_per_g
            FROM blend_components bc
            JOIN tobacco t ON t.id = bc.tobacco_id
            WHERE bc.blend_id = ?
            ORDER BY bc.role, t.name
            """,
            (blend_id,),
        )
        return cur.fetchall()

    def add_component(self, blend_id, tobacco_id, role, grams_per_cigar):
        cur = self.conn.cursor()
        cur.execute(
            "INSERT INTO blend_components (blend_id, tobacco_id, role, grams_per_cigar) "
            "VALUES (?, ?, ?, ?)",
            (blend_id, tobacco_id, role, grams_per_cigar),
        )
        self.conn.commit()
        return cur.lastrowid

    def delete_component(self, component_id):
        self.conn.execute("DELETE FROM blend_components WHERE id=?", (component_id,))
        self.conn.commit()


# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------
def parse_float(value, field_name):
    try:
        return float(value)
    except (TypeError, ValueError):
        raise ValueError("'{}' must be a number".format(field_name))


# ---------------------------------------------------------------------------
# Inventory tab
# ---------------------------------------------------------------------------
class InventoryTab(ttk.Frame):
    def __init__(self, master, db, on_change=None):
        super().__init__(master, padding=8)
        self.db = db
        self.on_change = on_change
        self.selected_id = None
        self._current_thumb = None
        os.makedirs(PHOTOS_DIR, exist_ok=True)
        self._build()
        self.refresh()

    def _build(self):
        columns = ("name", "type", "origin", "qty", "cost", "notes")
        headers = {
            "name": "Name", "type": "Type", "origin": "Origin",
            "qty": "Qty (g)", "cost": "Cost/g", "notes": "Notes",
        }
        tree_frame = ttk.Frame(self)
        tree_frame.pack(fill="both", expand=True)

        self.tree = ttk.Treeview(tree_frame, columns=columns, show="headings", height=8)
        for col in columns:
            self.tree.heading(col, text=headers[col])
            self.tree.column(col, width=90, anchor="w")
        self.tree.column("notes", width=140)
        vsb = ttk.Scrollbar(tree_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")
        self.tree.bind("<<TreeviewSelect>>", self._on_select)

        form = ttk.LabelFrame(self, text="Tobacco Leaf", padding=8)
        form.pack(fill="x", pady=(10, 0))

        self.name_var = tk.StringVar()
        self.type_var = tk.StringVar(value=ROLES[0])
        self.origin_var = tk.StringVar()
        self.qty_var = tk.StringVar(value="0")
        self.cost_var = tk.StringVar(value="0")
        self.notes_var = tk.StringVar()
        self.photo_var = tk.StringVar(value="")

        def row(label, widget_factory, r):
            ttk.Label(form, text=label).grid(row=r, column=0, sticky="w", pady=3)
            widget = widget_factory()
            widget.grid(row=r, column=1, sticky="ew", pady=3)
            return widget

        form.columnconfigure(1, weight=1)

        row("Name", lambda: ttk.Entry(form, textvariable=self.name_var), 0)
        row("Type", lambda: ttk.Combobox(
            form, textvariable=self.type_var, values=ROLES, state="readonly"
        ), 1)
        row("Origin", lambda: ttk.Entry(form, textvariable=self.origin_var), 2)
        row("Quantity on hand (g)", lambda: ttk.Entry(form, textvariable=self.qty_var), 3)
        row("Cost per gram ($)", lambda: ttk.Entry(form, textvariable=self.cost_var), 4)
        row("Notes", lambda: ttk.Entry(form, textvariable=self.notes_var), 5)

        ttk.Label(form, text="Photo").grid(row=6, column=0, sticky="nw", pady=3)
        photo_frame = ttk.Frame(form)
        photo_frame.grid(row=6, column=1, sticky="ew", pady=3)

        self.photo_preview = ttk.Label(
            photo_frame, text="No Photo", anchor="center",
            relief="groove", width=16, background="#f0f0f0",
        )
        self.photo_preview.pack(side="left", padx=(0, 8))

        photo_btns = ttk.Frame(photo_frame)
        photo_btns.pack(side="left", fill="y")
        ttk.Button(photo_btns, text="Choose Photo...", command=self.choose_photo).pack(fill="x", pady=2)
        ttk.Button(photo_btns, text="Remove Photo", command=self.remove_photo).pack(fill="x", pady=2)

        btns = ttk.Frame(self)
        btns.pack(fill="x", pady=8)
        ttk.Button(btns, text="Add New", command=self.add).pack(side="left", expand=True, fill="x", padx=2)
        ttk.Button(btns, text="Update Selected", command=self.update).pack(side="left", expand=True, fill="x", padx=2)
        ttk.Button(btns, text="Delete Selected", command=self.delete).pack(side="left", expand=True, fill="x", padx=2)
        ttk.Button(btns, text="Clear Form", command=self.clear_form).pack(side="left", expand=True, fill="x", padx=2)

    def _on_select(self, _event):
        sel = self.tree.selection()
        if not sel:
            return
        tobacco_id = int(sel[0])
        rec = self.db.get_tobacco(tobacco_id)
        if not rec:
            return
        self.selected_id = rec["id"]
        self.name_var.set(rec["name"])
        self.type_var.set(rec["type"])
        self.origin_var.set(rec["origin"])
        self.qty_var.set(str(rec["quantity_g"]))
        self.cost_var.set(str(rec["cost_per_g"]))
        self.notes_var.set(rec["notes"])
        self.photo_var.set(rec["photo"] or "")
        self._update_preview()

    def clear_form(self):
        self.selected_id = None
        self.tree.selection_remove(self.tree.selection())
        self.name_var.set("")
        self.type_var.set(ROLES[0])
        self.origin_var.set("")
        self.qty_var.set("0")
        self.cost_var.set("0")
        self.notes_var.set("")
        self.photo_var.set("")
        self._update_preview()

    def choose_photo(self):
        if Image is None or ImageTk is None:
            messagebox.showerror(
                "Pillow not installed",
                "Photo support requires the Pillow package.\nInstall it with: pip install pillow",
            )
            return
        path = filedialog.askopenfilename(
            title="Select a photo",
            filetypes=[("Image files", "*.jpg *.jpeg *.png *.gif *.bmp *.webp"), ("All files", "*.*")],
        )
        if not path:
            return
        try:
            ext = os.path.splitext(path)[1].lower() or ".jpg"
            new_name = uuid.uuid4().hex + ext
            os.makedirs(PHOTOS_DIR, exist_ok=True)
            shutil.copyfile(path, os.path.join(PHOTOS_DIR, new_name))
        except OSError as e:
            messagebox.showerror("Could not load photo", str(e))
            return
        self.photo_var.set(new_name)
        self._update_preview()

    def remove_photo(self):
        self.photo_var.set("")
        self._update_preview()

    def _update_preview(self):
        filename = self.photo_var.get()
        full_path = os.path.join(PHOTOS_DIR, filename) if filename else None
        if not filename or Image is None or not os.path.isfile(full_path):
            self._current_thumb = None
            self.photo_preview.configure(image="", text="No Photo")
            return
        try:
            img = Image.open(full_path)
            img.thumbnail(THUMBNAIL_SIZE)
            self._current_thumb = ImageTk.PhotoImage(img)
            self.photo_preview.configure(image=self._current_thumb, text="")
        except Exception:
            self._current_thumb = None
            self.photo_preview.configure(image="", text="No Photo")

    def _read_form(self):
        name = self.name_var.get().strip()
        if not name:
            raise ValueError("Name is required")
        qty = parse_float(self.qty_var.get(), "Quantity")
        cost = parse_float(self.cost_var.get(), "Cost per gram")
        return (
            name, self.type_var.get(), self.origin_var.get().strip(), qty, cost,
            self.notes_var.get().strip(), self.photo_var.get(),
        )

    def add(self):
        try:
            name, type_, origin, qty, cost, notes, photo = self._read_form()
        except ValueError as e:
            messagebox.showerror("Invalid input", str(e))
            return
        self.db.add_tobacco(name, type_, origin, qty, cost, notes, photo)
        self.clear_form()
        self.refresh()

    def update(self):
        if self.selected_id is None:
            messagebox.showinfo("No selection", "Select a tobacco leaf in the table first.")
            return
        try:
            name, type_, origin, qty, cost, notes, photo = self._read_form()
        except ValueError as e:
            messagebox.showerror("Invalid input", str(e))
            return
        self.db.update_tobacco(self.selected_id, name, type_, origin, qty, cost, notes, photo)
        self.refresh()

    def delete(self):
        if self.selected_id is None:
            messagebox.showinfo("No selection", "Select a tobacco leaf in the table first.")
            return
        if not messagebox.askyesno("Confirm delete", "Delete this tobacco leaf? Any blend components using it will also be removed."):
            return
        self.db.delete_tobacco(self.selected_id)
        self.clear_form()
        self.refresh()

    def refresh(self):
        self.tree.delete(*self.tree.get_children())
        for rec in self.db.list_tobacco():
            self.tree.insert(
                "", "end", iid=str(rec["id"]),
                values=(
                    rec["name"], rec["type"], rec["origin"],
                    "{:.2f}".format(rec["quantity_g"]),
                    "{:.4f}".format(rec["cost_per_g"]),
                    rec["notes"],
                ),
            )
        if self.on_change:
            self.on_change()


# ---------------------------------------------------------------------------
# Blend Builder tab
# ---------------------------------------------------------------------------
class BlendTab(ttk.Frame):
    def __init__(self, master, db, on_change=None):
        super().__init__(master, padding=8)
        self.db = db
        self.on_change = on_change
        self.current_blend_id = None
        self._build()
        self.refresh_blend_list()

    def _build(self):
        top = ttk.Frame(self)
        top.pack(fill="x")
        ttk.Label(top, text="Blend:").pack(side="left")
        self.blend_var = tk.StringVar()
        self.blend_combo = ttk.Combobox(top, textvariable=self.blend_var, state="readonly")
        self.blend_combo.pack(side="left", fill="x", expand=True, padx=6)
        self.blend_combo.bind("<<ComboboxSelected>>", self._on_blend_selected)

        ttk.Button(top, text="New", command=self.new_blend).pack(side="left", padx=2)
        ttk.Button(top, text="Delete", command=self.delete_blend).pack(side="left", padx=2)

        notes_frame = ttk.Frame(self)
        notes_frame.pack(fill="x", pady=6)
        ttk.Label(notes_frame, text="Notes:").pack(side="left")
        self.notes_var = tk.StringVar()
        notes_entry = ttk.Entry(notes_frame, textvariable=self.notes_var)
        notes_entry.pack(side="left", fill="x", expand=True, padx=6)
        ttk.Button(notes_frame, text="Save Notes", command=self.save_notes).pack(side="left")

        comp_frame = ttk.LabelFrame(self, text="Components (any mix of wrapper / binder / filler)", padding=8)
        comp_frame.pack(fill="both", expand=True, pady=(6, 0))

        columns = ("role", "tobacco", "grams")
        self.comp_tree = ttk.Treeview(comp_frame, columns=columns, show="headings", height=6)
        self.comp_tree.heading("role", text="Role")
        self.comp_tree.heading("tobacco", text="Tobacco")
        self.comp_tree.heading("grams", text="g / cigar")
        self.comp_tree.column("role", width=70)
        self.comp_tree.column("tobacco", width=140)
        self.comp_tree.column("grams", width=70, anchor="e")
        self.comp_tree.pack(fill="both", expand=True)

        add_frame = ttk.Frame(comp_frame)
        add_frame.pack(fill="x", pady=6)

        self.role_var = tk.StringVar(value=ROLES[0])
        self.role_combo = ttk.Combobox(add_frame, textvariable=self.role_var, values=ROLES, state="readonly", width=8)
        self.role_combo.grid(row=0, column=0, padx=2, pady=2)
        self.role_combo.bind("<<ComboboxSelected>>", lambda e: self._refresh_tobacco_choices())

        self.tobacco_var = tk.StringVar()
        self.tobacco_combo = ttk.Combobox(add_frame, textvariable=self.tobacco_var, state="readonly", width=16)
        self.tobacco_combo.grid(row=0, column=1, padx=2, pady=2)

        self.grams_var = tk.StringVar(value="1.0")
        ttk.Entry(add_frame, textvariable=self.grams_var, width=8).grid(row=0, column=2, padx=2, pady=2)

        ttk.Button(add_frame, text="Add Component", command=self.add_component).grid(row=0, column=3, padx=4, pady=2)
        ttk.Button(comp_frame, text="Remove Selected Component", command=self.remove_component).pack(fill="x", pady=(4, 0))

        self._tobacco_by_label = {}

    def _refresh_tobacco_choices(self):
        role = self.role_var.get()
        records = self.db.list_tobacco(type_filter=role)
        self._tobacco_by_label = {
            "{} ({:.1f}g on hand)".format(r["name"], r["quantity_g"]): r["id"] for r in records
        }
        labels = list(self._tobacco_by_label.keys())
        self.tobacco_combo["values"] = labels
        self.tobacco_var.set(labels[0] if labels else "")

    def refresh_blend_list(self):
        blends = self.db.list_blends()
        self._blend_by_label = {b["name"]: b["id"] for b in blends}
        self.blend_combo["values"] = list(self._blend_by_label.keys())
        if self.current_blend_id is not None and any(b["id"] == self.current_blend_id for b in blends):
            for name, bid in self._blend_by_label.items():
                if bid == self.current_blend_id:
                    self.blend_var.set(name)
                    break
        elif blends:
            self.blend_var.set(blends[0]["name"])
            self.current_blend_id = blends[0]["id"]
        else:
            self.blend_var.set("")
            self.current_blend_id = None
        self._refresh_tobacco_choices()
        self.load_blend()

    def _on_blend_selected(self, _event=None):
        name = self.blend_var.get()
        self.current_blend_id = self._blend_by_label.get(name)
        self.load_blend()

    def new_blend(self):
        win = tk.Toplevel(self)
        win.title("New Blend")
        ttk.Label(win, text="Blend name:").pack(padx=10, pady=(10, 0))
        name_var = tk.StringVar()
        entry = ttk.Entry(win, textvariable=name_var)
        entry.pack(padx=10, pady=6, fill="x")
        entry.focus()

        def create():
            name = name_var.get().strip()
            if not name:
                messagebox.showerror("Invalid input", "Blend name is required", parent=win)
                return
            try:
                new_id = self.db.add_blend(name)
            except sqlite3.IntegrityError:
                messagebox.showerror("Duplicate", "A blend with that name already exists", parent=win)
                return
            self.current_blend_id = new_id
            win.destroy()
            self.refresh_blend_list()
            if self.on_change:
                self.on_change()

        ttk.Button(win, text="Create", command=create).pack(pady=(0, 10))

    def delete_blend(self):
        if self.current_blend_id is None:
            return
        if not messagebox.askyesno("Confirm delete", "Delete this blend and all of its components?"):
            return
        self.db.delete_blend(self.current_blend_id)
        self.current_blend_id = None
        self.refresh_blend_list()
        if self.on_change:
            self.on_change()

    def save_notes(self):
        if self.current_blend_id is None:
            messagebox.showinfo("No blend", "Create or select a blend first.")
            return
        blend = self.db.get_blend(self.current_blend_id)
        self.db.update_blend(self.current_blend_id, blend["name"], self.notes_var.get().strip())

    def load_blend(self):
        self.comp_tree.delete(*self.comp_tree.get_children())
        if self.current_blend_id is None:
            self.notes_var.set("")
            return
        blend = self.db.get_blend(self.current_blend_id)
        self.notes_var.set(blend["notes"] if blend else "")
        for comp in self.db.list_components(self.current_blend_id):
            self.comp_tree.insert(
                "", "end", iid=str(comp["id"]),
                values=(comp["role"], comp["tobacco_name"], "{:.3f}".format(comp["grams_per_cigar"])),
            )

    def add_component(self):
        if self.current_blend_id is None:
            messagebox.showinfo("No blend", "Create or select a blend first.")
            return
        label = self.tobacco_var.get()
        tobacco_id = self._tobacco_by_label.get(label)
        if tobacco_id is None:
            messagebox.showinfo("No tobacco", "Add a tobacco leaf of this type on the Inventory tab first.")
            return
        try:
            grams = parse_float(self.grams_var.get(), "Grams per cigar")
        except ValueError as e:
            messagebox.showerror("Invalid input", str(e))
            return
        if grams <= 0:
            messagebox.showerror("Invalid input", "Grams per cigar must be greater than zero")
            return
        self.db.add_component(self.current_blend_id, tobacco_id, self.role_var.get(), grams)
        self.load_blend()
        if self.on_change:
            self.on_change()

    def remove_component(self):
        sel = self.comp_tree.selection()
        if not sel:
            messagebox.showinfo("No selection", "Select a component to remove.")
            return
        self.db.delete_component(int(sel[0]))
        self.load_blend()
        if self.on_change:
            self.on_change()

    def refresh(self):
        self.refresh_blend_list()


# ---------------------------------------------------------------------------
# Batch Estimator tab
# ---------------------------------------------------------------------------
class EstimatorTab(ttk.Frame):
    def __init__(self, master, db):
        super().__init__(master, padding=8)
        self.db = db
        self._build()
        self.refresh_blend_list()

    def _build(self):
        top = ttk.Frame(self)
        top.pack(fill="x")
        ttk.Label(top, text="Blend:").pack(side="left")
        self.blend_var = tk.StringVar()
        self.blend_combo = ttk.Combobox(top, textvariable=self.blend_var, state="readonly")
        self.blend_combo.pack(side="left", fill="x", expand=True, padx=6)

        ttk.Label(top, text="# Cigars:").pack(side="left")
        self.count_var = tk.StringVar(value="100")
        ttk.Entry(top, textvariable=self.count_var, width=8).pack(side="left", padx=4)

        ttk.Button(self, text="Calculate Needs", command=self.calculate).pack(fill="x", pady=6)

        columns = ("role", "tobacco", "per_cigar", "needed", "in_stock", "balance")
        headers = {
            "role": "Role", "tobacco": "Tobacco", "per_cigar": "g/cigar",
            "needed": "Needed (g)", "in_stock": "In Stock (g)", "balance": "Balance (g)",
        }
        self.tree = ttk.Treeview(self, columns=columns, show="headings", height=8)
        for col in columns:
            self.tree.heading(col, text=headers[col])
            self.tree.column(col, width=85, anchor="e" if col != "role" and col != "tobacco" else "w")
        self.tree.tag_configure("short", background="#f8d7da")
        self.tree.tag_configure("ok", background="#d4edda")
        self.tree.pack(fill="both", expand=True, pady=(0, 6))

        self.summary_var = tk.StringVar(value="")
        ttk.Label(self, textvariable=self.summary_var, justify="left", wraplength=380).pack(fill="x")

        ttk.Button(self, text="Deduct Needed Amounts From Inventory", command=self.deduct).pack(fill="x", pady=(8, 0))

        self._last_results = []

    def refresh_blend_list(self):
        blends = self.db.list_blends()
        self._blend_by_label = {b["name"]: b["id"] for b in blends}
        self.blend_combo["values"] = list(self._blend_by_label.keys())
        if blends and not self.blend_var.get():
            self.blend_var.set(blends[0]["name"])

    def calculate(self):
        blend_id = self._blend_by_label.get(self.blend_var.get())
        if blend_id is None:
            messagebox.showinfo("No blend", "Select a blend first (build one on the Blend Builder tab).")
            return
        try:
            count = float(self.count_var.get())
        except ValueError:
            messagebox.showerror("Invalid input", "# Cigars must be a number")
            return
        if count <= 0:
            messagebox.showerror("Invalid input", "# Cigars must be greater than zero")
            return

        components = self.db.list_components(blend_id)
        self.tree.delete(*self.tree.get_children())
        self._last_results = []
        total_cost = 0.0
        any_short = False

        for comp in components:
            needed = comp["grams_per_cigar"] * count
            in_stock = comp["quantity_g"]
            balance = in_stock - needed
            tag = "short" if balance < 0 else "ok"
            if balance < 0:
                any_short = True
            total_cost += needed * comp["cost_per_g"]
            self.tree.insert(
                "", "end", iid=str(comp["id"]),
                values=(
                    comp["role"], comp["tobacco_name"],
                    "{:.3f}".format(comp["grams_per_cigar"]),
                    "{:.2f}".format(needed),
                    "{:.2f}".format(in_stock),
                    "{:.2f}".format(balance),
                ),
                tags=(tag,),
            )
            self._last_results.append((comp["tobacco_id"], comp["tobacco_name"], needed, in_stock))

        if not components:
            self.summary_var.set("This blend has no components yet. Add wrapper, binder, or filler leaves on the Blend Builder tab.")
            return

        msg = "Estimated total tobacco cost for {:g} cigars: ${:.2f}".format(count, total_cost)
        if any_short:
            msg += "\nWarning: highlighted rows do not have enough stock on hand."
        self.summary_var.set(msg)

    def deduct(self):
        if not self._last_results:
            messagebox.showinfo("Nothing to deduct", "Run 'Calculate Needs' first.")
            return
        shortfalls = [name for (_id, name, needed, in_stock) in self._last_results if needed > in_stock]
        if shortfalls:
            proceed = messagebox.askyesno(
                "Insufficient stock",
                "These leaves don't have enough stock:\n{}\n\nDeduct anyway (inventory will go negative)?".format(
                    ", ".join(shortfalls)
                ),
            )
            if not proceed:
                return
        for tobacco_id, _name, needed, _in_stock in self._last_results:
            self.db.adjust_stock(tobacco_id, -needed)
        messagebox.showinfo("Done", "Inventory updated for this batch.")
        self._last_results = []


# ---------------------------------------------------------------------------
# Main application
# ---------------------------------------------------------------------------
class CigarInventoryApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Cigar Tobacco Inventory")
        self.geometry("420x700")

        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(".", font=("Helvetica", 11))
        style.configure("Treeview", rowheight=26, font=("Helvetica", 10))
        style.configure("Treeview.Heading", font=("Helvetica", 10, "bold"))
        style.configure("TButton", padding=6)

        self.db = Database(DB_PATH)

        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True)

        self.estimator_tab = EstimatorTab(notebook, self.db)
        self.blend_tab = BlendTab(notebook, self.db, on_change=self._on_data_changed)
        self.inventory_tab = InventoryTab(notebook, self.db, on_change=self._on_data_changed)

        notebook.add(self.inventory_tab, text="Inventory")
        notebook.add(self.blend_tab, text="Blends")
        notebook.add(self.estimator_tab, text="Batch Estimate")

    def _on_data_changed(self):
        self.blend_tab.refresh_blend_list()
        self.estimator_tab.refresh_blend_list()


def main():
    app = CigarInventoryApp()
    app.mainloop()


if __name__ == "__main__":
    main()
