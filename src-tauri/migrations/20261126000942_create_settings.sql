-- The user's settings, one row. A NULL column means the user never chose a value,
-- so the frontend applies its own default. The checks hold whatever the UI does;
-- UI rules (panel width limits, which shortcuts are allowed) stay in the frontend.
CREATE TABLE settings (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    theme         TEXT    CHECK (theme IN ('light', 'dark', 'auto')),
    language      TEXT    CHECK (trim(language) <> ''),
    font_family   TEXT    CHECK (trim(font_family) <> ''),
    sidebar_open  INTEGER CHECK (sidebar_open IN (0, 1)),
    sidebar_width INTEGER CHECK (sidebar_width > 0)
) STRICT;

INSERT INTO settings (id) VALUES (1);

-- Shortcuts the user changed, by command id. Commands not listed keep their default.
CREATE TABLE keybinding_overrides (
    command TEXT NOT NULL PRIMARY KEY,
    binding TEXT NOT NULL UNIQUE
) STRICT;
